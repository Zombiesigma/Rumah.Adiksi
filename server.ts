import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import express from 'express';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './src/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import ImageKit from 'imagekit';

// Initialize ImageKit with secure environment variables or correct project fallbacks
const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_MEe5oaZyE+U9OClfeDX6JU/n1kw=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_cBSFU5An2Sb/UUwgmlzXmx4cipk=",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/xyfyscipf"
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const PORT = 3000;

  // Bootstrap payment settings
  try {
    const pmDocRef = doc(db, 'settings', 'payment');
    const pmDocSnap = await getDoc(pmDocRef);
    if (!pmDocSnap.exists()) {
      await setDoc(pmDocRef, {
        bankAccountNumber: '1234567890',
        bankName: 'Bank Mandiri',
        beneficiaryName: 'Rumah Adiksi',
        midtransClientKey: 'Mid-client-RZ7OSPkvCWfZiqbB',
        midtransServerKey: 'Mid-server-KtgffMtgdopZOOJg9CcFIpAb',
        midtransIsProduction: true
      });
      console.log('[Firestore] Prefilled payment settings with Midtrans Production keys.');
    } else {
      const data = pmDocSnap.data();
      if (data.midtransClientKey === 'SB-Mid-client-pXsz4fOPr4H24a2U' || !data.midtransClientKey) {
        await setDoc(pmDocRef, {
          ...data,
          midtransClientKey: 'Mid-client-RZ7OSPkvCWfZiqbB',
          midtransServerKey: 'Mid-server-KtgffMtgdopZOOJg9CcFIpAb',
          midtransIsProduction: true
        }, { merge: true });
        console.log('[Firestore] Upgraded Midtrans Sandbox keys to the requested Production credentials.');
      }
    }
  } catch (err) {
    console.warn('[Firestore] Skipped payment settings bootstrapping:', err);
  }

  // Helper to process payment success
  async function processPaymentSuccessAtomic(orderId: string) {
    const orderRef = doc(db, 'orders', orderId);
    
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`Order ${orderId} does not exist in database.`);
      }

      const orderData = orderSnap.data();
      if (orderData.status === 'paid') {
        console.log(`[Transaction] Order ${orderId} is already paid. Skipping.`);
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
            console.log(`[Transaction] Updated shop item ${item.itemId} stock: ${currentStock} -> ${newStock}`);
          }
        } else if (item.itemType === 'gallery') {
          const artworkRef = doc(db, 'artworks', item.itemId);
          transaction.update(artworkRef, { isSold: true });
          console.log(`[Transaction] Marked artwork ${item.itemId} as sold.`);
        }
      }
    });
  }

  // --- NEW: ImageKit Secure Authentication Endpoint ---
  app.get('/api/imagekit-auth', (req, res) => {
    try {
      const authenticationParameters = imageKit.getAuthenticationParameters();
      console.log('[ImageKit Auth] Generated authentication parameters for a client request.');
      res.status(200).json(authenticationParameters);
    } catch (err: any) {
      console.error('[ImageKit Auth] Failed to generate authentication parameters:', err);
      res.status(500).json({ error: 'Could not authenticate image upload request.' });
    }
  });

  // Helper to generate secure JWT for Stream Video & Calls
  function signStreamToken(userId: string, apiSecret: string) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    const iat = Math.floor(Date.now() / 1000) - 60;
    const exp = iat + 86400; // 24 hours
    const payload = {
      user_id: userId,
      sub: `user/${userId}`,
      apiKey: process.env.STREAM_API_KEY || '65ztxpn9uj7y',
      iat: iat,
      exp: exp
    };

    const base64UrlEncode = (str: string) => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signatureInput}.${signature}`;
  }

  // --- NEW: GetStream Audio & Video Call Authentication Token Endpoint ---
  app.get('/api/stream/token', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid parameter: userId' });
      }

      const streamApiKey = process.env.STREAM_API_KEY || '65ztxpn9uj7y';
      const streamSecret = process.env.STREAM_SECRET || '8facrs8enh685u7xqktghzyyy52u9vhcs7s7x2k2zyfbtxnevup6nhv28mra5b7w';

      const token = signStreamToken(userId, streamSecret);
      console.log(`[Stream Auth] Generated call authentication token for user: ${userId}`);
      res.status(200).json({ token, apiKey: streamApiKey });
    } catch (err: any) {
      console.error('[Stream Auth] Failed to generate token:', err);
      res.status(500).json({ error: 'Could not generate call token.' });
    }
  });


  // --- MIDTRANS PAYMENT GATEWAY ENDPOINTS ---
  
  app.post('/api/midtrans/checkout', async (req, res) => {
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

      const midtransPayload = {
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
      };

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
        console.warn('Could not load custom Midtrans settings from Firestore, using environment defaults:', dbErr);
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
          body: JSON.stringify(midtransPayload)
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

  app.get('/api/midtrans/status/:orderId', async (req, res) => {
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
        console.warn('Could not load custom Midtrans settings from Firestore:', dbErr);
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

  app.post('/api/midtrans/callback', async (req, res) => {
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
        console.warn('Could not load serverKey for signature verification:', dbErr);
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
      res.status(200).json({ error: err.message }); // Still return 200 to Midtrans
    }
  });

  // --- Vite/Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
