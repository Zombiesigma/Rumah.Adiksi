import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Users, ShoppingBag, MessageSquare, MessageCircle, Coffee, Calendar, Home, Scroll, Award, Menu, LogIn, LogOut, User as UserIcon, Phone, Mail, MapPin, Instagram, Youtube, Film, ChevronDown } from 'lucide-react';
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
import ChatSection from './components/ChatSection';

// GetStream Video SDK imports
import { StreamVideoClient } from '@stream-io/video-react-sdk';

// Firebase imports
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInAnonymously, updateProfile } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc, query, where } from 'firebase/firestore';

const BottomNavBar = ({ activeTab, setActiveTab, onMenuOpen, unreads }: any) => {
    const navItems = [
        { id: 'beranda', label: 'Beranda', icon: Home },
        { id: 'gallery', label: 'Galeri', icon: Palette },
        { id: 'shop', label: 'Toko', icon: Coffee },
        { id: 'community', label: 'Forum', icon: MessageSquare },
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'menu', label: 'Menu', icon: Menu },
    ];

    const anyMenuUnreads = unreads && (unreads.talents || unreads.events || unreads.velora);

    return (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-full z-50 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map(item => {
                    const isActive = activeTab === item.id;
                    const isMenu = item.id === 'menu';
                    const hasIndicator = isMenu ? anyMenuUnreads : (unreads && unreads[item.id]);

                    return (
                        <button 
                            key={item.id} 
                            onClick={() => isMenu ? onMenuOpen() : setActiveTab(item.id)} 
                            className="relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 select-none cursor-pointer"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="mobileActiveTabIndicator"
                                    className="absolute inset-x-1.5 inset-y-1.5 bg-brand-accent/10 rounded-full border border-brand-accent/15"
                                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                />
                            )}
                            <div className={`relative z-10 flex flex-col items-center gap-1 transition-all duration-200 ${isActive ? 'text-brand-accent scale-[1.05]' : 'text-gray-500 hover:text-gray-800'}`}>
                                <div className="relative">
                                    <item.icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                                    {hasIndicator && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-white rounded-full animate-pulse shadow-md" />
                                    )}
                                </div>
                                <span className="text-[9px] font-sans font-black uppercase tracking-widest leading-none">
                                    {item.label}
                                </span>
                            </div>
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-accent" />
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
        <footer className="bg-[#1E3932] text-white pt-16 pb-8 px-4 sm:px-6 lg:px-8 hidden lg:block no-print">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Brand Section */}
                <div className="md:col-span-4">
                    <div className="flex items-center gap-3 mb-4">
                        <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full" />
                        <span className="font-serif text-xl font-black tracking-tight text-white uppercase">Starbucks Adiksi</span>
                    </div>
                    <p className="text-gray-350 text-sm leading-relaxed pr-4">Inisiatif pemuda creative Pelabuhan Ratu untuk membentuk kecanduan positif melalui seni, kopi kontemporer, dan komitmen komunitas.</p>
                    <div className="flex space-x-4 mt-6">
                        {socialLinks.map((link, index) => (
                            <a key={index} href={link.href} className="text-gray-300 hover:text-brand-gold transition-colors p-2 bg-white/5 rounded-full">
                                {link.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Explore Links */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold tracking-wider text-brand-gold uppercase">Jelajahi</h3>
                    <ul className="mt-4 space-y-2">
                        {exploreLinks.map(link => (
                            <li key={link.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(link.id); }} className="text-gray-300 hover:text-white text-sm transition-colors">{link.label}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Support Links */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold tracking-wider text-brand-gold uppercase">Dukungan</h3>
                    <ul className="mt-4 space-y-2">
                        {supportLinks.map(link => (
                            <li key={link.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(link.id); }} className="text-gray-300 hover:text-white text-sm transition-colors">{link.label}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact Info */}
                <div className="md:col-span-4">
                    <h3 className="text-sm font-semibold tracking-wider text-brand-gold uppercase">Hubungi Kami</h3>
                    <ul className="mt-4 space-y-3">
                        <li className="flex items-start">
                            <MapPin size={16} className="text-brand-gold mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">Jl. Raya Citepus - Bayah Km. 2, Pantai Citepus, Pelabuhanratu, Sukabumi, Jawa Barat 43364</span>
                        </li>
                        <li className="flex items-start">
                            <Phone size={16} className="text-brand-gold mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">+62 813-8888-1234</span>
                        </li>
                        <li className="flex items-start">
                            <Mail size={16} className="text-brand-gold mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">kontak@rumahadiksi.art</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10 text-center">
                <p className="font-serif text-lg text-white">"Blooming with Flows — Mekar Mengikuti Aliran"</p>
                <p className="mt-4 text-xs text-gray-400">&copy; {new Date().getFullYear()} Rumah Adiksi Kreatif - Powered by Starbucks Style. Semua Hak Cipta Dilindungi.</p>
            </div>
        </footer>
    );
};


export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState<string>('beranda');
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const [chatTarget, setChatTarget] = useState<{
    userId?: string | null;
    userName?: string | null;
    userAvatar?: string | null;
    roomId?: string | null;
  }>({});

  const startChat = (target: { userId?: string | null; userName?: string | null; userAvatar?: string | null; roomId?: string | null }) => {
    setChatTarget(target);
    setActiveTab('chat');
  };

  const getTabIndex = (tabId: string) => {
    const tabsOrder = [
      'beranda',
      'about',
      'manifesto',
      'gallery',
      'talents',
      'shop',
      'community',
      'chat',
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Global State
  const [talents, setTalents] = useState<Talent[]>([]);
  const [artworks, setArtworks] = useState<GalleryItem[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [events, setEvents] = useState<ArtEvent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [veloraFilms, setVeloraFilms] = useState<any[]>([]);
  const [initialVideoId, setInitialVideoId] = useState<string | null>(null);

  // GetStream SDK State & Realtime Call State mapped globally
  const [streamClient, setStreamClient] = useState<any | null>(null);
  const [activeCallInstance, setActiveCallInstance] = useState<any | null>(null);
  const [callMode, setCallMode] = useState<'video' | 'audio' | null>(null);

  // Parse Tab and Video Deep-link URL parameters on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const videoParam = params.get('video');
      if (tabParam) {
        setActiveTab(tabParam);
      }
      if (videoParam) {
        setInitialVideoId(videoParam);
      }
    } catch (e) {
      console.error("Failed to parse initial URL search parameters", e);
    }
  }, []);

  // Scroll to top whenever tab changes to ensure smooth start of reading
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (e) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [activeTab]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string }>>([]);

  // Indicator States: tracks last active/seen times and counts
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(() => {
    const fallback = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return {
      gallery: localStorage.getItem('lastSeen_gallery') || fallback,
      shop: localStorage.getItem('lastSeen_shop') || fallback,
      community: localStorage.getItem('lastSeen_community') || fallback,
      talents: localStorage.getItem('lastSeen_talents') || fallback,
      chat: localStorage.getItem('lastSeen_chat') || fallback,
      events: localStorage.getItem('lastSeen_events') || fallback,
      velora: localStorage.getItem('lastSeen_velora') || fallback,
    };
  });

  const [lastSeenCount, setLastSeenCount] = useState<Record<string, number>>(() => {
    return {
      gallery: parseInt(localStorage.getItem('lastCount_gallery') || '0', 10),
      shop: parseInt(localStorage.getItem('lastCount_shop') || '0', 10),
      community: parseInt(localStorage.getItem('lastCount_community') || '0', 10),
      talents: parseInt(localStorage.getItem('lastCount_talents') || '0', 10),
      events: parseInt(localStorage.getItem('lastCount_events') || '0', 10),
      velora: parseInt(localStorage.getItem('lastCount_velora') || '0', 10),
    };
  });

  // Automatically update the view timestamps when the selected page is loaded
  useEffect(() => {
    const now = new Date().toISOString();
    localStorage.setItem(`lastSeen_${activeTab}`, now);
    
    let currentCount = 0;
    if (activeTab === 'gallery') currentCount = artworks.length;
    else if (activeTab === 'shop') currentCount = shopItems.length;
    else if (activeTab === 'community') currentCount = posts.length;
    else if (activeTab === 'talents') currentCount = talents.length;
    else if (activeTab === 'events') currentCount = events.length;
    else if (activeTab === 'velora') currentCount = veloraFilms.length;
    
    if (currentCount > 0) {
      localStorage.setItem(`lastCount_${activeTab}`, currentCount.toString());
      setLastSeenCount(prev => ({
        ...prev,
        [activeTab]: currentCount
      }));
    }

    setLastSeenMap(prev => ({
      ...prev,
      [activeTab]: now
    }));
  }, [activeTab, artworks.length, shopItems.length, posts.length, talents.length, events.length, veloraFilms.length]);

  // Determine which tabs have updates or new notifications
  const getUnreads = () => {
    const unreads: Record<string, boolean> = {
      gallery: false,
      shop: false,
      community: false,
      talents: false,
      chat: false,
      events: false,
      velora: false,
    };

    // Chat: check if there is any message in any room newer than what was last read
    if (currentUser && chatRooms.length > 0) {
      unreads.chat = chatRooms.some(room => {
        const msgTime = room.lastMessageTime;
        if (!msgTime) return false;
        let isoTime = '';
        if (typeof msgTime === 'string') {
          isoTime = msgTime;
        } else if (msgTime.seconds) {
          isoTime = new Date(msgTime.seconds * 1000).toISOString();
        }
        return isoTime > lastSeenMap.chat && room.lastMessageSenderId !== currentUser.uid;
      });
    }

    // Gallery / Artworks
    unreads.gallery = artworks.some(art => {
      return art.createdDate && art.createdDate > lastSeenMap.gallery && art.artistId !== currentUser?.uid;
    }) || (artworks.length > lastSeenCount.gallery && lastSeenCount.gallery > 0);

    // Community / Forum
    unreads.community = posts.some(post => {
      const pTime = post.timestamp;
      return pTime && pTime > lastSeenMap.community && post.authorUid !== currentUser?.uid;
    }) || (posts.length > lastSeenCount.community && lastSeenCount.community > 0);

    // Shop
    unreads.shop = (shopItems.length > lastSeenCount.shop && lastSeenCount.shop > 0);

    // Talents / Direktori Bakat
    unreads.talents = (talents.length > lastSeenCount.talents && lastSeenCount.talents > 0);

    // Events / Acara Seni
    unreads.events = (events.length > lastSeenCount.events && lastSeenCount.events > 0);

    // Velora films
    unreads.velora = veloraFilms.some(film => {
      const fTime = film.createdAt;
      return fTime && fTime > lastSeenMap.velora && film.uploadedBy !== currentUser?.uid;
    }) || (veloraFilms.length > lastSeenCount.velora && lastSeenCount.velora > 0);

    return unreads;
  };

  const currentUnreads = getUnreads();

  // Chat Room subscription inside App.tsx to keep unreads live
  useEffect(() => {
    if (!currentUser) {
      setChatRooms([]);
      return;
    }
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );
    const unsubChats = onSnapshot(q, (snapshot) => {
      setChatRooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.warn("FCM chat listener non-blocking error skipped:", err);
    });

    return () => unsubChats();
  }, [currentUser]);

  // Global GetStream SDK client and call state management
  useEffect(() => {
    if (!currentUser) {
      setStreamClient(null);
      return;
    }

    let isSubscribed = true;
    let clientInstance: any = null;

    const initStream = async () => {
      try {
        const res = await fetch(`/api/stream/token?userId=${currentUser.uid}`);
        if (!res.ok) throw new Error("Gagal mengambil token Stream");
        const { token, apiKey } = await res.json();

        if (!isSubscribed) return;

        const streamUser = {
          id: currentUser.uid,
          name: currentUser.displayName || 'Anggota Adiksi',
          image: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        };

        const client = new StreamVideoClient({ 
          apiKey, 
          user: streamUser, 
          token 
        });
        
        await client.connectUser(streamUser, token);
        
        clientInstance = client;
        setStreamClient(client);

        // Attach event listeners for call state changes globally
        const unsubCallCreated = client.on('call.created', (event: any) => {
          console.log("Stream Event: call.created", event);
        });

        const unsubCallRing = client.on('call.ring', (event: any) => {
          console.log("Stream Event: call.ring", event);
          addNotification(`Panggilan masuk dari ${event.call?.created_by?.name || 'Seseorang'} 📞`);
        });

        return () => {
          unsubCallCreated();
          unsubCallRing();
        };
      } catch (err) {
        console.warn("Failed to initialize Stream Video Client in App.tsx:", err);
      }
    };

    initStream();

    return () => {
      isSubscribed = false;
      if (clientInstance) {
        clientInstance.disconnectUser().catch((err: any) => {
          console.warn("Disconnect stream user non-blocking issue:", err);
        });
      }
    };
  }, [currentUser]);

  // Event listener for current activeCallInstance state changes
  useEffect(() => {
    if (!activeCallInstance) return;

    let isSubscribed = true;
    let unsubCallingState: any = null;

    // Monitor RXJS callingState$ observable for robust termination handling
    if (activeCallInstance.state?.callingState$?.subscribe) {
      unsubCallingState = activeCallInstance.state.callingState$.subscribe({
        next: (callingState: any) => {
          if (!isSubscribed) return;
          console.log(`Stream Video SDK callingState changed: ${callingState}`);
          if (callingState === 'left' || callingState === 'terminated' || callingState === 'failed' || callingState === 'offline') {
            console.log("Cleaning up activeCallInstance due to callingState termination");
            setActiveCallInstance(null);
            setCallMode(null);
          }
        },
        error: (err: any) => {
          console.warn("Error observing CallingState in App.tsx:", err);
        }
      });
    }

    if (typeof activeCallInstance.on !== 'function') {
      return () => {
        isSubscribed = false;
        if (unsubCallingState && typeof unsubCallingState.unsubscribe === 'function') {
          unsubCallingState.unsubscribe();
        }
      };
    }

    const unsubState = activeCallInstance.on('state-change', (state: any) => {
      console.log("Active Call Instance state changed in App.tsx:", state);
      if (state === 'offline' || state === 'disconnected') {
        setActiveCallInstance(null);
        setCallMode(null);
      }
    });

    const unsubAccepted = activeCallInstance.on('call.accepted', (event: any) => {
      console.log("Stream Event: call.accepted in App.tsx", event);
      setCallMode(activeCallInstance.type as any || 'audio');
    });

    const unsubRejected = activeCallInstance.on('call.rejected', (event: any) => {
      console.log("Stream Event: call.rejected in App.tsx", event);
      setActiveCallInstance(null);
      setCallMode(null);
    });

    const unsubEnded = activeCallInstance.on('call.ended', (event: any) => {
      console.log("Stream Event: call.ended in App.tsx", event);
      setActiveCallInstance(null);
      setCallMode(null);
    });

    return () => {
      isSubscribed = false;
      unsubState();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
      if (unsubCallingState && typeof unsubCallingState.unsubscribe === 'function') {
        unsubCallingState.unsubscribe();
      }
    };
  }, [activeCallInstance]);

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
      onSnapshot(collection(db, 'talents'), snap => setTalents(snap.docs.map(d => ({...d.data(), id: d.id})) as Talent[])),
      onSnapshot(collection(db, 'velora_films'), snap => setVeloraFilms(snap.docs.map(d => ({...d.data(), id: d.id}))))
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

  const primaryNavigationItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'gallery', label: 'Galeri', icon: Palette },
    { id: 'shop', label: 'Toko', icon: Coffee },
    { id: 'community', label: 'Forum', icon: MessageSquare },
    { id: 'talents', label: 'Bakat', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
  ];

  const secondaryNavigationItems = [
    { id: 'events', label: 'Acara Seni', icon: Calendar, description: 'Jadwal Pameran & Festival Kolektif' },
    { id: 'velora', label: 'Velora Adiksi', icon: Film, description: 'Eksplorasi Video Pendek Kreator' },
    { id: 'manifesto', label: 'Manifesto', icon: Scroll, description: 'Landasan Perjuangan Seni Adiksi' },
    ...(userRole === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Award, description: 'Sistem Kontrol & Moderator' }] : [])
  ];

  const renderContent = () => {
      switch(activeTab) {
          case 'beranda': return <HomeSection talents={talents} artworks={artworks} shopItems={shopItems} events={events} posts={posts} setActiveTab={setActiveTab} onSelectTalent={(t) => { setSelectedTalentId(t.id); setActiveTab('talents'); }} addToCart={(item) => handleAddToCart(item, 'shop')} />;
          case 'manifesto': return <ManifestoSection />;
          case 'gallery': return <GallerySection artworks={artworks} setArtworks={setArtworks} addToCart={(art) => handleAddToCart(art, 'gallery')} onExploreArtist={(id) => { setSelectedTalentId(id); setActiveTab('talents'); }} currentUser={currentUser} openAuthModal={() => setAuthModalOpen(true)} userRole={userRole} startChat={startChat} />;
          case 'talents': return <TalentSection talents={talents} artworks={artworks} selectedTalentId={selectedTalentId} setSelectedTalentId={setSelectedTalentId} setActiveTab={setActiveTab} onExploreArtDetail={() => setActiveTab('gallery')} startChat={startChat} />;
          case 'shop': return <ShopSection items={shopItems} addToCart={(item) => handleAddToCart(item, 'shop')} currentUser={currentUser} addNotification={addNotification} openAuthModal={() => setAuthModalOpen(true)} setActiveTab={setActiveTab} cartCount={cartCount} />;
          case 'community': return <CommunitySection posts={posts} setPosts={setPosts} currentUser={currentUser} userRole={userRole} openAuthModal={() => setAuthModalOpen(true)} artworks={artworks} startChat={startChat} />;
          case 'chat': return (
            <ChatSection 
              currentUser={currentUser}
              openAuthModal={() => setAuthModalOpen(true)}
              initialTargetUserId={chatTarget?.userId || undefined}
              initialTargetUserName={chatTarget?.userName || undefined}
              initialTargetRoomId={chatTarget?.roomId || undefined}
              onClearInitialTargets={() => setChatTarget({})}
              // Stream Video States initialized globally
              globalStreamClient={streamClient}
              globalActiveCallInstance={activeCallInstance}
              setGlobalActiveCallInstance={setActiveCallInstance}
              globalCallMode={callMode}
              setGlobalCallMode={setCallMode}
            />
          );
          case 'events': return <EventsSection events={events} setEvents={setEvents} notifications={[]} addNotification={addNotification} clearNotifications={() => {}} />;
          case 'velora': return <VeloraAdiksiUploader addNotification={addNotification} initialVideoId={initialVideoId} />;
          case 'cart': return <CartCheckout cart={cart} setCart={setCart} clearCart={() => setCart([])} addNotification={addNotification} setActiveTab={setActiveTab} currentUser={currentUser} />;
          case 'profile': return <ProfileSection currentUser={currentUser} userRole={userRole} talents={talents} artworks={artworks} openAuthModal={() => setAuthModalOpen(true)} triggerToast={addNotification} setActiveTab={setActiveTab} startChat={startChat} />;
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
    <div className="min-h-screen bg-brand-cream text-gray-900 font-sans flex flex-col pb-24 lg:pb-0">
      {/* Mobile-Only Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200 no-print shadow-sm">
        <div className="px-4 h-14 flex items-center justify-between">
          <div onClick={() => setActiveTab('beranda')} className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
            <span className="font-sans text-xs font-black tracking-tight text-brand-green uppercase sm:text-sm">RUMAH ADIKSI</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('cart')} 
              className={`p-1.5 rounded-full border relative active:scale-95 transition-all cursor-pointer ${activeTab === 'cart' ? 'bg-brand-accent text-white border-transparent shadow-md' : 'bg-transparent text-gray-700 border-gray-200'}`}
            >
              <ShoppingBag size={14} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-[9px] font-black rounded-full flex items-center justify-center text-white scale-90 border border-white">
                  {cartCount}
                </span>
              )}
            </button>
            {currentUser ? (
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`p-0.5 rounded-full border transition-all active:scale-95 cursor-pointer ${activeTab === 'profile' ? 'border-brand-accent ring-1 ring-brand-accent/30' : 'border-gray-200'}`}
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
                className="p-1.5 rounded-full bg-brand-accent text-white active:scale-95 transition-all cursor-pointer"
              >
                <LogIn size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop-Only Header (Luxurious & Elegant Desktop Layout) */}
      <header className="hidden lg:block sticky top-0 z-40 bg-white/95 backdrop-blur-2xl border-b border-gray-200 no-print shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand Brand */}
          <div 
            onClick={() => setActiveTab('beranda')} 
            className="flex items-center gap-3.5 cursor-pointer group active:scale-95 transition-all duration-300 select-none pb-0.5"
          >
            <div className="relative">
              <img src="/logo.png" alt="Logo" className="w-11 h-11 relative z-10 transition-transform duration-500 group-hover:rotate-12 rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-lg font-black tracking-wider text-brand-green">
                RUMAH ADIKSI
              </span>
              <span className="text-[8px] font-mono font-extrabold tracking-[0.35em] text-brand-gold leading-none">
                PELABUHANRATU
              </span>
            </div>
          </div>

          {/* Luxury Tab Navigation Items */}
          <nav className="flex items-center gap-0.5 xl:gap-1.5 bg-brand-ceramic p-1 xl:p-1.5 rounded-full border border-gray-200 shadow-inner">
            {primaryNavigationItems.map(nav => {
              const isActive = activeTab === nav.id;
              const hasIndicator = currentUnreads[nav.id];
              return (
                <button 
                  key={nav.id} 
                  onClick={() => setActiveTab(nav.id)} 
                  className="relative px-4 py-2 rounded-full text-[10.5px] font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 cursor-pointer select-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopActiveTabIndicator"
                      className="absolute inset-0 bg-brand-accent/10 border border-brand-accent/20 rounded-full"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <div className="relative">
                    <nav.icon size={12} className={`transition-all duration-300 ${isActive ? 'text-brand-accent scale-110 stroke-[2.5px]' : 'text-gray-500 hover:text-gray-700'}`} />
                    {hasIndicator && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-md" />
                    )}
                  </div>
                  <span className={`transition-colors duration-300 ${isActive ? 'text-brand-accent font-black' : 'text-gray-600 hover:text-brand-green'}`}>
                    {nav.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-accent rounded-full" />
                  )}
                </button>
              );
            })}

            {/* Elegant Dropdown for Secondary Navigation Items */}
            <div 
              className="relative"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button 
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className={`relative px-4 py-2 rounded-full text-[10.5px] font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 cursor-pointer select-none ${
                  secondaryNavigationItems.some(i => activeTab === i.id) 
                    ? 'text-brand-accent font-black' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {secondaryNavigationItems.some(i => activeTab === i.id) && (
                  <div className="absolute inset-0 bg-brand-accent/10 border border-brand-accent/20 rounded-full" />
                )}
                <div className="relative flex items-center gap-1">
                  <ChevronDown size={11} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-brand-accent' : 'text-gray-550'}`} />
                  {(currentUnreads.events || currentUnreads.velora) && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-md" />
                  )}
                </div>
                <span>Program</span>
                {secondaryNavigationItems.some(i => activeTab === i.id) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-accent rounded-full" />
                )}
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl p-2.5 shadow-lg z-50 flex flex-col gap-1"
                  >
                    {secondaryNavigationItems.map(item => {
                      const isItemActive = activeTab === item.id;
                      const hasItemIndicator = currentUnreads[item.id];
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`relative flex items-start gap-4 p-3 rounded-xl transition duration-250 text-left select-none cursor-pointer border ${
                            isItemActive 
                              ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent' 
                              : 'bg-transparent border-transparent text-gray-700 hover:bg-gray-50 hover:text-brand-green'
                          }`}
                        >
                          <div className="relative mt-0.5">
                            <item.icon size={14} className={`shrink-0 ${isItemActive ? 'text-brand-accent font-bold' : 'text-gray-500'}`} />
                            {hasItemIndicator && (
                              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-md" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider font-sans">
                              {item.label}
                            </span>
                            <span className="text-[9px] text-gray-500 font-medium font-sans normal-case tracking-normal">
                              {item.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right Controls Area mapping Profile & Cart */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-brand-ceramic border border-gray-200 pl-3 pr-2 py-1.5 rounded-full select-none">
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
                      className="w-8 h-8 rounded-full object-cover border border-gray-200 group-hover:border-brand-accent transition-colors" 
                      referrerPolicy="no-referrer" 
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-gray-900 leading-tight max-w-[100px] truncate group-hover:text-brand-accent transition-colors">
                      {currentUser.displayName || 'Kreator'}
                    </span>
                    <span className="text-[8px] font-mono font-bold uppercase text-brand-accent tracking-widest leading-none">
                      {userRole === 'admin' ? 'ADMIN' : 'MEMBER'}
                    </span>
                  </div>
                </button>
                
                <div className="w-px h-5 bg-gray-300 mx-1" />

                <button 
                  onClick={handleLogout} 
                  className="px-2.5 py-1 text-[9px] font-mono font-black uppercase text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 cursor-pointer"
                  title="Logout"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)} 
                className="relative overflow-hidden px-5 py-2.5 bg-brand-accent hover:bg-[#006241] active:scale-95 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all duration-300"
              >
                <LogIn size={13} className="stroke-[2.5px]" />
                <span>Masuk</span>
              </button>
            )}

            {/* Premium Shopping Cart icon button */}
            <button 
              onClick={() => setActiveTab('cart')} 
              className={`p-3 rounded-full border transition-all duration-300 relative select-none cursor-pointer hover:scale-105 active:scale-95 ${
                activeTab === 'cart' 
                  ? 'bg-brand-accent text-white border-transparent shadow-md' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-brand-accent'
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
                    className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-brand-accent text-[9px] font-mono font-extrabold text-white rounded-full flex items-center justify-center min-w-5 h-5 shadow-sm border border-white"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Premium Top Progress Line Page/Tab Transition Indicator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ width: "0%", opacity: 1 }}
          animate={{ width: "100%", opacity: [1, 1, 0] }}
          transition={{
            width: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            opacity: { delay: 0.4, duration: 0.15, ease: "linear" }
          }}
          className="h-1 bg-gradient-to-r from-brand-accent via-brand-gold to-emerald-500 fixed top-14 lg:top-20 left-0 z-50 pointer-events-none"
        />
      </AnimatePresence>

      <main className={['velora', 'chat'].includes(activeTab) ? 'w-full flex-grow relative text-slate-100' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full relative'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.995 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} onMenuOpen={() => setMenuSheetOpen(true)} unreads={currentUnreads} />
      <MenuSheet isOpen={isMenuSheetOpen} onClose={() => setMenuSheetOpen(false)} setActiveTab={setActiveTab} currentUser={currentUser} userRole={userRole} handleLogout={handleLogout} onOpenAuthModal={() => setAuthModalOpen(true)} unreads={currentUnreads} />

      {showFooter && <AppFooter setActiveTab={setActiveTab} />}

      {authModalOpen && <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={addNotification} onGoogleLogin={() => handleLogin(new GoogleAuthProvider())} onAnonymousLogin={handleAnonLogin} />}
    </div>
  );
}
