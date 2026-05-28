/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Star,
  Coffee,
  CheckCircle,
  ShoppingBagIcon,
  Tag,
  ArrowLeft,
  MessageSquare,
  Send,
  Clock,
  BookOpen,
  ChevronRight,
  User,
  Heart,
  ThumbsUp,
  Award,
  Lock
} from 'lucide-react';
import { ShopItem, ShopItemReview } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getFallbackJourney, COFFEE_JOURNEYS } from '../lib/coffeeStories';

interface ShopSectionProps {
  items: ShopItem[];
  addToCart: (item: ShopItem, qty?: number) => void;
  currentUser?: FirebaseUser | null;
  addNotification?: (msg: string) => void;
  openAuthModal?: () => void;
  setActiveTab?: (tab: string) => void;
  cartCount?: number;
}

type ShopCategory = 'all' | 'coffee' | 'matcha' | 'tea' | 'merchandise';

export default function ShopSection({ items, addToCart, currentUser, addNotification, openAuthModal, setActiveTab, cartCount }: ShopSectionProps) {
  const cleanedItems = items.map(item => ({
    ...item,
    price: item.price ?? 0,
    rating: item.rating ?? 0,
    stock: item.stock ?? 0,
    reviews: item.reviews ?? [],
    description: item.description ?? 'No description available.',
    name: item.name ?? 'Unnamed Product',
  }));

  const [activeCategory, setActiveCategory] = useState<ShopCategory>('all');
  const [successAdd, setSuccessAdd] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = cleanedItems.find((item) => item.id === selectedItemId) || null;

  const [reviewScore, setReviewScore] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [hoverStarScore, setHoverStarScore] = useState<number | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});

  const filteredItems = cleanedItems.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'coffee':
        return <span className="font-semibold text-[10px] text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">Kopi</span>;
      case 'matcha':
        return <span className="font-semibold text-[10px] text-emerald-500 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Matcha</span>;
      case 'tea':
        return <span className="font-semibold text-[10px] text-teal-400 uppercase tracking-widest bg-teal-400/10 border border-teal-400/20 px-2 py-0.5 rounded">Teh</span>;
      case 'merchandise':
        return <span className="font-semibold text-[10px] text-brand-gold uppercase tracking-widest bg-brand-gold/10 border border-brand-gold/20 px-2 py-0.5 rounded">Eksklusif Merch</span>;
      default:
        return null;
    }
  };

  const handleAddToCart = (item: ShopItem) => {
    if (!currentUser) {
      if (addNotification) {
        addNotification("Akses Terbatas: Silakan masuk terlebih dahulu untuk memesan.");
      }
      if (openAuthModal) {
        openAuthModal();
      }
      return;
    }
    addToCart(item, 1);
    setSuccessAdd(item.id);
    setTimeout(() => {
      setSuccessAdd(null);
    }, 2500);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Baru saja';
    try {
      const past = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    } catch (e) {
      return 'Baru saja';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedItem || !reviewBody.trim()) {
      if (!currentUser && addNotification && openAuthModal) {
        addNotification("Silakan masuk untuk mengirimkan ulasan Anda.");
        openAuthModal();
      }
      return;
    }

    setIsSubmittingReview(true);
    const resolvedName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Kreator Pesisir';

    try {
      const newReview: ShopItemReview = {
        id: `rev-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        authorName: resolvedName,
        rating: reviewScore,
        comment: reviewBody.trim(),
        timestamp: new Date().toISOString()
      };

      const existingReviews = selectedItem.reviews || [];
      const updatedReviews = [newReview, ...existingReviews];
      const totalRating = updatedReviews.reduce((sum, rev) => sum + rev.rating, 0);
      const newAvgRating = parseFloat((totalRating / updatedReviews.length).toFixed(1));

      const updatedItem: ShopItem = {
        ...selectedItem,
        rating: newAvgRating,
        reviews: updatedReviews
      };

      await setDoc(doc(db, 'shopItems', selectedItem.id), updatedItem);

      setReviewBody('');
      setReviewScore(5);
      if (addNotification) {
        addNotification(`Ulasan Anda untuk "${selectedItem.name}" berhasil dipublikasikan.`);
      }
    } catch (error) {
      console.error('Failed submitting review to Firestore:', error);
      addNotification('Gagal mengirim ulasan. Silakan coba lagi.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'KP';
  };

  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-amber-600', 'bg-emerald-600', 'bg-teal-600', 'bg-brand-gold/70', 
      'bg-indigo-600', 'bg-violet-600', 'bg-rose-500', 'bg-slate-700'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const toggleReviewLike = (revId: string) => {
    if (!currentUser) {
      if (addNotification) addNotification("Anda harus masuk untuk menyukai ulasan.");
      if (openAuthModal) openAuthModal();
      return;
    }
    setLikedReviews(prev => ({
      ...prev,
      [revId]: !prev[revId]
    }));
  };

  if (selectedItem) {
    const journey = getFallbackJourney(selectedItem.id, selectedItem.category, selectedItem.name, selectedItem.description);
    const reviewsList = selectedItem.reviews || [];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -15 }}
        className="space-y-10 py-6 text-white max-w-5xl mx-auto"
        id="shop-item-fullpage-detail"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <button
            onClick={() => setSelectedItemId(null)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-white/5 hover:border-brand-gold/20 text-gray-300 hover:text-brand-gold text-xs font-bold rounded-xl transition cursor-pointer"
          >
            ← Kembali ke Menu Belanja
          </button>
          
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-widest">
            Detail Produk Real-time
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-6">
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl group aspect-square flex items-center justify-center">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute top-4 left-4 z-10">
                {getCategoryIcon(selectedItem.category)}
              </div>
            </div>

            <div className="p-5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-brand-gold">
                <Coffee className="w-4 h-4" /> Karakteristik & Cita Rasa
              </div>
              <div className="flex flex-wrap gap-1.5">
                {journey.notes.map((note, index) => (
                  <span 
                    key={index} 
                    className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-semibold text-gray-300 tracking-wide"
                  >
                    {note}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-gray-500 leading-relaxed font-sans border-t border-white/5 pt-3 mt-1">
                <span className="font-bold text-gray-400 block mb-0.5">Asal Geografis:</span>
                {journey.origin} {journey.elevation ? `(${journey.elevation})` : ''}
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-6 bg-brand-card/30 p-6 sm:p-8 rounded-2xl border border-white/5 shadow-inner">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-brand-gold text-xs font-mono">
                <Star className="w-4 h-4 text-brand-gold fill-current" /> 
                <span className="font-bold text-neutral-100">{selectedItem.rating.toFixed(1)}</span> 
                <span>/ 5.0 ({reviewsList.length} Ulasan)</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-black leading-tight text-white tracking-tight">
                {selectedItem.name}
              </h1>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-1.5">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Deskripsi Produk</span>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                {selectedItem.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-mono block">Harga</span>
                <span className="text-xl sm:text-2xl font-serif font-black text-brand-gold">{formatRupiah(selectedItem.price)}</span>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 uppercase font-mono block">Ketersediaan</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedItem.stock > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <span className={`text-xs font-bold font-mono block ${selectedItem.stock < 10 ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`}>
                    {selectedItem.stock > 0 ? `${selectedItem.stock} item tersedia` : 'Habis Terjual'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <button
                onClick={() => handleAddToCart(selectedItem)}
                disabled={selectedItem.stock === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs uppercase tracking-widest font-black transition cursor-pointer transform active:scale-[0.98] disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {successAdd === selectedItem.id ? (
                  <><CheckCircle className="w-4 h-4" /> Ditambahkan!</>
                ) : (
                  <><ShoppingBag className="w-4 h-4" /> Masukkan Keranjang</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/40 p-6 sm:p-10 rounded-2xl border border-white/5 space-y-8" id="product-artisan-journey">
          <div className="space-y-1.5 border-b border-white/5 pb-4">
            <span className="text-[10px] text-brand-gold uppercase tracking-widest font-mono">Cerita Produk</span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-white mb-2">
            🧭 Perjalanan Produk Kreatif Kami
            </h2>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">
            {selectedItem.journeyStory ? 'Cerita otentik tentang proses, inspirasi, dan filosofi dari para seniman lokal kami.' : 'Kami mengajak Anda menelusuri perjalanan biji kopi dari dataran tinggi Sukabumi hingga menjadi secangkir kehangatan di tangan Anda.'}
            </p>
          </div>

          {selectedItem.journeyStory ? (
            <div className="bg-slate-950/60 p-6 sm:p-8 rounded-2xl border border-brand-gold/15 space-y-6 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-brand-gold/15 border border-brand-gold/20 text-[9px] uppercase font-mono tracking-wider text-brand-gold font-bold">
                    Catatan Kreator
                  </span>
                </div>
                <p className="text-sm sm:text-base text-gray-200 font-serif leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-brand-gold/50">
                  {selectedItem.journeyStory}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-2">
              <div className="md:col-span-4 space-y-4">
                <div className="p-5 bg-brand-charcoal/40 rounded-xl border border-brand-gold/10 text-xs leading-relaxed space-y-3">
                  <p className="font-serif font-semibold text-white/90 text-sm">"{journey.title}"</p>
                  <p className="text-gray-400 italic">{journey.subtitle}</p>
                  <div className="h-px bg-white/5 my-2" />
                  <p className="text-gray-500 text-[11px]">*Setiap pembelian produk ini turut mendukung program seni gratis untuk anak-anak pesisir di Rumah Adiksi.</p>
                </div>
              </div>
              <div className="md:col-span-8 pl-4 space-y-8 relative border-l border-white/5">
                {journey.steps.map((step, idx) => (
                  <div key={idx} className="relative pl-6 group">
                    <div className="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-brand-gold flex items-center justify-center text-[10px] shadow-md group-hover:scale-110 group-hover:bg-brand-gold group-hover:text-black transition-all">{step.icon}</div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold text-white group-hover:text-brand-gold transition-colors">Langkah {idx + 1}: {step.title}</h4>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="product-realtime-reviews">
          <div className="lg:col-span-5 bg-slate-900/10 p-6 rounded-2xl border border-white/5 space-y-5 h-fit">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-gold uppercase tracking-wider font-mono block">Bagikan Pengalaman Anda</span>
              <h3 className="font-serif text-lg font-bold text-white">Beri Ulasan & Rating</h3>
            </div>

            {currentUser ? (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-gold text-brand-charcoal flex items-center justify-center font-bold text-[10px]">{getInitials(currentUser.displayName || "A")}</div>
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 block uppercase">Anda masuk sebagai</span>
                    <span className="text-xs text-gray-200 font-bold block">{currentUser.displayName || "Kreator Sukabumi"}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-mono block">Rating Anda</label>
                  <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-xl border border-white/5 w-fit">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setReviewScore(star)} onMouseEnter={() => setHoverStarScore(star)} onMouseLeave={() => setHoverStarScore(null)} className="p-1 hover:scale-110 transition cursor-pointer focus:outline-none">
                        <Star className={`w-6 h-6 transition-colors ${star <= (hoverStarScore ?? reviewScore) ? "text-brand-gold fill-brand-gold filter drop-shadow-[0_0_2px_rgba(234,179,8,0.3)]" : "text-gray-700 hover:text-gray-500"}`} />
                      </button>
                    ))}
                    <span className="text-xs font-mono font-bold text-gray-300 ml-2">{reviewScore}.0</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-mono block">Ulasan Anda</label>
                  <textarea required rows={4} className="w-full bg-slate-950/80 rounded-xl border border-white/5 p-4 text-xs text-white focus:outline-none focus:border-brand-gold/50 font-sans leading-relaxed placeholder-gray-600 focus:ring-1 focus:ring-brand-gold/20" placeholder="Bagikan pengalaman Anda tentang produk ini..." value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} />
                </div>
                <button type="submit" disabled={isSubmittingReview || !reviewBody.trim()} className="w-full bg-white text-brand-charcoal hover:bg-brand-gold transition duration-200 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">
                  {isSubmittingReview ? <><Clock className="w-3.5 h-3.5 animate-spin" /> Mengirim...</> : <><Send className="w-3.5 h-3.5" /> Kirim Ulasan</>}
                </button>
              </form>
            ) : (
              <div className="bg-slate-950/30 border border-dashed border-white/10 p-6 rounded-2xl text-center space-y-3">
                <Lock className="w-6 h-6 mx-auto text-gray-600"/>
                <p className="text-xs font-bold text-gray-300">Akses Terbatas</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">Anda harus masuk atau mendaftar terlebih dahulu untuk dapat memberikan ulasan pada produk ini.</p>
                <button onClick={() => openAuthModal && openAuthModal()} className="mt-2 px-4 py-2 bg-brand-gold text-brand-charcoal font-bold text-xs rounded-lg hover:bg-white transition-colors">
                  Masuk atau Daftar
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-brand-gold" /> Ulasan Komunitas</h3>
              <div className="text-[10px] font-mono text-gray-500">Total {reviewsList.length} ulasan</div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {reviewsList.length === 0 ? (
                <div className="py-12 border border-dashed border-white/5 bg-slate-950/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <Star className="w-8 h-8 text-gray-700 animate-pulse" />
                  <span className="text-xs text-gray-500 font-bold block">Belum Ada Ulasan</span>
                  <p className="text-[11px] text-gray-600 max-w-xs font-sans leading-relaxed">Jadilah yang pertama memberikan ulasan untuk produk ini dan bantu komunitas menentukan pilihan.</p>
                </div>
              ) : (
                reviewsList.map((rev) => {
                  const initials = getInitials(rev.authorName);
                  const avatarBg = getAvatarBg(rev.authorName);
                  const isLiked = likedReviews[rev.id] || false;

                  return (
                    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card/25 border border-white/5 p-4 rounded-xl space-y-3 hover:border-white/10 transition-colors" key={rev.id} id={`review-card-${rev.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-inner`}>{initials}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-sans">{rev.authorName}</span>
                              <span className="text-[9px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded-full font-semibold font-mono tracking-wide scale-90 uppercase">Pembeli Terverifikasi</span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? 'text-brand-gold fill-brand-gold' : 'text-gray-700'}`} />))}
                              <span className="text-[10px] text-gray-400 font-mono font-bold ml-1">{rev.rating}.0</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 font-mono text-[9px] text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-600" /> {formatTimeAgo(rev.timestamp)}</span>
                        </div>
                      </div>
                      <div className="pl-12">
                        <p className="text-xs text-gray-300 font-sans leading-relaxed whitespace-pre-wrap">{rev.comment}</p>
                      </div>
                      <div className="pl-12 flex items-center justify-between border-t border-white/5 pt-2 mt-2">
                        <button onClick={() => toggleReviewLike(rev.id)} className={`flex items-center gap-1 text-[10px] font-mono transition cursor-pointer ${isLiked ? 'text-brand-gold font-bold scale-105' : 'text-gray-500 hover:text-gray-300'}`}>
                          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                          {isLiked ? 'Bermanfaat' : 'Bantu Upvote'} ({isLiked ? '1' : '0'})
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-white/5 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-44 h-44 bg-brand-gold/5 rounded-full filter blur-xl" />
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-gold/10 border border-brand-gold/20 rounded-full text-[10px] font-mono text-brand-gold uppercase"><Coffee className="w-3.5 h-3.5" /> Kafe & Toko Merchandise Rumah Adiksi</span>
          <h2 className="font-serif text-3xl font-bold text-white tracking-tight leading-none">Satu Atap untuk Kopi, Karya, dan Komunitas</h2>
          <p className="text-xs text-gray-400 leading-relaxed">Menyatukan cita rasa kopi khas Jampang, Sukabumi dengan merchandise eksklusif hasil karya para seniman muda kami. Setiap pembelian Anda adalah dukungan nyata bagi pertumbuhan kreativitas di Pelabuhan Ratu.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
            {[
              { id: 'all', label: 'Semua Produk' },
              { id: 'coffee', label: 'Kopi Nusantara' },
              { id: 'matcha', label: 'Seri Matcha' },
              { id: 'tea', label: 'Teh Spesialti' },
              { id: 'merchandise', label: 'Merchandise Komunitas' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as ShopCategory)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  activeCategory === cat.id
                    ? 'bg-brand-gold text-brand-charcoal font-bold shadow-md shadow-brand-gold/10'
                    : 'text-gray-400 hover:text-white bg-slate-950 border border-white/5 hover:border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab('cart')}
              className="px-4 py-2 bg-brand-gold hover:bg-amber-500 font-bold text-xs text-brand-charcoal rounded-xl flex items-center justify-center gap-2 transition duration-300 shadow-xl shadow-brand-gold/15 active:scale-95 cursor-pointer select-none self-center sm:self-auto"
              title="Akses Keranjang Belanja Anda"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                {cartCount !== undefined && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-[8px] text-white px-1 leading-none rounded-full min-w-3.5 h-3.5 flex items-center justify-center font-black animate-bounce">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Keranjang Belanja ({cartCount || 0})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="shop-products-grid">
          {filteredItems.map((product) => (
            <div
              key={product.id}
              className="group bg-slate-900/40 rounded-2xl border border-white/5 hover:border-brand-gold/25 overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-xl"
            >
              <div 
                className="relative aspect-square bg-slate-950 overflow-hidden cursor-pointer"
                onClick={() => setSelectedItemId(product.id)}
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                
                <div className="absolute top-3 left-3 z-10">{getCategoryIcon(product.category)}</div>
                
                {product.stock < 5 && (
                  <div className="absolute bottom-3 left-3 z-10 px-2 py-0.5 bg-rose-600 border border-rose-500 text-white font-mono text-[9px] font-bold uppercase rounded-lg shadow-md animate-pulse">
                    Stok Menipis
                  </div>
                )}

                <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded-lg border border-white/10 text-[10px] font-mono text-brand-gold"><Star className="w-3 h-3 text-brand-gold fill-current" /> {product.rating.toFixed(1)}</div>
              </div>

              <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                <div className="space-y-1 cursor-pointer" onClick={() => setSelectedItemId(product.id)}>
                  <h3 className="font-serif text-sm font-bold text-white group-hover:text-brand-gold transition-colors line-clamp-2">{product.name}</h3>
                  <p className="text-[11px] text-gray-500 leading-normal line-clamp-2">{product.description}</p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase font-mono block">Harga</span>
                      <span className="text-sm font-bold text-white">{formatRupiah(product.price)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 uppercase font-mono block">Stok</span>
                      <span className={`text-[10px] font-semibold font-mono ${product.stock < 5 ? 'text-rose-500 animate-pulse font-black' : product.stock < 10 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {product.stock < 5 ? 'Hampir Habis (' : ''}{product.stock} pcs{product.stock < 5 ? ')' : ' tersedia'}
                      </span>
                    </div>
                  </div>

                  <button onClick={() => handleAddToCart(product)} className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${successAdd === product.id ? 'bg-emerald-600 text-white shadow-emerald-900/10' : 'bg-white/5 group-hover:bg-brand-gold text-white group-hover:text-brand-charcoal'}`}>
                    {successAdd === product.id ? <><CheckCircle className="w-3.5 h-3.5" /> Ditambahkan!</> : <><ShoppingBag className="w-3.5 h-3.5" /> Masukkan Keranjang</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
