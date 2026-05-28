import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Users, ShoppingBag, MessageSquare, Coffee, Calendar, Home, Scroll, Award, Menu, LogIn, LogOut, User as UserIcon, Phone, Mail, MapPin, Instagram, Youtube, Film } from 'lucide-react';
import { Talent, GalleryItem, ShopItem, CartItem, CommunityPost, ArtEvent } from './types';
import { registerFcmToken, triggerNotificationBridge } from './lib/notificationBridge';
import { showSuccessToast, showConfirmDialog } from './lib/alerts';

// Component imports
import HomeSection from './components/HomeSection';
import GallerySection from './components/GallerySection';
import TalentSection from './components/TalentSection';
import ShopSection from './components/ShopSection';
import CommunitySection from './components/CommunitySection';
import EventsSection from './components/EventsSection';
import CartCheckout from './components/CartCheckout';
import ManifestoSection from './components/ManifestoSection';
import AuthModal from './components/AuthModal';
import AdminSection from './components/AdminSection';
import ProfileSection from './components/ProfileSection';
import SplashScreen from './components/SplashScreen';
import AboutUs from './components/AboutUs';
import MenuSheet from './components/MenuSheet';
import VeloraAdiksiUploader from './components/VeloraAdiksi';

// Firebase imports
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInAnonymously, updateProfile } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';

const BottomNavBar = ({ activeTab, setActiveTab, onMenuOpen }: any) => {
    const navItems = [
        { id: 'beranda', label: 'Beranda', icon: Home },
        { id: 'gallery', label: 'Galeri', icon: Palette },
        { id: 'shop', label: 'Toko', icon: Coffee },
        { id: 'community', label: 'Forum', icon: MessageSquare },
        { id: 'menu', label: 'Menu', icon: Menu },
    ];

    return (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-brand-card/90 backdrop-blur-xl border border-white/10 rounded-2xl z-50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map(item => {
                    const isActive = activeTab === item.id;
                    const isMenu = item.id === 'menu';
                    return (
                        <button 
                            key={item.id} 
                            onClick={() => isMenu ? onMenuOpen() : setActiveTab(item.id)} 
                            className="relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 select-none cursor-pointer"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="mobileActiveTabIndicator"
                                    className="absolute inset-x-1 inset-y-1.5 bg-brand-gold/10 rounded-xl border border-brand-gold/15"
                                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                />
                            )}
                            <div className={`relative z-10 flex flex-col items-center gap-1 transition-all duration-200 ${isActive ? 'text-brand-gold scale-[1.05]' : 'text-gray-400 hover:text-gray-200'}`}>
                                <item.icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                                <span className="text-[9px] font-mono font-black uppercase tracking-widest leading-none font-bold">
                                    {item.label}
                                </span>
                            </div>
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-gold shadow-[0_0_8px_#d97706]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const AppFooter = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
    const exploreLinks = [
        { id: 'beranda', label: 'Beranda' },
        { id: 'gallery', label: 'Galeri Karya' },
        { id: 'shop', label: 'Adiksi Kopi' },
        { id: 'events', label: 'Jadwal Acara' },
        { id: 'community', label: 'Forum Komunitas' },
    ];

    const supportLinks = [
        { id: 'about', label: 'Tentang Kami' },
        { id: 'manifesto', label: 'Manifesto' },
        { id: 'talents', label: 'Direktori Bakat' },
    ];

    const socialLinks = [
        { icon: <Instagram size={18} />, href: '#' },
        { icon: <Youtube size={18} />, href: '#' },
        { icon: <Mail size={18} />, href: 'mailto:kontak@rumahadiksi.art' },
    ];

    return (
        <footer className="bg-slate-950/70 border-t border-white/10 pt-16 pb-8 px-4 sm:px-6 lg:px-8 hidden lg:block no-print">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Brand Section */}
                <div className="md:col-span-4">
                    <div className="flex items-center gap-3 mb-4">
                        <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                        <span className="font-serif text-xl font-black tracking-tight text-white">RUMAH ADIKSI KREATIF</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pr-4">Inisiatif pemuda kreatif Pelabuhan Ratu untuk mereklamasi bakat, membentuk kecanduan positif melalui seni, budaya, dan komunitas.</p>
                    <div className="flex space-x-4 mt-6">
                        {socialLinks.map((link, index) => (
                            <a key={index} href={link.href} className="text-gray-400 hover:text-brand-gold transition-colors p-2 bg-white/5 rounded-lg">
                                {link.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Explore Links */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Jelajahi</h3>
                    <ul className="mt-4 space-y-2">
                        {exploreLinks.map(link => (
                            <li key={link.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(link.id); }} className="text-gray-300 hover:text-brand-gold text-sm transition-colors">{link.label}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Support Links */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Dukungan</h3>
                    <ul className="mt-4 space-y-2">
                        {supportLinks.map(link => (
                            <li key={link.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(link.id); }} className="text-gray-300 hover:text-brand-gold text-sm transition-colors">{link.label}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact Info */}
                <div className="md:col-span-4">
                    <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Hubungi Kami</h3>
                    <ul className="mt-4 space-y-3">
                        <li className="flex items-start">
                            <MapPin size={16} className="text-gray-500 mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">Jl. Raya Citepus - Bayah Km. 2, Pantai Citepus, Pelabuhanratu, Sukabumi, Jawa Barat 43364</span>
                        </li>
                        <li className="flex items-start">
                            <Phone size={16} className="text-gray-500 mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">+62 813-8888-1234</span>
                        </li>
                        <li className="flex items-start">
                            <Mail size={16} className="text-gray-500 mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">kontak@rumahadiksi.art</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10 text-center">
                <p className="font-serif text-lg text-gray-300">"Bukan Melawan Arus, Tapi Menari Bersamanya"</p>
                <p className="mt-4 text-xs text-gray-500">&copy; {new Date().getFullYear()} Rumah Adiksi Kreatif. Semua Hak Cipta Dilindungi.</p>
            </div>
        </footer>
    );
};


export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState<string>('beranda');
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const getTabIndex = (tabId: string) => {
    const tabsOrder = [
      'beranda',
      'about',
      'manifesto',
      'gallery',
      'talents',
      'shop',
      'community',
      'events',
      'velora',
      'profile',
      'admin',
      'cart',
    ];
    const idx = tabsOrder.indexOf(tabId);
    return idx === -1 ? 99 : idx;
  };

  const setActiveTab = (newTab: string | ((prev: string) => string)) => {
    setActiveTabState((prev) => {
      const resolvedNewTab = typeof newTab === 'function' ? newTab(prev) : newTab;
      const oldIndex = getTabIndex(prev);
      const newIndex = getTabIndex(resolvedNewTab);
      setSlideDirection(newIndex >= oldIndex ? 1 : -1);
      return resolvedNewTab;
    });
  };
  const [isMenuSheetOpen, setMenuSheetOpen] = useState(false);

  // Global State
  const [talents, setTalents] = useState<Talent[]>([]);
  const [artworks, setArtworks] = useState<GalleryItem[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [events, setEvents] = useState<ArtEvent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string }>>([]);

  useEffect(() => { setTimeout(() => setLoading(false), 1500) }, []);

  const addNotification = (message: string, skipBridge = false) => {
    setNotifications(prev => [{ id: `notif-${Date.now()}`, message }, ...prev]);
    if (!skipBridge) {
      triggerNotificationBridge(message);
    }
  };

  useEffect(() => {
    const handleNotificationEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.message) {
        addNotification(customEvent.detail.message, true);
      }
    };
    window.addEventListener('web-to-native-notification', handleNotificationEvent);
    return () => window.removeEventListener('web-to-native-notification', handleNotificationEvent);
  }, []);

  useEffect(() => {
    if (currentUser) {
      registerFcmToken(currentUser.uid).then((token) => {
        if (token) {
          console.log("FCM registered for user: ", currentUser.uid);
        }
      }).catch(err => {
        console.warn("FCM registration error skipped: ", err);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setUserRole(userDoc.exists() && userDoc.data().role === 'admin' ? 'admin' : 'user');
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, role: 'user', createdAt: new Date().toISOString() });
        }
      } else { setUserRole(null); }
    });

    const unsubs = [
      onSnapshot(collection(db, 'posts'), snap => setPosts(snap.docs.map(d => ({...d.data(), id: d.id})) as CommunityPost[])),
      onSnapshot(collection(db, 'events'), snap => setEvents(snap.docs.map(d => ({...d.data(), id: d.id})) as ArtEvent[])),
      onSnapshot(collection(db, 'artworks'), snap => setArtworks(snap.docs.map(d => ({...d.data(), id: d.id})) as GalleryItem[])),
      onSnapshot(collection(db, 'shopItems'), snap => setShopItems(snap.docs.map(d => ({...d.data(), id: d.id})) as ShopItem[])),
      onSnapshot(collection(db, 'talents'), snap => setTalents(snap.docs.map(d => ({...d.data(), id: d.id})) as Talent[]))
    ];

    return () => { unsubAuth(); unsubs.forEach(unsub => unsub()); };
  }, []);

  const handleLogin = async (provider: any) => {
    try { await signInWithPopup(auth, provider); setAuthModalOpen(false); addNotification("Login berhasil!"); } 
    catch (e) { addNotification("Login dibatalkan."); }
  };
  
  const handleAnonLogin = async (nickname: string) => {
      if (!nickname.trim()) return;
      try {
          const cred = await signInAnonymously(auth);
          await updateProfile(cred.user, { displayName: nickname.trim() });
          if(auth.currentUser) setCurrentUser({...auth.currentUser});
          setAuthModalOpen(false); addNotification(`Masuk sebagai ${nickname}`);
      } catch (e) { addNotification("Gagal masuk anonim."); }
  }

  const handleLogout = async () => {
    const confirmation = await showConfirmDialog('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari akun ini?', 'Ya, logout', 'Tidak');
    if (!confirmation.isConfirmed) return;
    try {
      await signOut(auth);
      addNotification("Logout berhasil.");
      showSuccessToast('Logout berhasil', 'Anda telah keluar dari akun.');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleAddToCart = (item: ShopItem | GalleryItem, type: 'shop' | 'gallery') => {
    if (!currentUser) { setAuthModalOpen(true); addNotification("Silakan login dulu."); return; }
    const id = type === 'shop' ? `shop-${item.id}` : `art-${item.id}`;
    const name = type === 'shop' ? (item as ShopItem).name : (item as GalleryItem).title;

    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? {...i, quantity: i.quantity + 1} : i);
      return [...prev, {id, itemType: type, itemId: item.id, name, price: item.price || 0, imageUrl: item.imageUrl, quantity: 1}];
    });
    addNotification(`"${name}" ditambahkan ke keranjang.`);
  };
  
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navigationItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'manifesto', label: 'Manifesto', icon: Scroll },
    { id: 'gallery', label: 'Galeri', icon: Palette },
    { id: 'talents', label: 'Bakat', icon: Users },
    { id: 'shop', label: 'Toko', icon: Coffee },
    { id: 'community', label: 'Komunitas', icon: MessageSquare },
    { id: 'events', label: 'Acara', icon: Calendar },
    { id: 'velora', label: 'Velora Adiksi', icon: Film },
    { id: 'profile', label: 'Profil', icon: UserIcon },
    ...(userRole === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Award }] : [])
  ];

  const renderContent = () => {
      switch(activeTab) {
          case 'beranda': return <HomeSection talents={talents} artworks={artworks} shopItems={shopItems} events={events} posts={posts} setActiveTab={setActiveTab} onSelectTalent={(t) => { setSelectedTalentId(t.id); setActiveTab('talents'); }} addToCart={(item) => handleAddToCart(item, 'shop')} />;
          case 'manifesto': return <ManifestoSection />;
          case 'gallery': return <GallerySection artworks={artworks} setArtworks={setArtworks} addToCart={(art) => handleAddToCart(art, 'gallery')} onExploreArtist={(id) => { setSelectedTalentId(id); setActiveTab('talents'); }} currentUser={currentUser} openAuthModal={() => setAuthModalOpen(true)} />;
          case 'talents': return <TalentSection talents={talents} artworks={artworks} selectedTalentId={selectedTalentId} setSelectedTalentId={setSelectedTalentId} setActiveTab={setActiveTab} onExploreArtDetail={() => setActiveTab('gallery')} />;
          case 'shop': return <ShopSection items={shopItems} addToCart={(item) => handleAddToCart(item, 'shop')} currentUser={currentUser} addNotification={addNotification} openAuthModal={() => setAuthModalOpen(true)} />;
          case 'community': return <CommunitySection posts={posts} setPosts={setPosts} currentUser={currentUser} userRole={userRole} openAuthModal={() => setAuthModalOpen(true)} artworks={artworks} />;
          case 'events': return <EventsSection events={events} setEvents={setEvents} notifications={[]} addNotification={addNotification} clearNotifications={() => {}} />;
          case 'velora': return <VeloraAdiksiUploader addNotification={addNotification} />;
          case 'cart': return <CartCheckout cart={cart} setCart={setCart} clearCart={() => setCart([])} addNotification={addNotification} setActiveTab={setActiveTab} currentUser={currentUser} />;
          case 'profile': return <ProfileSection currentUser={currentUser} userRole={userRole} talents={talents} artworks={artworks} openAuthModal={() => setAuthModalOpen(true)} triggerToast={addNotification} setActiveTab={setActiveTab} />;
          case 'admin': {
              if (userRole === 'admin') {
                  return <AdminSection addNotification={addNotification} setActiveTab={setActiveTab} />;
              }
              // Redirect to home if not admin
              setActiveTab('beranda');
              return <HomeSection talents={talents} artworks={artworks} shopItems={shopItems} events={events} posts={posts} setActiveTab={setActiveTab} onSelectTalent={(t) => { setSelectedTalentId(t.id); setActiveTab('talents'); }} addToCart={(item) => handleAddToCart(item, 'shop')} />;
          }
          case 'about': return <AboutUs />;
          default: return <HomeSection talents={talents} artworks={artworks} shopItems={shopItems} events={events} posts={posts} setActiveTab={setActiveTab} onSelectTalent={(t) => { setSelectedTalentId(t.id); setActiveTab('talents'); }} addToCart={(item) => handleAddToCart(item, 'shop')} />;
      }
  }

  if (loading) return <SplashScreen />;
  
  const showFooter = ['beranda', 'manifesto', 'about'].includes(activeTab);

  return (
    <div className="min-h-screen bg-brand-charcoal text-slate-100 font-sans flex flex-col pb-24 lg:pb-0">
      {/* Mobile-Only Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-brand-card/95 backdrop-blur-xl border-b border-white/10 no-print shadow-lg shadow-black/20">
        <div className="px-4 h-14 flex items-center justify-between">
          <div onClick={() => setActiveTab('beranda')} className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
            <img src="/logo.png" alt="Logo" className="w-8 h-8" />
            <span className="font-serif text-xs font-black tracking-tight text-white uppercase sm:text-sm">RUMAH ADIKSI</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('cart')} 
              className={`p-1.5 rounded-xl border relative active:scale-95 transition-all cursor-pointer ${activeTab === 'cart' ? 'bg-brand-gold text-brand-charcoal border-transparent' : 'bg-white/5 text-gray-300 border-white/5'}`}
            >
              <ShoppingBag size={14} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-[10px] font-black rounded-full flex items-center justify-center text-white scale-90">
                  {cartCount}
                </span>
              )}
            </button>
            {currentUser ? (
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`p-0.5 rounded-full border transition-all active:scale-95 cursor-pointer ${activeTab === 'profile' ? 'border-brand-gold ring-1 ring-brand-gold/30' : 'border-white/10'}`}
              >
                <img 
                  src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                  alt="Profil" 
                  className="w-6.5 h-6.5 rounded-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </button>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)} 
                className="p-1.5 rounded-xl bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/20 active:scale-95 transition-all cursor-pointer"
              >
                <LogIn size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop-Only Header (Luxurious & Elegant Desktop Layout) */}
      <header className="hidden lg:block sticky top-0 z-40 bg-brand-card/75 backdrop-blur-2xl border-b border-brand-gold/15 no-print shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand Brand */}
          <div 
            onClick={() => setActiveTab('beranda')} 
            className="flex items-center gap-3.5 cursor-pointer group active:scale-95 transition-all duration-300 select-none pb-0.5"
          >
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-brand-gold to-amber-500 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-500" />
              <img src="/logo.png" alt="Logo" className="w-11 h-11 relative z-10 transition-transform duration-500 group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-black tracking-wider text-white bg-clip-text bg-gradient-to-r from-white via-gray-100 to-brand-gold/90">
                RUMAH ADIKSI
              </span>
              <span className="text-[8px] font-mono font-extrabold tracking-[0.35em] text-brand-gold/80 leading-none">
                PELABUHANRATU
              </span>
            </div>
          </div>

          {/* Luxury Tab Navigation Items */}
          <nav className="flex items-center gap-0.5 xl:gap-1.5 bg-slate-950/70 p-1 xl:p-1.5 rounded-2xl border border-white/5 shadow-inner">
            {navigationItems.filter(nav => nav.id !== 'profile').map(nav => {
              const isActive = activeTab === nav.id;
              return (
                <button 
                  key={nav.id} 
                  onClick={() => setActiveTab(nav.id)} 
                  className="relative px-2 xl:px-3.5 py-1.5 xl:py-2 rounded-xl text-[9.5px] xl:text-[10.5px] font-extrabold uppercase tracking-widest flex items-center gap-1 xl:gap-2 transition-all duration-300 cursor-pointer select-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopActiveTabIndicator"
                      className="absolute inset-0 bg-brand-gold/[0.08] border border-brand-gold/25 rounded-xl"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <nav.icon size={12} className={`transition-all duration-300 ${isActive ? 'text-brand-gold scale-110 stroke-[2.5px]' : 'text-gray-500 hover:text-gray-300'}`} />
                  <span className={`transition-colors duration-300 ${isActive ? 'text-brand-gold font-bold' : 'text-gray-400 hover:text-gray-200'}`}>
                    {nav.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-gold rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls Area mapping Profile & Cart */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-950/50 border border-brand-gold/15 hover:border-brand-gold/25 pl-3 pr-2 py-1.5 rounded-2xl transition duration-350 select-none">
                {/* Photo profile with active indicator */}
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2.5 text-left group cursor-pointer"
                  title="Lihat Profil Saya"
                >
                  <div className="relative">
                    <img 
                      src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                      alt="User" 
                      className="w-8 h-8 rounded-xl object-cover border border-white/10 group-hover:border-brand-gold/40 transition-colors" 
                      referrerPolicy="no-referrer" 
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-brand-card rounded-full animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-white leading-tight max-w-[100px] truncate group-hover:text-brand-gold transition-colors">
                      {currentUser.displayName || 'Kreator'}
                    </span>
                    <span className="text-[8px] font-mono font-bold uppercase text-brand-gold tracking-widest leading-none">
                      {userRole === 'admin' ? 'ADMIN' : 'MEMBER'}
                    </span>
                  </div>
                </button>
                
                <div className="w-px h-5 bg-white/10 mx-1" />

                <button 
                  onClick={handleLogout} 
                  className="px-2.5 py-1 text-[9px] font-mono font-black uppercase text-gray-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all duration-200 cursor-pointer"
                  title="Logout"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)} 
                className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-brand-gold to-amber-505 hover:brightness-110 active:scale-95 text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/20 transition-all duration-300 hover:shadow-brand-gold/30"
              >
                <LogIn size={13} className="stroke-[2.5px]" />
                <span>Masuk</span>
              </button>
            )}

            {/* Premium Shopping Cart icon button */}
            <button 
              onClick={() => setActiveTab('cart')} 
              className={`p-3 rounded-2xl border transition-all duration-300 relative select-none cursor-pointer hover:scale-105 active:scale-95 ${
                activeTab === 'cart' 
                  ? 'bg-brand-gold text-brand-charcoal border-brand-gold shadow-lg shadow-brand-gold/15' 
                  : 'bg-slate-950/40 hover:bg-slate-950/85 text-gray-300 border-white/5 hover:border-brand-gold/30 hover:text-brand-gold'
              }`}
              title="Keranjang Belanja"
            >
              <ShoppingBag size={18} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-[9px] font-mono font-extrabold text-white rounded-full flex items-center justify-center min-w-5 h-5 shadow-md shadow-black/50 border border-brand-card"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      <main className={activeTab === 'velora' ? 'w-full flex-grow relative' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full relative'}>
        <AnimatePresence mode="popLayout" custom={slideDirection}>
          <motion.div
            key={activeTab}
            custom={slideDirection}
            initial={(dir) => ({
              opacity: 0,
              x: dir * 50
            })}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={(dir) => ({
              opacity: 0,
              x: -dir * 50
            })}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
              mass: 0.6
            }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} onMenuOpen={() => setMenuSheetOpen(true)} />
      <MenuSheet isOpen={isMenuSheetOpen} onClose={() => setMenuSheetOpen(false)} setActiveTab={setActiveTab} currentUser={currentUser} handleLogout={handleLogout} onOpenAuthModal={() => setAuthModalOpen(true)} />

      {showFooter && <AppFooter setActiveTab={setActiveTab} />}

      {authModalOpen && <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={addNotification} onGoogleLogin={() => handleLogin(new GoogleAuthProvider())} onAnonymousLogin={handleAnonLogin} />}
    </div>
  );
}
