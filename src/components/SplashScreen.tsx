import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-brand-charcoal text-white"
      style={{ zIndex: isExiting ? -1 : 100 }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      pointerEvents={isExiting ? 'none' : 'auto'}
    >
      <motion.img
        src="/logo.png"
        alt="Rumah Adiksi Logo"
        className="w-40 h-40"
        animate={{ scale: [0.95, 1.05, 1] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <div className="mt-4 text-center">
        <h1 className="text-3xl font-serif font-black tracking-tight text-white">Rumah Adiksi</h1>
        <p className="text-sm text-gray-400 mt-1">Inkubator Talenta Kreatif Pesisir Pelabuhan Ratu</p>
      </div>
    </motion.div>
  );
}
