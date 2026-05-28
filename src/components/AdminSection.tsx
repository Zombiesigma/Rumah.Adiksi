import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Palette, 
  Coffee, 
  Plus, 
  Check, 
  Award, 
  ShoppingBag, 
  AlertCircle,
  Trash2,
  Edit2,
  TrendingUp,
  Smartphone,
  Bell,
  Settings
} from 'lucide-react';
import { db, cleanUndefined } from '../lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { showSuccessToast, showConfirmDialog, showErrorToast } from '../lib/alerts';
import { z } from 'zod';
import CloudUploader from './CloudUploader';

// Zod schemas for all admin forms
const eventFormSchema = z.object({
  title: z.string().min(1, 'Judul acara wajib diisi.'),
  date: z.string().min(1, 'Tanggal acara wajib diisi.'),
  time: z.string().optional(),
  location: z.string().min(1, 'Lokasi acara wajib diisi.'),
  description: z.string().min(1, 'Deskripsi acara wajib diisi.'),
  category: z.enum(['Pameran', 'Konser', 'Workshop', 'Bazaar']),
  bannerUrl: z.string().optional(),
});

const galleryFormSchema = z.object({
  title: z.string().min(1, 'Judul karya wajib diisi.'),
  artistName: z.string().min(1, 'Nama seniman wajib diisi.'),
  type: z.enum(['painting', 'music', 'photography', 'craft', 'digital']),
  price: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int({ message: 'Harga karya harus berupa angka bulat.' }).positive({ message: 'Harga karya harus berupa angka positif.' }).optional()
  ),
  description: z.string().min(1, 'Deskripsi karya wajib diisi.'),
  imageUrl: z.string().optional(),
});

const shopFormSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi.'),
  category: z.enum(['coffee', 'matcha', 'tea', 'merchandise']),
  price: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? NaN : Number(val)),
    z.number().int({ message: 'Harga harus berupa angka bulat.' }).positive({ message: 'Harga harus berupa angka positif.' })
  ),
  stock: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? NaN : Number(val)),
    z.number().int({ message: 'Stok harus berupa angka bulat.' }).positive({ message: 'Stok harus berupa angka positif.' })
  ),
  description: z.string().min(1, 'Deskripsi produk wajib diisi.'),
  imageUrl: z.string().optional(),
  journeyStory: z.string().optional(),
});

const paymentFormSchema = z.object({
  bankAccountNumber: z.string().min(1, 'Nomor rekening wajib diisi.').regex(/^\d+$/, 'Nomor rekening harus berupa angka bulat positif.'),
  bankName: z.string().min(1, 'Nama bank wajib diisi.'),
  beneficiaryName: z.string().min(1, 'Nama penerima wajib diisi.'),
  midtransClientKey: z.string().optional(),
  midtransServerKey: z.string().optional(),
  midtransIsProduction: z.boolean().optional(),
});

const alertFormSchema = z.object({
  message: z.string().min(1, 'Isi alert tidak boleh kosong.'),
  type: z.enum(['info', 'warning', 'promo', 'alert']),
  isActive: z.boolean(),
});


// Recharts imports for community growth analytics
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip} from 'recharts';

interface AdminSectionProps {
  addNotification: (message: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function AdminSection({ addNotification, setActiveTab }: AdminSectionProps) {
  const [adminMenu, setAdminMenu] = useState<'dashboard' | 'publish' | 'manage' | 'alerts' | 'settings'>('dashboard');
  const [activeFormTab, setActiveFormTab] = useState<'events' | 'gallery' | 'shop'>('events');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // States of all collections fetched in real-time
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [artworksList, setArtworksList] = useState<any[]>([]);
  const [shopItemsList, setShopItemsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'daily' | 'weekly'>('daily');

  // Payment Settings State
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [midtransClientKey, setMidtransClientKey] = useState('');
  const [midtransServerKey, setMidtransServerKey] = useState('');
  const [midtransIsProduction, setMidtransIsProduction] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => setEventsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubArtworks = onSnapshot(collection(db, 'artworks'), (snap) => setArtworksList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubShop = onSnapshot(collection(db, 'shopItems'), (snap) => setShopItemsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubAlerts = onSnapshot(collection(db, 'system_alerts'), (snap) => setAlertsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => setOrdersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    const fetchPaymentSettings = async () => {
        const docRef = doc(db, "settings", "payment");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setBankAccountNumber(data.bankAccountNumber || '');
            setBankName(data.bankName || '');
            setBeneficiaryName(data.beneficiaryName || '');
            setMidtransClientKey(data.midtransClientKey || '');
            setMidtransServerKey(data.midtransServerKey || '');
            setMidtransIsProduction(data.midtransIsProduction || false);
        }
    };
    fetchPaymentSettings();

    return () => { unsubEvents(); unsubArtworks(); unsubShop(); unsubUsers(); unsubAlerts(); unsubOrders(); };
  }, []);

    const handleSavePaymentSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setSuccessMsg(''); setErrorMsg('');
        try {
            const validationResult = paymentFormSchema.safeParse({
                bankAccountNumber,
                bankName,
                beneficiaryName,
                midtransClientKey,
                midtransServerKey,
                midtransIsProduction
            });
            if (!validationResult.success) {
                throw new Error(validationResult.error.issues[0]?.message || 'Validasi pembayaran gagal.');
            }
            await setDoc(doc(db, 'settings', 'payment'), {
                bankAccountNumber,
                bankName,
                beneficiaryName,
                midtransClientKey,
                midtransServerKey,
                midtransIsProduction
            });
            setSuccessMsg('Pengaturan pembayaran berhasil disimpan!');
            addNotification('Pengaturan pembayaran telah diperbarui.');
        } catch (err: any) {
            setErrorMsg(`Gagal menyimpan pengaturan: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

  // 1. Event/Berita Form States
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState<'Pameran' | 'Konser' | 'Workshop' | 'Bazaar'>('Pameran');
  const [eventBannerUrl, setEventBannerUrl] = useState('');

  // 2. Artwork (Karya) Form States
  const [artTitle, setArtTitle] = useState('');
  const [artArtistName, setArtArtistName] = useState('');
  const [artType, setArtType] = useState<'painting' | 'music' | 'photography' | 'craft' | 'digital'>('painting');
  const [artPrice, setArtPrice] = useState('');
  const [artDescription, setArtDescription] = useState('');
  const [artImageUrl, setArtImageUrl] = useState('');

  // 3. Shop Item Form States
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState<'coffee' | 'matcha' | 'tea' | 'merchandise'>('coffee');
  const [shopPrice, setShopPrice] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopImageUrl, setShopImageUrl] = useState('');
  const [shopStock, setShopStock] = useState('');
  const [shopJourneyStory, setShopJourneyStory] = useState('');

  // 4. Admin broadcast notification manager states
  const [alertText, setAlertText] = useState('');
  const [alertType, setAlertType] = useState<'info' | 'warning' | 'promo' | 'alert'>('info');
  const [alertActive, setAlertActive] = useState(true);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);

  const [artPriceError, setArtPriceError] = useState<string | null>(null);
  const [shopPriceError, setShopPriceError] = useState<string | null>(null);
  const [shopStockError, setShopStockError] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  useEffect(() => {
    if (artPrice === '') {
      setArtPriceError(null);
      return;
    }
    const result = galleryFormSchema.shape.price.safeParse(artPrice);
    if (!result.success) {
      setArtPriceError(result.error.issues[0]?.message);
    } else {
      setArtPriceError(null);
    }
  }, [artPrice]);

  useEffect(() => {
    const result = shopFormSchema.shape.price.safeParse(shopPrice);
    if (!result.success) {
      setShopPriceError(result.error.issues[0]?.message);
    } else {
      setShopPriceError(null);
    }
  }, [shopPrice]);

  useEffect(() => {
    const result = shopFormSchema.shape.stock.safeParse(shopStock);
    if (!result.success) {
      setShopStockError(result.error.issues[0]?.message);
    } else {
      setShopStockError(null);
    }
  }, [shopStock]);

  const clearForms = () => {
    setEditingItemId(null);
    setEventTitle(''); setEventDate(''); setEventTime(''); setEventLocation(''); setEventDescription(''); setEventBannerUrl('');
    setArtTitle(''); setArtArtistName(''); setArtPrice(''); setArtDescription(''); setArtImageUrl('');
    setShopName(''); setShopPrice(''); setShopDescription(''); setShopImageUrl(''); setShopStock(''); setShopJourneyStory('');
    setArtPriceError(null); setShopPriceError(null); setShopStockError(null);
  };

  const handleEditItem = (item: any, type: 'events' | 'gallery' | 'shop') => {
    clearForms(); setEditingItemId(item.id); setActiveFormTab(type); setAdminMenu('publish');
    if (type === 'events') { setEventTitle(item.title); setEventDate(item.date); setEventTime(item.time); setEventLocation(item.location); setEventDescription(item.description); setEventCategory(item.category); setEventBannerUrl(item.bannerUrl); }
    else if (type === 'gallery') { setArtTitle(item.title); setArtArtistName(item.artistName); setArtType(item.type); setArtPrice(String(item.price || '')); setArtDescription(item.description); setArtImageUrl(item.imageUrl); }
    else if (type === 'shop') { setShopName(item.name); setShopCategory(item.category); setShopPrice(String(item.price || '')); setShopDescription(item.description); setShopImageUrl(item.imageUrl); setShopStock(String(item.stock || '')); setShopJourneyStory(item.journeyStory); }
    setSuccessMsg(`Mengedit item ${item.id}.`);
  };

  const handleDeleteItem = async (id: string, collectionName: string) => {
    const confirmation = await showConfirmDialog('Hapus Item', `Yakin hapus item ${id}?`, 'Ya, hapus', 'Batal');
    if (!confirmation.isConfirmed) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, collectionName, id));
      setSuccessMsg(`Item ${id} dihapus.`);
      addNotification(`Item dari ${collectionName} dihapus.`);
      showSuccessToast('Item dihapus', `Item ${id} berhasil dihapus dari ${collectionName}.`);
    }
    catch (err: any) { setErrorMsg(`Gagal hapus: ${err.message}`); showErrorToast('Gagal menghapus item', err.message || 'Silakan coba lagi.'); }
    finally { setLoading(false); }
  };

  const createSubmitHandler = (type: 'events' | 'gallery' | 'shop') => async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setSuccessMsg(''); setErrorMsg('');
    const id = editingItemId || `${type.slice(0,2)}-${Date.now()}`;
    let payload: any, successText: string;

    const collectionMap: Record<'events' | 'gallery' | 'shop', string> = {
      events: 'events',
      gallery: 'artworks',
      shop: 'shopItems',
    };
    const collectionName = collectionMap[type];

    try {
        switch (type) {
            case 'events': {
                const result = eventFormSchema.safeParse({
                    title: eventTitle,
                    date: eventDate,
                    time: eventTime || undefined,
                    location: eventLocation,
                    description: eventDescription,
                    category: eventCategory,
                    bannerUrl: eventBannerUrl || undefined,
                });
                if (!result.success) {
                    throw new Error(result.error.issues[0]?.message || 'Validasi form acara gagal.');
                }
                payload = { id, ...result.data };
                successText = `Acara "${eventTitle}"`;
                break;
            }
            case 'gallery': {
                const result = galleryFormSchema.safeParse({
                    title: artTitle,
                    artistName: artArtistName,
                    type: artType,
                    price: artPrice !== '' ? artPrice : undefined,
                    description: artDescription,
                    imageUrl: artImageUrl || undefined,
                });
                if (!result.success) {
                    throw new Error(result.error.issues[0]?.message || 'Validasi form karya gagal.');
                }
                payload = { id, ...result.data, isSold: false, likes: 0, views: 0 };
                successText = `Karya "${artTitle}"`;
                break;
            }
            case 'shop': {
                const result = shopFormSchema.safeParse({
                    name: shopName,
                    category: shopCategory,
                    price: shopPrice,
                    stock: shopStock,
                    description: shopDescription,
                    imageUrl: shopImageUrl || undefined,
                    journeyStory: shopJourneyStory || undefined,
                });
                if (!result.success) {
                    throw new Error(result.error.issues[0]?.message || 'Validasi form produk gagal.');
                }
                payload = { id, ...result.data };
                successText = `Produk "${shopName}"`;
                break;
            }
        }

        await setDoc(doc(db, collectionName, id), cleanUndefined(payload));
        setSuccessMsg(`${successText} berhasil ${editingItemId ? 'diperbarui' : 'dibuat'}.`);
        addNotification(`${successText} ${editingItemId ? 'diperbarui' : 'dibuat'}.`);
        showSuccessToast(`${successText} berhasil`, `Item ${successText} telah ${editingItemId ? 'diperbarui' : 'dibuat'} secara sukses.`);
        clearForms();
    } catch (err: any) { setErrorMsg(`Gagal: ${err.message}`); }
    finally { setLoading(false); }
  };

  // Handlers for submission
  const handleAddEventSubmit = createSubmitHandler('events');
  const handleAddArtworkSubmit = createSubmitHandler('gallery');
  const handleAddShopSubmit = createSubmitHandler('shop');

  const handleAddAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setSuccessMsg(''); setErrorMsg('');
    const id = editingAlertId || `alert-${Date.now()}`;
    try {
        const result = alertFormSchema.safeParse({
            message: alertText,
            type: alertType,
            isActive: alertActive,
        });
        if (!result.success) {
            throw new Error(result.error.issues[0]?.message || 'Validasi alert gagal.');
        }
        await setDoc(doc(db, 'system_alerts', id), { id, ...result.data, createdAt: new Date().toISOString() });
        setSuccessMsg(`Alert berhasil ${editingAlertId ? 'diperbarui' : 'dibuat'}.`); addNotification('Alert sistem diperbarui.');
        setAlertText(''); setEditingAlertId(null);
    } catch (err: any) { setErrorMsg(`Gagal: ${err.message}`); } finally { setLoading(false); }
  };

  // Filter and compute total financials
  const paidOrders = ordersList.filter(o => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const pendingOrders = ordersList.filter(o => o.status === 'pending');
  const failedOrders = ordersList.filter(o => o.status === 'failed');

  // Daily Chart Data (Past 7 Days)
  const dailyChartData = React.useMemo(() => {
    const dailyData: { [key: string]: number } = {};
    const dateList: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isostring = d.toISOString().split('T')[0];
      dailyData[isostring] = 0;
      dateList.push(isostring);
    }

    paidOrders.forEach(order => {
      if (order.createdAt) {
        const dateKey = order.createdAt.split('T')[0];
        if (dailyData[dateKey] !== undefined) {
          dailyData[dateKey] += (Number(order.amount) || 0);
        }
      }
    });

    return dateList.map(dateKey => {
      const dateObj = new Date(dateKey);
      const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return {
        name: formattedDate,
        'Pendapatan': dailyData[dateKey],
      };
    });
  }, [ordersList]);

  // Weekly Chart Data (Past 4 Weeks)
  const weeklyChartData = React.useMemo(() => {
    const weeks: { [key: string]: number } = { 
      'Minggu ini': 0, 
      '1 Minggu Lalu': 0, 
      '2 Minggu Lalu': 0, 
      '3 Minggu Lalu': 0 
    };
    
    const now = new Date();
    
    paidOrders.forEach(order => {
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const diffMs = now.getTime() - orderDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 7) {
          weeks['Minggu ini'] += (Number(order.amount) || 0);
        } else if (diffDays <= 14) {
          weeks['1 Minggu Lalu'] += (Number(order.amount) || 0);
        } else if (diffDays <= 21) {
          weeks['2 Minggu Lalu'] += (Number(order.amount) || 0);
        } else if (diffDays <= 28) {
          weeks['3 Minggu Lalu'] += (Number(order.amount) || 0);
        }
      }
    });

    return [
      { name: '3 Minggu Lalu', 'Pendapatan': weeks['3 Minggu Lalu'] },
      { name: '2 Minggu Lalu', 'Pendapatan': weeks['2 Minggu Lalu'] },
      { name: '1 Minggu Lalu', 'Pendapatan': weeks['1 Minggu Lalu'] },
      { name: 'Minggu ini', 'Pendapatan': weeks['Minggu ini'] }
    ];
  }, [ordersList]);

  const activeChartData = dashboardTimeframe === 'daily' ? dailyChartData : weeklyChartData;

  const handleEditAlert = (alert: any) => { setEditingAlertId(alert.id); setAlertText(alert.message); setAlertType(alert.type); setAlertActive(alert.isActive); };
  const handleToggleAlertActive = async (alert: any) => { try { await setDoc(doc(db, 'system_alerts', alert.id), { ...alert, isActive: !alert.isActive }); } catch (e) {} };

  const formatRupiah = (val?: number) => val ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val) : 'Gratis';

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto relative text-white">
      <div className="border-b border-white/5 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 text-brand-gold font-mono text-xs font-bold uppercase tracking-widest bg-brand-gold/15 px-3 py-1 rounded-full w-max mb-2"><Award className="w-3.5 h-3.5" /><span>Admin Hub</span></div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white">Panel Administrasi</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/5">
            {[
                {id: 'dashboard', label: 'Dashboard', icon: TrendingUp},
                {id: 'publish', label: 'Terbitkan', icon: Plus},
                {id: 'manage', label: 'Kelola', icon: ShoppingBag},
                {id: 'alerts', label: 'Broadcast', icon: Bell},
                {id: 'settings', label: 'Pengaturan', icon: Settings}
            ].map(tab => (
                <button key={tab.id} onClick={() => { setAdminMenu(tab.id as any); setSuccessMsg(''); setErrorMsg(''); }} className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${adminMenu === tab.id ? 'bg-brand-gold text-brand-charcoal shadow-md' : 'text-gray-400 hover:text-white'}`}><tab.icon className="w-3.5 h-3.5" /><span>{tab.label}</span></button>
            ))}
        </div>
      </div>

      {successMsg && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-3"><Check className="w-5 h-5" /><span>{successMsg}</span></div>}
      {errorMsg && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-3"><AlertCircle className="w-5 h-5" /><span>{errorMsg}</span></div>}

      {adminMenu === 'dashboard' && (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-950/80 p-5 rounded-2xl border border-brand-gold/20 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-brand-gold uppercase tracking-wider">Pendapatan Realtime</span>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-serif font-black text-white">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue)}
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-1">✓ Terverifikasi Lunas</p>
              </div>
            </div>

            <div className="bg-zinc-950/80 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Transaksi Sukses</span>
              <div className="mt-2">
                <div className="text-3xl font-serif font-black text-white">{paidOrders.length}</div>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Dari {ordersList.length} pesanan masuk</p>
              </div>
            </div>

            <div className="bg-zinc-950/80 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider">Menunggu Pembayaran</span>
              <div className="mt-2">
                <div className="text-3xl font-serif font-black text-white">{pendingOrders.length}</div>
                <p className="text-[10px] text-gray-500 font-mono mt-1">
                  Tagihan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pendingOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0))}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950/80 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-wider">Transaksi Gagal</span>
              <div className="mt-2">
                <div className="text-3xl font-serif font-black text-white">{failedOrders.length}</div>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Dibatalkan / Kedaluwarsa</p>
              </div>
            </div>
          </div>

          {/* Recharts Revenue Trend Chart */}
          <div className="bg-zinc-950/60 p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl border border-brand-gold/25">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tren Pendapatan</h3>
                  <p className="text-xs text-gray-400 font-mono">Hasil penjualan via Midtrans Gateway</p>
                </div>
              </div>

              {/* Timeframe selector toggle */}
              <div className="flex bg-slate-950 rounded-xl border border-white/5 p-1">
                <button 
                  onClick={() => setDashboardTimeframe('daily')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${dashboardTimeframe === 'daily' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}
                >
                  Harian (7 Hari)
                </button>
                <button 
                  onClick={() => setDashboardTimeframe('weekly')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${dashboardTimeframe === 'weekly' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}
                >
                  Mingguan (4 Minggu)
                </button>
              </div>
            </div>

            {/* Area Chart visualization container */}
            <div className="h-64 sm:h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717a" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={9} 
                    fontFamily="monospace"
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `Rp ${val >= 1000000 ? (val / 1000000).toFixed(1) + 'jt' : val >= 1000 ? (val / 1000).toFixed(0) + 'rb' : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#09090b', 
                      borderColor: '#f59e0b', 
                      color: '#ffffff',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                    formatter={(value: any) => [
                      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value), 
                      'Pendapatan'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Pendapatan" 
                    stroke="#d97706" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Inventory Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase">Pengguna</span>
              <div className="text-2xl font-serif font-black text-brand-gold mt-1">{usersList.length}</div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase">Karya Seni</span>
              <div className="text-2xl font-serif font-black text-brand-gold mt-1">{artworksList.length}</div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase">Produk Atribut</span>
              <div className="text-2xl font-serif font-black text-brand-gold mt-1">{shopItemsList.length}</div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase">Fasilitas Acara</span>
              <div className="text-2xl font-serif font-black text-brand-gold mt-1">{eventsList.length}</div>
            </div>
          </div>
        </div>
      )}
      
    {adminMenu === 'settings' && (
        <form onSubmit={handleSavePaymentSettings} className="bg-brand-card border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 max-w-lg mx-auto">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-brand-charcoal"><Settings className="w-5 h-5" /></div>
                <div><h3 className="text-lg font-bold text-white">Pengaturan Pembayaran</h3><p className="text-sm text-gray-400">Atur detail rekening bank & integrasi Midtrans Gateway.</p></div>
            </div>
            
            <div className="space-y-4">
                <h4 className="text-sm font-mono font-bold text-brand-gold uppercase tracking-wider">1. Transfer Bank Manual</h4>
                <div className="space-y-1"><label className="text-xs font-mono font-bold text-gray-400">Nama Bank</label><input type="text" required placeholder="Contoh: Bank Mandiri" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" /></div>
                <div className="space-y-1"><label className="text-xs font-mono font-bold text-gray-400">Nomor Rekening</label><input type="text" required placeholder="Contoh: 1234567890" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" /></div>
                <div className="space-y-1"><label className="text-xs font-mono font-bold text-gray-400">Nama Penerima</label><input type="text" required placeholder="Contoh: John Doe" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" /></div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-sm font-mono font-bold text-brand-gold uppercase tracking-wider">2. Integrasi Midtrans</h4>
                <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-gray-400">Midtrans Client Key</label>
                    <input type="text" placeholder="Masukkan Client Key Midtrans Anda" value={midtransClientKey} onChange={(e) => setMidtransClientKey(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-gray-400">Midtrans Server Key</label>
                    <input type="password" placeholder="Masukkan Server Key Midtrans" value={midtransServerKey} onChange={(e) => setMidtransServerKey(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="midtransIsProduction" checked={midtransIsProduction} onChange={(e) => setMidtransIsProduction(e.target.checked)} className="w-4 h-4 rounded bg-black/40 border-white/10 text-brand-gold focus:ring-brand-gold" />
                    <label htmlFor="midtransIsProduction" className="text-sm text-gray-300 font-bold select-none cursor-pointer">Gunakan Mode Produksi (Production Mode)</label>
                </div>
                <p className="text-xs text-gray-500 italic">Biarkan kosong untuk otomatis memakai Sandbox key bawaan sistem.</p>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5"><button type="submit" disabled={loading} className="px-6 py-3 bg-brand-gold hover:bg-white text-brand-charcoal rounded-xl text-sm font-black transition-all">{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</button></div>
        </form>
    )}

      {adminMenu === 'publish' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-white/5">
              <div className="flex gap-2">
                  <button onClick={() => { setActiveFormTab('events'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeFormTab === 'events' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}>Acara</button>
                  <button onClick={() => { setActiveFormTab('gallery'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeFormTab === 'gallery' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}>Galeri</button>
                  <button onClick={() => { setActiveFormTab('shop'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeFormTab === 'shop' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}>Toko</button>
              </div>
              <button onClick={() => setShowMobilePreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 text-brand-gold border border-brand-gold/30 rounded-xl text-xs font-mono"><Smartphone className="w-3.5 h-3.5" /><span>Pratinjau</span></button>
          </div>

          {editingItemId && <div className="p-3.5 bg-indigo-500/15 border border-indigo-400/30 rounded-xl text-sm text-indigo-300 flex justify-between"><span>Mode Edit: <strong>{editingItemId}</strong></span><button onClick={clearForms} className="hover:underline">Batal</button></div>}

          {activeFormTab === 'events' && (
            <form onSubmit={handleAddEventSubmit} className="bg-brand-card border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-brand-charcoal"><Calendar className="w-5 h-5" /></div><div><h3 className="text-lg font-bold">{editingItemId ? 'Edit Acara' : 'Buat Acara Baru'}</h3><p className="text-sm text-gray-400">Publikasikan acara, lokakarya, atau pertunjukan.</p></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Judul</label><input type="text" required value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Tanggal</label><input type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Waktu</label><input type="text" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Lokasi</label><input type="text" required value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Kategori</label><select value={eventCategory} onChange={e => setEventCategory(e.target.value as any)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm"><option>Pameran</option><option>Konser</option><option>Workshop</option><option>Bazaar</option></select></div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Banner URL</label><CloudUploader folder="events" onUploadSuccess={setEventBannerUrl} currentUser={currentUser}/></div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Deskripsi</label><textarea required rows={4} value={eventDescription} onChange={e => setEventDescription(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5"><button type="button" onClick={clearForms} className="px-5 py-3 text-sm rounded-xl bg-white/5">Reset</button><button type="submit" disabled={loading} className="px-6 py-3 bg-brand-gold text-brand-charcoal rounded-xl text-sm font-black">{loading ? 'Menyimpan...' : 'Simpan'}</button></div>
            </form>
          )}
          {activeFormTab === 'gallery' && (
            <form onSubmit={handleAddArtworkSubmit} className="bg-brand-card border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                 <div className="flex items-center gap-3 border-b border-white/5 pb-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-brand-charcoal"><Palette className="w-5 h-5" /></div><div><h3 className="text-lg font-bold">{editingItemId ? 'Edit Karya' : 'Tambah Karya Baru'}</h3><p className="text-sm text-gray-400">Unggah karya seni untuk ditampilkan di galeri.</p></div></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-sm font-mono">Judul</label><input type="text" required value={artTitle} onChange={e => setArtTitle(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Seniman</label><input type="text" required value={artArtistName} onChange={e => setArtArtistName(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Jenis</label><select value={artType} onChange={e => setArtType(e.target.value as any)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm"><option value="painting">Lukisan</option><option value="music">Musik</option><option value="photography">Fotografi</option><option value="craft">Kerajinan</option><option value="digital">Digital</option></select></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Harga (IDR)</label><input type="number" value={artPrice} onChange={e => setArtPrice(e.target.value)} className={`w-full bg-black/40 rounded-xl p-3 text-sm ${artPriceError ? 'border-rose-500' : 'border-white/10'}`} />{artPriceError && <p className="text-xs text-rose-400">{artPriceError}</p>}</div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Image URL</label><CloudUploader folder="karya" onUploadSuccess={setArtImageUrl} currentUser={currentUser}/></div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Deskripsi</label><textarea required rows={3} value={artDescription} onChange={e => setArtDescription(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5"><button type="button" onClick={clearForms} className="px-5 py-3 text-sm rounded-xl bg-white/5">Reset</button><button type="submit" disabled={loading || !!artPriceError} className="px-6 py-3 bg-brand-gold text-brand-charcoal rounded-xl text-sm font-black disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button></div>
            </form>
          )}
          {activeFormTab === 'shop' && (
            <form onSubmit={handleAddShopSubmit} className="bg-brand-card border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                 <div className="flex items-center gap-3 border-b border-white/5 pb-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-brand-charcoal"><Coffee className="w-5 h-5" /></div><div><h3 className="text-lg font-bold">{editingItemId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3><p className="text-sm text-gray-400">Tambahkan item baru ke toko Anda.</p></div></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Nama</label><input type="text" required value={shopName} onChange={e => setShopName(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Kategori</label><select value={shopCategory} onChange={e => setShopCategory(e.target.value as any)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm"><option value="coffee">Kopi</option><option value="matcha">Matcha</option><option value="tea">Teh</option><option value="merchandise">Merchandise</option></select></div>
                    <div className="space-y-1"><label className="text-sm font-mono">Harga (IDR)</label><input type="number" required value={shopPrice} onChange={e => setShopPrice(e.target.value)} className={`w-full bg-black/40 rounded-xl p-3 text-sm ${shopPriceError ? 'border-rose-500' : 'border-white/10'}`} />{shopPriceError && <p className="text-xs text-rose-400">{shopPriceError}</p>}</div>
                    <div className="space-y-1"><label className="text-sm font-mono">Stok</label><input type="number" required value={shopStock} onChange={e => setShopStock(e.target.value)} className={`w-full bg-black/40 rounded-xl p-3 text-sm ${shopStockError ? 'border-rose-500' : 'border-white/10'}`} />{shopStockError && <p className="text-xs text-rose-400">{shopStockError}</p>}</div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Image URL</label><CloudUploader folder="produk" onUploadSuccess={setShopImageUrl} currentUser={currentUser}/></div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Deskripsi</label><textarea required rows={3} value={shopDescription} onChange={e => setShopDescription(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                    <div className="space-y-1 md:col-span-2"><label className="text-sm font-mono">Cerita</label><textarea rows={3} value={shopJourneyStory} onChange={e => setShopJourneyStory(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl p-3 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5"><button type="button" onClick={clearForms} className="px-5 py-3 text-sm rounded-xl bg-white/5">Reset</button><button type="submit" disabled={loading || !!shopPriceError || !!shopStockError} className="px-6 py-3 bg-brand-gold text-brand-charcoal rounded-xl text-sm font-black disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button></div>
            </form>
          )}
        </div>
      )}

      {adminMenu === 'manage' && (
        <div className="space-y-8">
            {[[eventsList, 'events', 'Acara'], [artworksList, 'artworks', 'Karya'], [shopItemsList, 'shopItems', 'Produk']].map(([list, type, title]) => (
                <div key={type} className="bg-brand-card border border-white/5 rounded-2xl p-5 md:p-6 space-y-4">
                    <h3 className="text-sm font-bold font-mono uppercase text-white tracking-wider border-b border-white/5 pb-3">Katalog {title}</h3>
                    {list.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Kosong.</p> : 
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {list.map((item: any) => (
                                <div key={item.id} className="p-3.5 bg-black/35 rounded-xl border border-white/5 flex justify-between items-center">
                                    <div><h4 className="text-sm font-bold line-clamp-1">{item.title || item.name}</h4><p className="text-xs text-gray-400">ID: {item.id}</p></div>
                                    <div className="flex gap-2"><button onClick={() => handleEditItem(item, type as any)} className="p-2 bg-brand-gold/15 text-brand-gold rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteItem(item.id, type)} className="p-2 bg-rose-500/10 text-rose-400 rounded"><Trash2 className="w-4 h-4" /></button></div>
                                </div>
                            ))}
                        </div>
                    }
                </div>
            ))}
        </div>
      )}

      {adminMenu === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5"><form onSubmit={handleAddAlertSubmit} className="bg-brand-card p-5 rounded-2xl border-white/5 space-y-4"><h3 className="text-sm font-bold font-mono uppercase tracking-wider">{editingAlertId ? 'Edit Alert' : 'Buat Alert Baru'}</h3><textarea required rows={4} value={alertText} onChange={e => setAlertText(e.target.value)} className="w-full bg-black/40 p-3 text-sm rounded-xl"/><div className="grid grid-cols-2 gap-4"><select value={alertType} onChange={e => setAlertType(e.target.value as any)} className="w-full bg-black/40 p-3 text-sm rounded-xl"><option value="info">Info</option><option value="warning">Warning</option><option value="promo">Promo</option><option value="alert">Alert</option></select><div className="flex items-center gap-2"><input type="checkbox" id="alert-active" checked={alertActive} onChange={e => setAlertActive(e.target.checked)} className="w-4 h-4"/><label htmlFor="alert-active">Aktif</label></div></div><div className="flex justify-end gap-2"><button type="submit" className="p-2 px-4 bg-brand-gold text-brand-charcoal rounded-xl text-sm font-bold">{editingAlertId ? 'Simpan' : 'Kirim'}</button></div></form></div>
            <div className="lg:col-span-7 bg-brand-card p-5 rounded-2xl border-white/5 space-y-3"><h4 className="text-sm font-bold font-mono uppercase">Daftar Alert</h4>{alertsList.length === 0 ? <p>Kosong.</p> : alertsList.map(alert => (<div key={alert.id} className="p-3 bg-black/45 rounded-xl flex justify-between items-center"><p className="text-sm">{alert.message}</p><div className="flex gap-2"><button onClick={() => handleEditAlert(alert)}><Edit2 size={16}/></button><button onClick={() => handleToggleAlertActive(alert)}>{alert.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button><button onClick={() => handleDeleteItem(alert.id, 'system_alerts' )}><Trash2 size={16}/></button></div></div>))}</div>
        </div>
      )}

    </div>
  );
}
