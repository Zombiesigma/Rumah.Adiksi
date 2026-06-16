/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  LogIn, 
  Check, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ArrowLeft,
  Coffee
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onGoogleLogin: () => Promise<void>;
  onAnonymousLogin: (nickname: string) => Promise<void>;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onGoogleLogin, 
  onAnonymousLogin 
}: AuthModalProps) {
  const [currentView, setCurrentView] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [direction, setDirection] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Guest nickname flow
  const [tempNickname, setTempNickname] = useState('');

  if (!isOpen) return null;

  const navigateTo = (view: 'signin' | 'signup' | 'guest') => {
    const viewOrder = { signin: 0, signup: 1, guest: 2 };
    const currentOrder = viewOrder[currentView];
    const targetOrder = viewOrder[view];
    setDirection(targetOrder > currentOrder ? 1 : -1);
    setCurrentView(view);
    setErrorMsg('');
  };

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Silakan lengkapi semua bidang.');
      return;
    }
    if (currentView === 'signup' && !displayName) {
      setErrorMsg('Nama lengkap wajib diisi untuk pendaftaran.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Sandi harus berukuran minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (currentView === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, {
          displayName: displayName.trim(),
          photoURL: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`
        });

        const isDefaultAdmin = email.toLowerCase() === 'gunturfadilah140@gmail.com';
        const assignedRole = isDefaultAdmin ? 'admin' : 'user';

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName.trim(),
          photoURL: user.photoURL || '',
          role: assignedRole,
          createdAt: new Date().toISOString()
        });

        onSuccess(`Akun berhasil dibuat! Selamat bergabung, ${displayName.trim()}.`);
        onClose();
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onSuccess(`Selamat datang kembali, ${user.displayName || 'Kreator Pesisir'}!`);
        onClose();
      }
    } catch (error: any) {
      console.warn('Firebase Auth Operation Message: ', error?.message || error);
      let userFriendlyMessage = 'Terjadi kesalahan. Silakan periksa kembali data Anda.';
      
      switch (error?.code) {
        case 'auth/email-already-in-use':
          userFriendlyMessage = 'Email ini sudah terdaftar. Silakan masuk.';
          break;
        case 'auth/invalid-email':
          userFriendlyMessage = 'Format alamat email tidak valid.';
          break;
        case 'auth/weak-password':
          userFriendlyMessage = 'Sandi terlalu lemah (minimal 6 karakter).';
          break;
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          userFriendlyMessage = 'Email atau sandi salah. Silakan coba lagi.';
          break;
        case 'auth/operation-not-allowed':
          userFriendlyMessage = 'Metode Email/Sandi belum diaktifkan di Firebase Console Anda.\n\nCara mengaktifkan:\n1. Buka Firebase Console proyek Anda.\n2. Klik menu "Authentication" > tab "Sign-in method".\n3. Klik "Add new provider" / pilih "Email/Password".\n4. Aktifkan (Enable) lalu klik "Save" / "Simpan".';
          break;
        case 'auth/network-request-failed':
          userFriendlyMessage = 'Koneksi Otentikasi Terblokir (auth/network-request-failed).\n\nHal ini biasanya disebabkan oleh:\n1. Adblocker (uBlock, AdBlock, dll) atau Brave Shields aktif dan memblokir domain auth Google.\n2. Pembatasan lingkungan sandbox Iframe pada editor.\n\nHari ini, kami SANGAT menyarankan Anda:\n- Klik ikon "Buka di tab baru" di kanan atas pratinjau untuk menjalankan aplikasi di luar iframe.\n- Nonaktifkan sementara adblocker Anda untuk situs pratinjau ini.';
          break;
        default:
          if (error?.message) {
            userFriendlyMessage = error.message;
          }
          break;
      }
      setErrorMsg(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    enter: (dir: number) => ({
      x: dir * 60,
      opacity: 0,
      scale: 0.97
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 28 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      x: -dir * 60,
      opacity: 0,
      scale: 0.97,
      transition: {
        x: { duration: 0.2 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 }
      }
    })
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <motion.div
        layout
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-white border border-brand-gold/20 rounded-[2.5rem] p-7 md:p-9 max-w-md w-full space-y-6 shadow-[0_25px_60px_rgba(0,0,0,0.2)] relative overflow-hidden"
      >
        {/* Ambient premium glowing background decorations */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-gold/10 rounded-full filter blur-[45px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#1E3932]/5 rounded-full filter blur-[45px] pointer-events-none" />
        
        {/* Header dengan gradien ala Starbucks */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-br from-[#1E3932] via-[#2a5246] to-[#1E3932] rounded-t-[2.5rem]" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer backdrop-blur-sm border border-white/20 active:scale-95 z-10"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header dengan Ikon Kopi */}
        <div className="relative text-center space-y-3 pt-8 z-10">
          <div className="flex justify-center mb-2">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-brand-gold/30">
              <Coffee size={28} className="text-brand-gold drop-shadow-lg" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-brand-gold text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1E3932]/10 border border-brand-gold/20 px-3.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
            <span>EKOSISTEM KREATIF PESISIR</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-serif font-black text-[#1E3932] tracking-tight leading-none">
            {currentView === 'signin' ? 'Selamat Datang' : currentView === 'signup' ? 'Gabung Komunitas' : 'Akses Tamu'}
          </h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            {currentView === 'guest' 
              ? 'Mulai menjelajahi forum kriya seni pesisir secara instan'
              : 'Terhubunglah dengan Rumah Adiksi Pelabuhan Ratu, Sukabumi'
            }
          </p>
        </div>

        {/* Tab Selection Switch (Sliding Background Pill) */}
        {currentView !== 'guest' && (
          <div className="grid grid-cols-2 p-1 bg-[#1E3932]/5 rounded-2xl border border-[#1E3932]/10 relative">
            <button
              type="button"
              onClick={() => navigateTo('signin')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative z-10 cursor-pointer ${
                currentView === 'signin' ? 'text-white' : 'text-gray-500 hover:text-[#1E3932]'
              }`}
            >
              {currentView === 'signin' && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-[#1E3932] to-[#2a5246] rounded-xl -z-10 shadow-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              Masuk
            </button>
            <button
              type="button"
              onClick={() => navigateTo('signup')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative z-10 cursor-pointer ${
                currentView === 'signup' ? 'text-white' : 'text-gray-500 hover:text-[#1E3932]'
              }`}
            >
              {currentView === 'signup' && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-[#1E3932] to-[#2a5246] rounded-xl -z-10 shadow-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              Daftar
            </button>
          </div>
        )}

        {/* Form Error Box Container with Shake Animation */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: [0, -8, 8, -6, 6, 0], opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs leading-relaxed text-left font-medium whitespace-pre-line flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Form Pane under AnimatePresence */}
        <div className="relative overflow-hidden min-h-[190px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentView}
              custom={direction}
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full space-y-4 pt-1"
            >
              {currentView === 'signin' && (
                <form onSubmit={handleEmailAction} className="space-y-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#1E3932]">Akses Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors duration-300" />
                      <input
                        type="email"
                        required
                        placeholder="alamat@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#1E3932]">Kata Sandi</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[9px] font-mono font-extrabold text-brand-gold hover:text-[#1E3932] transition-colors cursor-pointer focus:outline-none"
                      >
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors duration-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Min. 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:brightness-110 active:scale-[0.98] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-[#1E3932] font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-gold/20 mt-6"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#1E3932] border-t-transparent rounded-full animate-spin" />
                        Otentikasi Akun...
                      </span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 text-[#1E3932] stroke-[2.5px]" />
                        <span>Masuk Sekarang</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {currentView === 'signup' && (
                <form onSubmit={handleEmailAction} className="space-y-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#1E3932]">Nama Lengkap</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors duration-300" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Rian Citepus"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#1E3932]">Akses Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors duration-300" />
                      <input
                        type="email"
                        required
                        placeholder="alamat@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#1E3932]">Kata Sandi</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[9px] font-mono font-extrabold text-brand-gold hover:text-[#1E3932] transition-colors cursor-pointer focus:outline-none"
                      >
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors duration-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Min. 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:brightness-110 active:scale-[0.98] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-[#1E3932] font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-gold/20 mt-6"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#1E3932] border-t-transparent rounded-full animate-spin" />
                        Pendaftaran...
                      </span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-[#1E3932] stroke-[2.5px]" />
                        <span>Daftarkan Akun Baru</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {currentView === 'guest' && (
                <div className="space-y-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#1E3932]">Nama Samaran Tamu</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors duration-300" />
                      <input
                        type="text"
                        placeholder="Masukkan nama pantai Anda..."
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-300 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tempNickname.trim()) {
                            setLoading(true);
                            onAnonymousLogin(tempNickname)
                              .then(() => onClose())
                              .catch(() => {})
                              .finally(() => setLoading(false));
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (!tempNickname.trim()) return;
                      setLoading(true);
                      onAnonymousLogin(tempNickname)
                        .then(() => onClose())
                        .catch(() => {})
                        .finally(() => setLoading(false));
                    }}
                    disabled={loading || !tempNickname.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:scale-100 text-[#1E3932] font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-brand-gold/20"
                  >
                    {loading ? 'Menghubungkan Sesi...' : 'Masuk sebagai Tamu'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('signin')}
                    className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-center text-gray-600 hover:text-[#1E3932] text-xs cursor-pointer font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Login Email</span>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Social Authentication Footer */}
        {currentView !== 'guest' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-gray-200"></div>
              <span className="relative px-4 bg-white text-[9px] font-mono text-gray-400 uppercase tracking-widest">Atau Hubungkan Lewat</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Google Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onGoogleLogin();
                    onClose();
                  } catch (e) {
                    // Handled inside master Google setup
                  }
                }}
                className="py-3 px-3 bg-gray-50 hover:bg-gray-100 active:scale-[0.97] text-xs font-bold text-gray-700 border border-gray-200 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-brand-gold/40"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/iframe/google.svg" 
                  alt="Google"
                  className="w-3.5 h-3.5"
                />
                <span>Google</span>
              </button>

              {/* Guest Login button */}
              <button
                type="button"
                onClick={() => navigateTo('guest')}
                className="py-3 px-3 bg-gray-50 hover:bg-gray-100 active:scale-[0.97] text-xs font-bold text-gray-700 border border-gray-200 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-brand-gold/40"
              >
                <UserIcon className="w-3.5 h-3.5 text-brand-gold" />
                <span>Tamu Samaran</span>
              </button>
            </div>
          </div>
        )}

        {/* Terms detail footer */}
        <div className="text-[10px] text-gray-400 text-center leading-relaxed font-sans px-2 pt-1 border-t border-gray-100">
          Harap bijak. Dengan masuk Anda menyetujui kedaulatan komunitas dan program digitalisasi Rumah Adiksi Pelabuhan Ratu.
        </div>
      </motion.div>
    </div>
  );
}
