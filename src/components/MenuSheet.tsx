import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Scroll, Users, Info, LogIn, LogOut, X, Film, Award, MessageCircle, Calendar } from 'lucide-react';

interface MenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  currentUser: any; // Firebase user
  userRole?: 'user' | 'admin' | null;
  handleLogout: () => void;
  onOpenAuthModal?: () => void;
  unreads?: Record<string, boolean>;
}

export default function MenuSheet({ isOpen, onClose, setActiveTab, currentUser, userRole, handleLogout, onOpenAuthModal, unreads }: MenuSheetProps) {
  const menuItems = [
    { id: 'profile', label: 'Profil Saya', icon: User, requiresAuth: true },
    { id: 'chat', label: 'Ruang Chat', icon: MessageCircle, requiresAuth: false },
    { id: 'events', label: 'Acara Seni', icon: Calendar, requiresAuth: false },
    { id: 'manifesto', label: 'Manifesto Kami', icon: Scroll, requiresAuth: false },
    { id: 'talents', label: 'Direktori Bakat', icon: Users, requiresAuth: false },
    { id: 'velora', label: 'Velora Adiksi', icon: Film, requiresAuth: false },
    { id: 'about', label: 'Tentang Kami', icon: Info, requiresAuth: false },
    ...(userRole === 'admin' ? [{ id: 'admin', label: 'Panel Admin', icon: Award, requiresAuth: true }] : []),
  ];

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99] flex items-end justify-center lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Menu Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-lg bg-brand-house border-t border-brand-uplift/30 rounded-t-3xl p-5 pb-24 space-y-4 z-[101] shadow-2xl text-left max-h-[85vh] overflow-y-auto custom-scrollbar"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-brand-uplift/25 pb-3.5">
              <div className="flex flex-col">
                <h3 className="font-sans font-black text-base text-white uppercase tracking-wider">Menu Navigasi</h3>
                <span className="text-[8px] font-mono font-bold text-brand-gold tracking-widest uppercase">Rumah Adiksi Pelabuhanratu</span>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-brand-gold hover:text-white transition-all cursor-pointer active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {menuItems.map((item) => {
                if (item.requiresAuth && !currentUser) return null;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className="relative flex flex-col items-center justify-center gap-2 p-3.5 bg-brand-uplift/20 rounded-2xl border border-brand-uplift/35 hover:bg-brand-accent/20 hover:border-brand-accent/40 hover:text-brand-gold transition-all duration-200 text-gray-200 cursor-pointer active:scale-95"
                  >
                    {unreads?.[item.id] && (
                      <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 border border-brand-house rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]" />
                    )}
                    <item.icon className="w-4.5 h-4.5 text-brand-gold" />
                    <span className="text-[10px] sm:text-[11px] font-bold font-sans uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-brand-uplift/25">
              {currentUser ? (
                <button
                  onClick={() => { handleLogout(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  onClick={() => { onOpenAuthModal?.(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-accent hover:bg-brand-green text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk / Daftar Akun</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
