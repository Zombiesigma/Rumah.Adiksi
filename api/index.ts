import express, { Request, Response } from 'express';
import crypto from 'crypto';
import ImageKit from 'imagekit';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "rumah-adiksi",
  appId: "1:105934868931:web:d3e78fe3d17287bb3aad76",
  apiKey: "AIzaSyC1kLPJEQK1d4DKkGI80d1fjbqCJgbxvss",
  authDomain: "rumah-adiksi.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "rumah-adiksi.firebasestorage.app",
  messagingSenderId: "105934868931",
  measurementId: "G-QLMCVDC4H7"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_MEe5oaZyE+U9OClfeDX6JU/n1kw=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_cBSFU5An2Sb/UUwgmlzXmx4cipk=",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/xyfyscipf"
});

// Helper to process payment success
async function processPaymentSuccessAtomic(orderId: string) {
  const orderRef = doc(db, 'orders', orderId);
  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      return;
    }
    const orderData = orderSnap.data();
    if (orderData.status === 'paid') {
      return;
    }
    transaction.update(orderRef, { 
      status: 'paid',
      updatedAt: new Date().toISOString()
    });

    const items = orderData.items || [];
    for (const item of items) {
      if (item.itemType === 'shop') {
        const productRef = doc(db, 'shopItems', item.itemId);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const currentStock = productData.stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          transaction.update(productRef, { stock: newStock });
        }
      } else if (item.itemType === 'gallery') {
        const artworkRef = doc(db, 'artworks', item.itemId);
        transaction.update(artworkRef, { isSold: true });
      }
    }
  });
}

// 1. ImageKit Secure Authentication Endpoint
app.get('/api/imagekit-auth', (req: Request, res: Response) => {
  try {
    const authenticationParameters = imageKit.getAuthenticationParameters();
    res.status(200).json(authenticationParameters);
  } catch (err: any) {
    console.error('[ImageKit Auth] Failed:', err);
    res.status(500).json({ error: 'Could not authenticate' });
  }
});

// 2. Midtrans Checkout Endpoint
app.post('/api/midtrans/checkout', async (req: Request, res: Response) => {
  try {
    const { orderId, amount, customerDetails, items, userId } = req.body;

    if (!orderId || !amount || !customerDetails || !items) {
      return res.status(400).json({ error: 'Missing required checkout details.' });
    }

    await setDoc(doc(db, 'orders', orderId), {
      id: orderId,
      amount,
      customerDetails,
      items,
      userId: userId || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    let serverKey = process.env.MIDTRANS_SERVER_KEY;
    let isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'payment'));
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        if (settingsData.midtransServerKey) serverKey = settingsData.midtransServerKey;
        if (settingsData.midtransIsProduction !== undefined) isProduction = settingsData.midtransIsProduction === true;
      }
    } catch (dbErr) {
      console.warn('Could not load custom Midtrans settings:', dbErr);
    }

    if (!serverKey) {
      return res.status(500).json({ error: 'Sistem pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY tidak ditemukan).' });
    }

    const base64Key = Buffer.from(serverKey + ':').toString('base64');
    const midtransUrl = isProduction 
        ? 'https://app.midtrans.com/snap/v1/transactions' 
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const response = await fetch(midtransUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${base64Key}`
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: amount
          },
          credit_card: {
            secure: true
          },
          customer_details: {
            first_name: customerDetails.name,
            email: customerDetails.email,
            phone: customerDetails.phone
          },
          item_details: items.map((item: any) => ({
            id: item.itemId || item.id,
            price: item.price,
            quantity: item.quantity,
            name: item.name.length > 50 ? item.name.slice(0, 47) + '...' : item.name
          }))
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_messages?.[0] || 'Midtrans error occurred.');
    }

    await setDoc(doc(db, 'orders', orderId), { snapToken: data.token }, { merge: true });

    res.json({ token: data.token, orderId });
  } catch (err: any) {
    console.error('Midtrans Checkout Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 3. Midtrans Checking Status
app.get('/api/midtrans/status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    let serverKey = process.env.MIDTRANS_SERVER_KEY;
    let isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'payment'));
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        if (settingsData.midtransServerKey) serverKey = settingsData.midtransServerKey;
        if (settingsData.midtransIsProduction !== undefined) isProduction = settingsData.midtransIsProduction === true;
      }
    } catch (dbErr) {
      console.warn('Could not load custom Midtrans settings:', dbErr);
    }

    if (!serverKey) {
      return res.status(500).json({ error: 'Sistem pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY tidak ditemukan).' });
    }

    const base64Key = Buffer.from(serverKey + ':').toString('base64');
    const url = isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Key}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.status_message || 'Gagal memeriksa status ke Midtrans.' });
    }

    const { transaction_status, fraud_status } = data;
    const isSuccess = transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept');

    if (isSuccess) {
      await processPaymentSuccessAtomic(orderId);
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'failed',
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ transactionStatus: transaction_status, status: 'ok', detail: data });
  } catch (err: any) {
    console.error('Status Check Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 4. Midtrans Webhook Callback
app.post('/api/midtrans/callback', async (req: Request, res: Response) => {
  try {
    const { order_id, transaction_status, fraud_status, status_code, gross_amount, signature_key } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is missing.' });
    }

    let serverKey = process.env.MIDTRANS_SERVER_KEY;
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'payment'));
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        if (settingsData.midtransServerKey) serverKey = settingsData.midtransServerKey;
      }
    } catch (dbErr) {
      console.warn('Could not load serverKey:', dbErr);
    }

    if (!serverKey) {
      return res.status(500).json({ error: 'Server Key not configured for validation.' });
    }

    if (signature_key) {
      const calculatedSignature = crypto.createHash('sha512').update(order_id + status_code + gross_amount + serverKey).digest('hex');
      if (calculatedSignature !== signature_key) {
        return res.status(400).json({ error: 'Invalid signature key' });
      }
    }

    const isSuccess = transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept');

    if (isSuccess) {
      await processPaymentSuccessAtomic(order_id);
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      await updateDoc(doc(db, 'orders', order_id), { status: 'failed', updatedAt: new Date().toISOString() });
    }

    res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    console.error('Midtrans Callback Error:', err);
    res.status(200).json({ error: err.message });
  }
});

export default app;
