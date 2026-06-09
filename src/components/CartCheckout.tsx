/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  ShoppingBag,
  Trash2,
  Lock,
  ChevronRight,
  User,
  Mail,
  MapPin,
  CheckCircle,
  FileText,
  CreditCard,
  QrCode,
  ArrowLeft,
  Coins,
  Printer
} from 'lucide-react';
import { CartItem } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

interface CartCheckoutProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  clearCart: () => void;
  addNotification: (msg: string) => void;
  setActiveTab: (tab: string) => void;
  currentUser: FirebaseUser | null;
}

type CheckoutStep = 'cart' | 'shipping' | 'payment_trigger' | 'receipt';
type PaymentMethod = 'qris' | 'bank_transfer' | 'e_wallet';

export default function CartCheckout({
  cart,
  setCart,
  clearCart,
  addNotification,
  setActiveTab,
  currentUser
}: CartCheckoutProps) {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');

  // Customer Contact State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerTel, setCustomerTel] = useState(() => {
    try {
      return localStorage.getItem('delivery_phone') || '';
    } catch (e) {
      return '';
    }
  });
  const [customerAddress, setCustomerAddress] = useState(() => {
    try {
      return localStorage.getItem('delivery_address') || '';
    } catch (e) {
      return '';
    }
  });

  // Persist delivery contact details to localStorage
  useEffect(() => {
    try {
      if (customerAddress) {
        localStorage.setItem('delivery_address', customerAddress);
      }
    } catch (e) {
      console.warn('Failed to save delivery_address to localStorage', e);
    }
  }, [customerAddress]);

  useEffect(() => {
    try {
      if (customerTel) {
        localStorage.setItem('delivery_phone', customerTel);
      }
    } catch (e) {
      console.warn('Failed to save delivery_phone to localStorage', e);
    }
  }, [customerTel]);
  
  const [paymentSettings, setPaymentSettings] = useState<{ bankAccountNumber?: string; bankName?: string; beneficiaryName?: string; } | null>(null);

  // Payment Verification Processing states
  const [isVerifying, setIsVerifying] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [remoteOrderStatus, setRemoteOrderStatus] = useState<string>('pending');

  // Midtrans Payment state variables
  const [snapToken, setSnapToken] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handlePrint = () => {
    window.print();
  };

  // Real-time Firestore order listener
  useEffect(() => {
    if (!orderId) return;

    console.log(`[Firestore] Listening to order status for ${orderId}`);
    const orderRef = doc(db, 'orders', orderId);
    const unsub = onSnapshot(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        const orderData = snapshot.data();
        console.log(`[Firestore] Order state updated:`, orderData);
        const currentStatus = orderData.status || 'pending';
        setRemoteOrderStatus(currentStatus);
        
        if (currentStatus === 'paid') {
          setStep('receipt');
        } else if (currentStatus === 'failed') {
          setCheckoutError('Pemesanan gagal, dibatalkan, atau kedaluwarsa.');
        }
      }
    });

    return () => unsub();
  }, [orderId]);

  const handleVerifyPaymentNow = async () => {
    if (!orderId) return;
    setIsVerifying(true);
    setCheckoutError('');
    try {
      const resp = await fetch(`/api/midtrans/status/${orderId}`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gagal menyinkronkan status dengan Midtrans.');
      }
      
      const status = data.transactionStatus;
      if (status === 'settlement' || status === 'capture') {
        addNotification(`Pembayaran pesanan #${orderId} sukses diverifikasi secara realtime!`);
        setStep('receipt');
      } else {
        addNotification(`Status transaksi: ${status || 'Menunggu Pembayaran'}`);
      }
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setCheckoutError(err.message || 'Gagal memverifikasi status pembayaran ke Midtrans.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const clientKey = (paymentSettings as any)?.midtransClientKey || 'Mid-client-RZ7OSPkvCWfZiqbB';
    const isProd = (paymentSettings as any)?.midtransIsProduction !== undefined 
      ? (paymentSettings as any)?.midtransIsProduction 
      : clientKey.startsWith('Mid-');
    
    const scriptUrl = isProd 
      ? 'https://app.midtrans.com/snap/snap.js' 
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    
    let script = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;
    if (!script) {
      // Remove stale midtrans scripts to transition cleanly if settings changed
      const existing = document.querySelectorAll('script[src*="midtrans.com/snap/"]');
      existing.forEach(el => el.remove());

      script = document.createElement('script');
      script.src = scriptUrl;
      script.setAttribute('data-client-key', clientKey);
      script.async = true;
      document.body.appendChild(script);
    }
  }, [paymentSettings]);

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.displayName || '');
      setCustomerEmail(currentUser.email || '');
    }
  }, [currentUser]);

  useEffect(() => {
      const unsub = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
          if (doc.exists()) {
              setPaymentSettings(doc.data() as any);
          }
      });
      return () => unsub();
  }, []);

  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = fulfillment === 'delivery' ? 18000 : 0;
  const total = subtotal + shippingFee;

  const handleQtyChange = (cartItemId: string, amount: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + amount;
            return { ...item, quantity: newQty < 1 ? 1 : newQty };
          }
          return item;
        })
    );
  };

  const handleRemove = (cartItemId: string, name: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
    addNotification(`"${name}" dihapus dari keranjang.`);
  };

  const handleProceedToShipping = () => {
    if (cart.length === 0) return;
    setStep('shipping');
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !customerTel) return;
    if (fulfillment === 'delivery' && !customerAddress) return;

    const generatedOrderId = `RA-${Math.floor(100000 + Date.now() % 1000000)}`;
    setOrderId(generatedOrderId);
    setIsGeneratingToken(true);
    setCheckoutError('');

    try {
      const resp = await fetch('/api/midtrans/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: generatedOrderId,
          amount: total,
          userId: currentUser?.uid || '',
          customerDetails: {
            name: customerName,
            email: customerEmail,
            phone: customerTel,
            address: customerAddress || 'Ambil di Kedai'
          },
          items: cart.map(item => ({
            itemId: item.itemId,
            price: item.price,
            quantity: item.quantity,
            name: item.name,
            itemType: item.itemType
          }))
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gagal membuat sesi pembayaran.');
      }

      setSnapToken(data.token);
      setStep('payment_trigger');
    } catch (err: any) {
      console.error('Midtrans Snap request failed:', err);
      setCheckoutError(err.message || 'Koneksi bermasalah dengan gateway Midtrans.');
      setStep('payment_trigger');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const triggerSnapPayment = () => {
    if (!snapToken) {
      setCheckoutError('Token pembayaran tidak valid. Silakan ulangi pemesanan.');
      return;
    }
    if (!(window as any).snap) {
      addNotification('Sistem pembayaran Midtrans sedang memuat. Harap tunggu beberapa saat.');
      return;
    }

    setIsVerifying(true);
    (window as any).snap.pay(snapToken, {
      onSuccess: async function (result: any) {
        console.log('pembayaran sukses, memverifikasi status dengan backend:', result);
        setIsVerifying(true);
        try {
          // Call server status API which will process transaction atomically at the server side
          const resp = await fetch(`/api/midtrans/status/${orderId}`);
          if (!resp.ok) {
            console.warn('Gagal memverifikasi status pembayaran dari server, mengandalkan listener...');
          }
        } catch (err) {
          console.error("Error verifying payment status on success:", err);
        } finally {
          setIsVerifying(false);
          setStep('receipt');
          addNotification(`Terima kasih! Pesanan #${orderId} telah sukses dibayar.`);
        }
      },
      onPending: function (result: any) {
        console.log('pembayaran tertunda:', result);
        addNotification(`Pesanan #${orderId} sedang diproses. Menunggu penyelesaian pembayaran.`);
        setIsVerifying(false);
        setStep('receipt');
      },
      onError: function (result: any) {
        console.error('pembayaran gagal:', result);
        setIsVerifying(false);
        setCheckoutError('Proses transaksi pembayaran dibatalkan atau gagal.');
        addNotification('Proses pembayaran dibatalkan.');
      },
      onClose: function () {
        setIsVerifying(false);
        console.warn('user menutup widget pembayaran');
      }
    });
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 py-4 text-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <h2 className="font-serif text-3xl font-extrabold text-brand-green tracking-tight">
          {step === 'receipt' ? 'Nota Transaksi' : 'Keranjang & Pembayaran'}
        </h2>
        {step !== 'receipt' && (
          <div className="flex gap-1.5 items-center text-[10px] font-mono text-gray-500">
            <span className={step === 'cart' ? 'text-brand-accent font-bold' : ''}>01 Keranjang</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className={step === 'shipping' ? 'text-brand-accent font-bold' : ''}>02 Pengiriman</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className={step === 'payment_trigger' ? 'text-brand-accent font-bold' : ''}>03 Pembayaran</span>
          </div>
        )}
      </div>

      {step === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0" />
                <div className="flex-grow min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                    <button onClick={() => handleRemove(item.id, item.name)} className="text-gray-400 hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[10px] font-mono text-brand-accent font-semibold">{item.itemType === 'gallery' ? 'KARYA EKSKLUSIF' : 'PRODUK KEDAI'}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-gray-700">{formatRupiah(item.price)}</span>
                    <div className="flex items-center gap-2.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <button onClick={() => handleQtyChange(item.id, -1)} className="w-5 h-5 rounded hover:bg-gray-200 font-mono text-xs text-gray-700">-</button>
                      <span className="text-sm font-mono font-bold text-gray-900 px-1">{item.quantity}</span>
                      <button onClick={() => handleQtyChange(item.id, 1)} className="w-5 h-5 rounded hover:bg-gray-200 font-mono text-xs text-gray-700">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-305">
                <ShoppingBag className="w-12 h-12 text-gray-450 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Keranjang belanja Anda kosong.</p>
                <div className="pt-4">
                  <button onClick={() => setActiveTab('shop')} className="px-4 py-2 bg-brand-accent hover:bg-brand-green text-white text-xs font-bold rounded-xl transition-colors">Kunjungi Toko</button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
            <h3 className="text-xs uppercase font-mono font-bold text-brand-green tracking-widest border-b border-gray-150 pb-2.5">Ringkasan Belanja</h3>
            <div className="space-y-2 text-xs font-mono text-gray-600">
              <div className="flex justify-between"><span>Subtotal:</span><span className="text-gray-900 font-bold">{formatRupiah(subtotal)}</span></div>
              <div className="flex justify-between"><span>Kurir:</span><span className="text-gray-900 font-bold">Komunitas</span></div>
            </div>
            <div className="border-t border-gray-150 pt-3 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">TOTAL:</span>
              <span className="font-bold text-brand-accent text-lg">{formatRupiah(total)}</span>
            </div>
            <button onClick={handleProceedToShipping} disabled={cart.length === 0} className="w-full py-2.5 bg-brand-accent hover:bg-brand-green disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-colors"> <Lock className="w-3.5 h-3.5" /> Lanjut ke Pengiriman</button>
          </div>
        </div>
      )}

      {step === 'shipping' && (
        <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-semibold font-mono text-brand-accent uppercase tracking-widest flex items-center gap-1.5"><User className="w-4 h-4" /> Informasi Kontak</h3>
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setFulfillment('pickup')} className={`p-3.5 rounded-xl border cursor-pointer h-20 transition-all ${fulfillment === 'pickup' ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent font-bold shadow-sm' : 'bg-transparent border-gray-200 text-gray-500 hover:text-gray-800'}`}> <div className="text-sm font-serif font-bold">Ambil di Kedai</div><div className="text-[10px] font-mono">Gratis</div></div>
              <div onClick={() => setFulfillment('delivery')} className={`p-3.5 rounded-xl border cursor-pointer h-20 transition-all ${fulfillment === 'delivery' ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent font-bold shadow-sm' : 'bg-transparent border-gray-200 text-gray-500 hover:text-gray-800'}`}> <div className="text-sm font-serif font-bold">Kirim ke Alamat</div><div className="text-[10px] font-mono">Rp 18.000</div></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-500 uppercase">Nama Lengkap</label>
                <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-450"><User className="w-3.5 h-3.5" /></span><input type="text" required placeholder="Nama Anda" value={customerName} onChange={(e) => setCustomerName(e.target.value)} readOnly={!!currentUser?.displayName} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-accent focus:bg-white" /></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-500 uppercase">Email</label>
                <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-450"><Mail className="w-3.5 h-3.5" /></span><input type="email" required placeholder="Email Anda" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} readOnly={!!currentUser?.email} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-accent focus:bg-white" /></div>
              </div>
            </div>
            <div className="space-y-1.5 text-left"><label className="text-[10px] font-mono text-gray-500 uppercase">Nomor Telepon</label><input type="tel" required placeholder="Nomor WhatsApp Anda" value={customerTel} onChange={(e) => setCustomerTel(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-accent focus:bg-white" /></div>
            {fulfillment === 'delivery' && (<div className="space-y-1.5 text-left"><label className="text-[10px] font-mono text-gray-500 uppercase">Alamat Pengiriman</label><div className="relative"><span className="absolute left-3 top-3 text-gray-450"><MapPin className="w-3.5 h-3.5" /></span><textarea rows={3} required placeholder="Alamat lengkap Anda" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-accent focus:bg-white resize-none" /></div></div>)}
            <div className="pt-2"><button type="button" onClick={() => setStep('cart')} className="text-xs font-mono text-gray-500 hover:text-brand-accent flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Kembali ke keranjang</button></div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm text-left">
            <h3 className="text-xs uppercase font-mono font-bold text-brand-green tracking-widest border-b border-gray-150 pb-2.5">Metode Pembayaran</h3>
            <div className="space-y-2">
              {[
                { id: 'qris', label: 'QRIS', desc: 'e-Wallets, m-Banking', icon: QrCode },
                { id: 'bank_transfer', label: 'Transfer Bank', desc: 'Virtual Account', icon: CreditCard },
                { id: 'e_wallet', label: 'GoPay/ShopeePay', desc: 'Dompet Digital', icon: Coins }
              ].map((m) => (<div key={m.id} onClick={() => setPaymentMethod(m.id as PaymentMethod)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent font-bold' : 'bg-transparent border-gray-200 text-gray-500 hover:text-gray-800'}`}><m.icon className="w-5 h-5 text-brand-accent" /><div><h5 className="text-sm font-semibold">{m.label}</h5><p className="text-[10px] text-gray-500">{m.desc}</p></div></div>))}
            </div>
            <div className="border-t border-gray-200 pt-3 font-mono text-xs text-gray-500 space-y-1.5 border-b pb-3 mb-1">
              <div className="flex justify-between"><span>Subtotal:</span><span className="text-gray-800">{formatRupiah(subtotal)}</span></div>
              <div className="flex justify-between"><span>Ongkir:</span><span className="text-gray-800">{formatRupiah(shippingFee)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-sm pt-1"><span>TOTAL:</span><span className="text-brand-accent">{formatRupiah(total)}</span></div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-brand-accent hover:bg-brand-green text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all">Bayar {formatRupiah(total)} <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </form>
      )}

      {step === 'payment_trigger' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 max-w-lg mx-auto text-center space-y-6 relative overflow-hidden shadow-sm">
          {isVerifying && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 rounded-2xl animate-fade-in">
              <div className="w-full max-w-xs space-y-5 text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 border-4 border-brand-accent/20 rounded-full animate-ping" />
                  <div className="absolute inset-0 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif text-base font-bold text-brand-green tracking-wide animate-pulse">Menghubungi Midtrans...</h4>
                  <p className="text-[11px] text-gray-600 font-mono leading-relaxed">
                    Sedang mensinkronisasikan dan memverifikasi status pembayaran pesanan <strong className="text-brand-accent">#{orderId}</strong> secara realtime.
                  </p>
                </div>
                <div className="w-full bg-gray-150 h-1 md:h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-brand-accent h-full" 
                    initial={{ width: '0%' }}
                    animate={{ width: ['0%', '35%', '70%', '98%'] }}
                    transition={{ duration: 4.5, ease: "easeOut", repeat: Infinity }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <span className="text-xs font-mono text-brand-accent uppercase tracking-widest px-2.5 py-0.5 bg-brand-accent/10 rounded-full border border-brand-accent/25 font-bold">Aman & Terenkripsi</span>
            <h3 className="font-serif text-xl font-bold text-gray-900">Selesaikan Pembayaran</h3>
            <p className="text-sm text-gray-600">Silakan selesaikan pembayaran untuk nomor pesanan <strong className="text-gray-900 font-mono">#{orderId}</strong>.</p>
          </div>

          <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-xs text-gray-500">Total Tagihan:</span>
              <span className="text-base font-bold text-brand-accent font-mono">{formatRupiah(total)}</span>
            </div>
            <div className="text-xs font-mono text-gray-650 space-y-1">
              <div className="flex justify-between"><span>Nama:</span><span className="text-gray-900 font-bold">{customerName}</span></div>
              <div className="flex justify-between"><span>No. Whatsapp:</span><span className="text-gray-900 font-bold">{customerTel}</span></div>
              <div className="flex justify-between"><span>Fasilitas:</span><span className="text-brand-accent font-extrabold">{fulfillment === 'pickup' ? 'Ambil di Kedai' : 'Kirim ke Alamat'}</span></div>
            </div>
          </div>

          {checkoutError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl">
              {checkoutError}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <button 
              onClick={triggerSnapPayment}
              disabled={isGeneratingToken || !snapToken || isVerifying}
              className="w-full py-3 bg-brand-accent hover:bg-brand-green disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-all hover:scale-[1.02]"
            >
              {isVerifying ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses Transaksi...</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Bayar Sekarang via Midtrans</>
              )}
            </button>

            <button 
              onClick={handleVerifyPaymentNow} 
              disabled={isVerifying || !orderId} 
              className="w-full py-2.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {isVerifying ? (
                <><div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> Memverifikasi...</>
              ) : (
                'Cek Status Pembayaran Realtime'
              )}
            </button>

            <button onClick={() => setStep('shipping')} className="text-xs font-mono text-gray-500 hover:text-brand-accent block mx-auto pt-2">
              Kembali ke Informasi Kontak
            </button>
          </div>
        </div>
      )}

      {step === 'receipt' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center no-print">
            <button onClick={() => { clearCart(); setStep('cart'); setActiveTab('beranda'); }} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 text-gray-700 text-sm font-semibold flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Kembali</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-brand-accent hover:bg-brand-green text-white text-sm font-bold rounded-xl flex items-center gap-1"><Printer className="w-4 h-4" /> Cetak</button>
          </div>
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xl relative space-y-6 overflow-hidden text-gray-800" id="printable-receipt">
            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-accent/5 rounded-full filter blur-2xl" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6 text-left">
              <div className="space-y-1"><span className="text-[10px] uppercase font-mono tracking-widest text-brand-accent font-bold">FAKTUR</span><h3 className="font-serif text-2xl font-black text-brand-green">RUMAH ADIKSI</h3><p className="text-xs text-gray-500 font-mono">Pelabuhan Ratu, Sukabumi</p></div>
              <div className="text-left sm:text-right">
                {remoteOrderStatus === 'paid' ? (
                  <div className="inline-flex px-3 py-1 bg-emerald-50 border border-emerald-300 rounded-full font-mono text-[10px] font-bold text-emerald-600 uppercase">
                    ✓ LUNAS
                  </div>
                ) : remoteOrderStatus === 'failed' ? (
                  <div className="inline-flex px-3 py-1 bg-rose-50 border border-rose-300 rounded-full font-mono text-[10px] font-bold text-rose-600 uppercase">
                    ✗ GAGAL
                  </div>
                ) : (
                  <div className="inline-flex px-3 py-1 bg-amber-50 border border-amber-300 rounded-full font-mono text-[10px] font-bold text-amber-600 uppercase animate-pulse">
                    ⌛ MENUNGGU
                  </div>
                )}
                <p className="text-sm font-mono text-gray-750 mt-1.5 font-bold">No: {orderId}</p>
                {remoteOrderStatus !== 'paid' && remoteOrderStatus !== 'failed' && (
                  <button 
                    onClick={handleVerifyPaymentNow}
                    disabled={isVerifying}
                    className="mt-2 block w-full px-2 py-1 bg-brand-accent/10 hover:bg-brand-accent hover:text-white text-[10px] font-mono font-bold rounded-lg transition cursor-pointer select-none border border-brand-accent/20 text-brand-accent"
                  >
                    {isVerifying ? 'Verifikasi...' : 'Cek Status Pembayaran'}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono border-b border-gray-100 pb-6 text-left">
              <div className="space-y-1"><span className="text-[10px] text-gray-500 uppercase font-bold">PEMESAN</span><p className="font-bold text-gray-900">{customerName}</p><p className="text-gray-655">{customerEmail}</p><p className="text-gray-655">{customerTel}</p></div>
              <div className="space-y-1"><span className="text-[10px] text-gray-500 uppercase font-bold">METODE</span><p className="font-bold text-brand-accent">{fulfillment === 'pickup' ? 'Ambil di Kedai' : 'Pengiriman'}</p><p className="text-gray-655 uppercase">{paymentMethod.replace('_', ' ')}</p>{fulfillment === 'delivery' && (<p className="text-gray-500 text-xs">{customerAddress}</p>)}</div>
            </div>
            <div className="space-y-3 text-left"><span className="text-[10px] font-mono text-gray-500 uppercase font-bold">ITEM</span><div className="space-y-2">{cart.map((item) => (<div key={item.id} className="flex justify-between items-center text-sm"><div className="space-y-0.5"><span className="font-semibold text-gray-900">{item.name}</span><span className="text-xs text-gray-505 font-mono">{item.quantity} x {formatRupiah(item.price)}</span></div><span className="font-mono font-bold text-gray-800">{formatRupiah(item.price * item.quantity)}</span></div>))}</div></div>
            <div className="border-t border-gray-100 pt-4 font-mono text-sm space-y-1 text-gray-505 text-left">
              <div className="flex justify-between"><span>Subtotal:</span><span className="text-gray-800 font-bold">{formatRupiah(subtotal)}</span></div>
              <div className="flex justify-between"><span>Ongkir:</span><span className="text-gray-800 font-bold">{formatRupiah(shippingFee)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100"><span className="text-base">TOTAL:</span><span className="text-brand-accent text-base">{formatRupiah(total)}</span></div>
            </div>
            <div className="text-center pt-3 border-t border-dashed border-gray-200"><p className="text-xs text-gray-500">"Terima kasih telah mendukung mimpi para pemuda Pelabuhan Ratu."</p><span className="text-[10px] uppercase font-mono tracking-widest text-brand-accent font-bold block mt-2">RUMAH ADIKSI KREATIF</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
