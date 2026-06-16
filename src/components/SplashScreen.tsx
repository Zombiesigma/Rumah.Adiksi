import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';

export default function SplashScreen() {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), 1500); // sedikit lebih lama agar terasa mantap
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#1E3932] text-white"
      style={{ zIndex: isExiting ? -1 : 100 }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      pointerEvents={isExiting ? 'none' : 'auto'}
    >
      <motion.div
        className="relative flex flex-col items-center gap-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Lingkaran dekoratif ala kopi */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-10 rounded-full border border-white/10"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-16 rounded-full border border-brand-gold/20"
        />

        {/* Logo */}
        <div className="relative">
          <motion.img
            src="/logo.png"
            alt="Rumah Adiksi Logo"
            className="w-24 h-24 rounded-full shadow-2xl border-2 border-brand-gold/30"
            animate={{ scale: [0.95, 1.05, 1] }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-1 -right-1 bg-brand-accent text-white p-1.5 rounded-full shadow-lg"
          >
            <Coffee size={18} strokeWidth={2.5} />
          </motion.div>
        </div>

        {/* Teks */}
        <div className="text-center space-y-2">
          <h1 className="font-sans text-3xl font-black tracking-widest text-white uppercase">
            Rumah Adiksi
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-brand-gold/50" />
            <span className="text-brand-gold font-serif text-sm italic">
              "Blooming with Flows"
            </span>
            <span className="h-px w-8 bg-brand-gold/50" />
          </div>
          <p className="text-gray-400 text-xs font-medium tracking-[0.3em] uppercase">
            Kopi • Seni • Komunitas
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex gap-2">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 rounded-full bg-brand-gold"
          />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            className="w-2 h-2 rounded-full bg-brand-accent"
          />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            className="w-2 h-2 rounded-full bg-white"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
