import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Scroll, Users, Info, LogIn, LogOut, X, Film, Award, MessageCircle } from 'lucide-react';

interface MenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  currentUser: any; // Firebase user
  userRole?: 'user' | 'admin' | null;
  handleLogout: () => void;
  onOpenAuthModal?: () => void;
}

export default function MenuSheet({ isOpen, onClose, setActiveTab, currentUser, userRole, handleLogout, onOpenAuthModal }: MenuSheetProps) {
  const menuItems = [
    { id: 'profile', label: 'Profil Saya', icon: User, requiresAuth: true },
    { id: 'chat', label: 'Ruang Chat', icon: MessageCircle, requiresAuth: false },
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
            className="relative w-full max-w-lg bg-brand-charcoal border-t border-white/10 rounded-t-2xl p-6 space-y-4 z-[101]"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="font-serif font-bold text-xl text-white">Menu Navigasi</h3>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {menuItems.map((item) => {
                if (item.requiresAuth && !currentUser) return null;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:bg-brand-gold/10 hover:text-brand-gold transition-colors text-gray-300"
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/10">
              {currentUser ? (
                <button
                  onClick={() => { handleLogout(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 text-rose-400 rounded-xl font-bold text-sm"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Keluar</span>
                </button>
              ) : (
                <button
                  onClick={() => { onOpenAuthModal?.(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-gold/15 text-brand-gold rounded-xl font-bold text-sm"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Masuk / Daftar</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
