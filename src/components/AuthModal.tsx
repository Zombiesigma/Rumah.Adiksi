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
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowLeft,
  Coffee,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
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
  onAnonymousLogin,
}: AuthModalProps) {
  const [currentView, setCurrentView] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [direction, setDirection] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          photoURL: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`,
        });

        const isDefaultAdmin = email.toLowerCase() === 'gunturfadilah140@gmail.com';
        const assignedRole = isDefaultAdmin ? 'admin' : 'user';

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName.trim(),
          photoURL: user.photoURL || '',
          role: assignedRole,
          createdAt: new Date().toISOString(),
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
          userFriendlyMessage =
            'Metode Email/Sandi belum diaktifkan di Firebase Console Anda.\n\nCara mengaktifkan:\n1. Buka Firebase Console proyek Anda.\n2. Klik menu "Authentication" > tab "Sign-in method".\n3. Klik "Add new provider" / pilih "Email/Password".\n4. Aktifkan (Enable) lalu klik "Save" / "Simpan".';
          break;
        case 'auth/network-request-failed':
          userFriendlyMessage =
            'Koneksi Otentikasi Terblokir (auth/network-request-failed).\n\nHal ini biasanya disebabkan oleh:\n1. Adblocker (uBlock, AdBlock, dll) atau Brave Shields aktif dan memblokir domain auth Google.\n2. Pembatasan lingkungan sandbox Iframe pada editor.\n\nHari ini, kami SANGAT menyarankan Anda:\n- Klik ikon "Buka di tab baru" di kanan atas pratinjau untuk menjalankan aplikasi di luar iframe.\n- Nonaktifkan sementara adblocker Anda untuk situs pratinjau ini.';
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
      x: dir * 80,
      y: 10,
      opacity: 0,
      scale: 0.96,
      filter: 'blur(2px)',
    }),
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 28 },
        y: { duration: 0.25 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.25 },
        filter: { duration: 0.15 },
      },
    },
    exit: (dir: number) => ({
      x: -dir * 80,
      y: -10,
      opacity: 0,
      scale: 0.96,
      filter: 'blur(2px)',
      transition: {
        x: { duration: 0.2 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      },
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <motion.div
        layout
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white rounded-[2.5rem] overflow-hidden shadow-[0_35px_70px_rgba(0,0,0,0.25)] max-w-md lg:max-w-2xl w-full"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm border border-white/20 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
          {/* Left Panel – Brand Identity */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1E3932] via-[#2a5246] to-[#1E3932] p-8 lg:p-10 flex flex-col items-center justify-center text-white">
            {/* Ambient glow */}
            <div className="absolute top-10 right-10 w-32 h-32 bg-brand-gold/15 rounded-full filter blur-[40px]" />
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-amber-500/10 rounded-full filter blur-[40px]" />

            <div className="relative flex flex-col items-center gap-4 text-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="p-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
              >
                <Coffee size={42} className="text-brand-gold drop-shadow-lg" />
              </motion.div>

              <h2 className="font-serif text-2xl lg:text-3xl font-black tracking-tight">
                Rumah Adiksi
              </h2>
              <p className="text-brand-gold/90 font-serif italic text-sm">
                "Blooming with Flows"
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-brand-gold/30 mt-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-gold">
                  Ekosistem Kreatif Pesisir
                </span>
              </div>
              <p className="text-xs text-white/70 max-w-[200px] leading-relaxed mt-2">
                Kopi • Seni • Komunitas <br /> Pelabuhan Ratu, Sukabumi
              </p>
            </div>
          </div>

          {/* Right Panel – Forms */}
          <div className="p-6 lg:p-8 flex flex-col space-y-5 bg-white">
            {/* Tab Switch */}
            {currentView !== 'guest' && (
              <div className="grid grid-cols-2 p-1 bg-[#1E3932]/5 rounded-2xl border border-[#1E3932]/10">
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
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
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
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  Daftar
                </button>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ x: -8, opacity: 0 }}
                  animate={{ x: [0, -8, 8, -6, 6, 0], opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs leading-relaxed font-medium whitespace-pre-line flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Container with Fancy Transition */}
            <div className="relative overflow-hidden min-h-[200px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentView}
                  custom={direction}
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full"
                >
                  {/* Sign In Form */}
                  {currentView === 'signin' && (
                    <form onSubmit={handleEmailAction} className="space-y-4">
                      <div className="space-y-1.5 group">
                        <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block group-focus-within:text-[#1E3932]">
                          Akses Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
                          <input
                            type="email"
                            required
                            placeholder="alamat@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 group">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block group-focus-within:text-[#1E3932]">
                            Kata Sandi
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[9px] font-mono font-extrabold text-brand-gold hover:text-[#1E3932] transition-colors"
                          >
                            {showPassword ? 'HIDE' : 'SHOW'}
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Min. 6 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:brightness-110 active:scale-[0.98] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-[#1E3932] font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-gold/20"
                      >
                        {loading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#1E3932] border-t-transparent rounded-full animate-spin" />
                            Otentikasi...
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4 stroke-[2.5px]" />
                            Masuk Sekarang
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Sign Up Form */}
                  {currentView === 'signup' && (
                    <form onSubmit={handleEmailAction} className="space-y-4">
                      <div className="space-y-1.5 group">
                        <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block group-focus-within:text-[#1E3932]">
                          Nama Lengkap
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Rian Citepus"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 group">
                        <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block group-focus-within:text-[#1E3932]">
                          Akses Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
                          <input
                            type="email"
                            required
                            placeholder="alamat@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 group">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block group-focus-within:text-[#1E3932]">
                            Kata Sandi
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[9px] font-mono font-extrabold text-brand-gold hover:text-[#1E3932] transition-colors"
                          >
                            {showPassword ? 'HIDE' : 'SHOW'}
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Min. 6 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:brightness-110 active:scale-[0.98] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-[#1E3932] font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-gold/20"
                      >
                        {loading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#1E3932] border-t-transparent rounded-full animate-spin" />
                            Mendaftar...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[2.5px]" />
                            Daftarkan Akun
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Guest Flow */}
                  {currentView === 'guest' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5 group">
                        <label className="text-[9px] font-mono font-extrabold text-gray-500 uppercase tracking-widest block group-focus-within:text-[#1E3932]">
                          Nama Samaran Tamu
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-gold transition-colors" />
                          <input
                            type="text"
                            placeholder="Masukkan nama pantai Anda..."
                            value={tempNickname}
                            onChange={(e) => setTempNickname(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
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
                        className="w-full py-3.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:scale-100 text-[#1E3932] font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-gold/20"
                      >
                        {loading ? 'Menghubungkan...' : 'Masuk sebagai Tamu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('signin')}
                        className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-gray-600 hover:text-[#1E3932] text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Kembali ke Login Email
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Social Auth Section (only for email-based views) */}
            {currentView !== 'guest' && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-gray-200" />
                  <span className="relative px-4 bg-white text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                    Atau Hubungkan Lewat
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onGoogleLogin();
                        onClose();
                      } catch (e) {}
                    }}
                    className="py-3 px-3 bg-gray-50 hover:bg-gray-100 active:scale-[0.97] text-xs font-bold text-gray-700 border border-gray-200 rounded-2xl flex items-center justify-center gap-2 transition-all hover:border-brand-gold/40"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/iframe/google.svg"
                      alt="Google"
                      className="w-3.5 h-3.5"
                    />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('guest')}
                    className="py-3 px-3 bg-gray-50 hover:bg-gray-100 active:scale-[0.97] text-xs font-bold text-gray-700 border border-gray-200 rounded-2xl flex items-center justify-center gap-2 transition-all hover:border-brand-gold/40"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-brand-gold" />
                    Tamu Samaran
                  </button>
                </div>
              </div>
            )}

            {/* Terms */}
            <p className="text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-100 pt-4">
              Harap bijak. Dengan masuk Anda menyetujui kedaulatan komunitas dan program digitalisasi Rumah Adiksi Pelabuhan Ratu.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
