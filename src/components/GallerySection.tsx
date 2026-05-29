/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Eye,
  ShoppingBag,
  Info,
  Layers,
  Image,
  Award,
  Music,
  Camera,
  Paintbrush,
  Lock,
  Share2,
  Check,
  Star,
  MessageSquare,
  Clock,
  User,
  Trash2,
  Plus,
  X,
  Sparkles,
  ShieldAlert,
  Flame,
  Award as AwardIcon
} from 'lucide-react';
import { GalleryItem } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface GallerySectionProps {
  artworks: GalleryItem[];
  setArtworks: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  addToCart: (artwork: GalleryItem) => void;
  onExploreArtist: (artistId: string) => void;
  currentUser?: FirebaseUser | null;
  openAuthModal?: () => void;
  userRole?: 'user' | 'admin' | null;
}

type FilterType = 'all' | 'painting' | 'music' | 'photography' | 'craft';

export default function GallerySection({ 
  artworks, 
  setArtworks, 
  addToCart, 
  onExploreArtist, 
  currentUser, 
  openAuthModal,
  userRole 
}: GallerySectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedArtwork, setSelectedArtwork] = useState<GalleryItem | null>(null);
  const [sortBy, setSortBy] = useState<'terbaru' | 'terpopuler'>('terbaru');
  const [isShared, setIsShared] = useState(false);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  // Rating Submission State
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingError, setRatingError] = useState<string>('');

  // Awards Custom Input State
  const [customAwardText, setCustomAwardText] = useState<string>('');

  // Auto-track views once per session per artwork
  useEffect(() => {
    if (selectedArtwork && !viewedIds.includes(selectedArtwork.id)) {
      setViewedIds((prev) => [...prev, selectedArtwork.id]);
      const artRef = doc(db, 'artworks', selectedArtwork.id);
      updateDoc(artRef, {
        views: (selectedArtwork.views || 0) + 1
      }).catch((err) => console.warn('Gagal menambah hitungan view: ', err));
    }
  }, [selectedArtwork?.id, viewedIds, selectedArtwork]);

  // Handle direct url link sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const artId = params.get('art');
    if (artId && artworks.length > 0) {
      const found = artworks.find((art) => art.id === artId);
      if (found) {
        setSelectedArtwork(found);
      }
    }
  }, [artworks]);

  const handleShare = () => {
    if (!selectedArtwork) return;
    const shareUrl = `${window.location.origin}/?tab=gallery&art=${selectedArtwork.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    }).catch(err => {
      console.error('Gagal menyalin tautan: ', err);
    });
  };

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (openAuthModal) openAuthModal();
      return;
    }

    const art = artworks.find(a => a.id === id);
    if (!art) return;

    const likedByArray = art.likedBy || [];
    const isLiked = likedByArray.includes(currentUser.uid);
    const artRef = doc(db, 'artworks', id);

    try {
      await updateDoc(artRef, {
        likes: isLiked ? Math.max(0, art.likes - 1) : art.likes + 1,
        likedBy: isLiked 
          ? arrayRemove(currentUser.uid) 
          : arrayUnion(currentUser.uid)
      });
    } catch (err) {
      console.error("Gagal memperbarui suka di Firestore:", err);
    }
  };

  const handleAddToCart = (artwork: GalleryItem) => {
    if (!currentUser) {
        if (openAuthModal) openAuthModal();
        return;
    }
    addToCart(artwork);
    setSelectedArtwork(null);
  };

  // Submit Rating & Comments
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedArtwork) return;
    if (!ratingComment.trim()) {
      setRatingError("Silakan tulis komentar apresiasi Anda.");
      return;
    }

    setIsSubmittingRating(true);
    setRatingError('');

    const newRating = {
      id: `rating-${Date.now()}`,
      authorName: currentUser.displayName || 'Apresiator Adiksi',
      authorUid: currentUser.uid,
      score: ratingScore,
      comment: ratingComment.trim(),
      timestamp: new Date().toISOString()
    };

    const artRef = doc(db, 'artworks', selectedArtwork.id);
    const existingRatings = selectedArtwork.ratings || [];

    try {
      await updateDoc(artRef, {
        ratings: [...existingRatings, newRating]
      });
      // Synchronize detailed selection local state
      setSelectedArtwork(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ratings: [...(prev.ratings || []), newRating]
        };
      });
      setRatingComment('');
      setRatingScore(5);
    } catch (err) {
      console.error("Gagal mengirim ulasan:", err);
      setRatingError("Terjadi hambatan koneksi, silakan coba kirim ulang.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Delete comment reviews (Admins only)
  const handleDeleteReview = async (ratingId: string) => {
    if (!currentUser || userRole !== 'admin' || !selectedArtwork) return;

    const artRef = doc(db, 'artworks', selectedArtwork.id);
    const updatedRatings = (selectedArtwork.ratings || []).filter(r => r.id !== ratingId);

    try {
      await updateDoc(artRef, {
        ratings: updatedRatings
      });
      setSelectedArtwork(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ratings: updatedRatings
        };
      });
    } catch (err) {
      console.error("Gagal menghapus ulasan:", err);
    }
  };

  // Toggle award badges (Admins only)
  const handleToggleAward = async (awardName: string) => {
    if (!currentUser || userRole !== 'admin' || !selectedArtwork) return;

    const artRef = doc(db, 'artworks', selectedArtwork.id);
    const existingAwards = selectedArtwork.awards || [];
    const hasAward = existingAwards.includes(awardName);

    const updatedAwards = hasAward
      ? existingAwards.filter(a => a !== awardName)
      : [...existingAwards, awardName];

    try {
      await updateDoc(artRef, {
        awards: updatedAwards
      });
      setSelectedArtwork(prev => {
        if (!prev) return null;
        return {
          ...prev,
          awards: updatedAwards
        };
      });
    } catch (err) {
      console.error("Gagal merubah penghargaan:", err);
    }
  };

  // Add custom curatorial recognition (Admins only)
  const handleAddCustomAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || userRole !== 'admin' || !selectedArtwork || !customAwardText.trim()) return;

    const artRef = doc(db, 'artworks', selectedArtwork.id);
    const existingAwards = selectedArtwork.awards || [];
    const newAward = customAwardText.trim();

    if (existingAwards.includes(newAward)) {
      setCustomAwardText('');
      return;
    }

    const updatedAwards = [...existingAwards, newAward];

    try {
      await updateDoc(artRef, {
        awards: updatedAwards
      });
      setSelectedArtwork(prev => {
        if (!prev) return null;
        return {
          ...prev,
          awards: updatedAwards
        };
      });
      setCustomAwardText('');
    } catch (err) {
      console.error("Gagal menambah penghargaan kustom:", err);
    }
  };

  const getAverageRating = (art: GalleryItem) => {
    if (!art.ratings || art.ratings.length === 0) return 0;
    const sum = art.ratings.reduce((acc, r) => acc + r.score, 0);
    return Math.round((sum / art.ratings.length) * 10) / 10;
  };

  const filteredArtworks = artworks.filter((art) => {
    if (activeFilter === 'all') return true;
    return art.type === activeFilter;
  });

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'painting': return <Paintbrush className="w-3.5 h-3.5" />;
      case 'music': return <Music className="w-3.5 h-3.5" />;
      case 'photography': return <Camera className="w-3.5 h-3.5" />;
      case 'craft': return <Layers className="w-3.5 h-3.5" />;
      default: return <Image className="w-3.5 h-3.5" />;
    }
  };

  const formatRupiah = (val?: number) => {
    if (!val) return 'Gratis / Donasi';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const predefinedAwards = [
    { name: "🏆 Pilihan Kurator", desc: "Dikurasi langsung oleh kurator Rumah Adiksi atas keunikan estetika." },
    { name: "⭐ Bintang Komunitas", desc: "Mendapat sambutan hangat dan apresiasi luar biasa dari publik." },
    { name: "💡 Inovasi Karya", desc: "Eksperimen medium & konsep penyajian yang out-of-the-box." },
    { name: "🌊 Jiwa Pesisir", desc: "Karya berkepribadian kuat menangkap lanskap & kearifan Pelabuhan Ratu." },
  ];

  // Selected artwork full screen detailed representation
  if (selectedArtwork) {
    const avgScore = getAverageRating(selectedArtwork);
    const starCount = selectedArtwork.ratings?.length || 0;
    const isCurrentArtworkLiked = selectedArtwork.likedBy?.includes(currentUser?.uid || '') || false;

    return (
      <motion.div 
        id="artwork-fullpage-detail"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="space-y-8 py-6 text-white max-w-5xl mx-auto"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <button
            onClick={() => setSelectedArtwork(null)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-brand-gold hover:text-brand-charcoal text-xs font-bold rounded-xl transition cursor-pointer select-none"
          >
            ← Kembali ke Galeri
          </button>
          <button
            id="share-artwork-btn"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold hover:text-brand-charcoal text-brand-gold text-xs font-bold rounded-xl transition cursor-pointer select-none border border-brand-gold/25"
          >
            {isShared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {isShared ? 'Tautan Disalin!' : 'Bagikan Karya'}
          </button>
        </div>

        {/* Master Detail Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Photo Showcase (Left) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl flex justify-center items-center p-2 min-h-[320px]">
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                referrerPolicy="no-referrer"
                className="rounded-xl w-full object-contain max-h-[500px] h-auto my-auto"
              />
            </div>

            {/* Quick Metrics */}
            <div className="flex justify-around bg-slate-950/40 p-4 rounded-xl border border-white/5 text-center">
              <div>
                <p className="text-[10px] uppercase font-mono text-gray-500">Melihat</p>
                <p className="font-mono text-lg font-black text-gray-300 flex items-center justify-center gap-1.5"><Eye className="w-4 h-4 text-emerald-400" /> {selectedArtwork.views}</p>
              </div>
              <div className="border-r border-white/5" />
              <div>
                <p className="text-[10px] uppercase font-mono text-gray-500">Suka</p>
                <p className="font-mono text-lg font-black text-gray-300 flex items-center justify-center gap-1.5"><Heart className="w-4 h-4 text-rose-500 fill-current" /> {selectedArtwork.likes}</p>
              </div>
              <div className="border-r border-white/5" />
              <div>
                <p className="text-[10px] uppercase font-mono text-gray-500">Apresiasi Publik</p>
                <p className="font-mono text-lg font-black text-brand-gold flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-brand-gold fill-current" /> {avgScore > 0 ? `${avgScore}/5` : 'Nilai Baru'}
                </p>
              </div>
            </div>
          </div>

          {/* Description & Cart Collection Box (Right) */}
          <div className="lg:col-span-5 space-y-6 bg-brand-card/30 p-6 rounded-2xl border border-white/5">
            <div className="space-y-3">
              <span className="text-xs text-brand-gold font-mono font-bold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-md border border-brand-gold/20">
                {selectedArtwork.type}
              </span>
              <h3 className="font-serif text-3xl font-bold tracking-tight text-white leading-tight">
                {selectedArtwork.title}
              </h3>
              <div className="flex items-center gap-2 text-sm font-sans text-gray-400">
                <span>Seniman:</span>
                <button
                  onClick={() => {
                    onExploreArtist(selectedArtwork.artistId);
                    setSelectedArtwork(null);
                  }}
                  className="text-brand-gold hover:underline font-bold bg-brand-gold/5 px-2.5 py-1 rounded cursor-pointer transition"
                >
                  {selectedArtwork.artistName}
                </button>
              </div>
            </div>

            {/* Render Award Badges under main Title */}
            {selectedArtwork.awards && selectedArtwork.awards.length > 0 && (
              <div className="space-y-2 bg-brand-gold/5 p-3 rounded-xl border border-brand-gold/20">
                <p className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold flex items-center gap-1.5">
                  <AwardIcon className="w-3.5 h-3.5" /> Penghargaan Kuratorial:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedArtwork.awards.map((awr, index) => (
                    <span 
                      key={index} 
                      className="px-2.5 py-1 bg-brand-gold text-brand-charcoal text-[11px] font-black rounded-lg flex items-center gap-1 shadow-sm"
                    >
                      {awr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-white/5 pt-4">
              <h4 className="text-xs uppercase font-mono text-gray-400 tracking-wider">Deskripsi Karya:</h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedArtwork.description}
              </p>
            </div>

            <div className="border-t border-white/5 pt-5">
                { currentUser ? (
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] text-gray-500 uppercase font-mono block">Harga Apresiasi</span>
                            <span className="text-xl font-serif font-black text-brand-gold">{formatRupiah(selectedArtwork.price)}</span>
                        </div>
                        {selectedArtwork.price && !selectedArtwork.isSold ? (
                            <button
                                onClick={() => handleAddToCart(selectedArtwork)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold hover:bg-white text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer select-none active:scale-95 shadow-xl shadow-brand-gold/15"
                            >
                                <ShoppingBag className="w-4 h-4" /> Koleksi Karya
                            </button>
                        ) : (
                            <div className="px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs text-gray-400 font-bold select-none">
                                {selectedArtwork.isSold ? 'Sudah Terjual' : 'Tidak Dijual'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 bg-slate-900/40 rounded-xl border border-dashed border-white/10 text-center space-y-3">
                        <Lock className="w-6 h-6 mx-auto text-gray-500"/>
                        <p className="text-xs font-semibold text-gray-300">Akses Kolektor Terbatas</p>
                        <p className="text-xs text-gray-400">Masuk atau daftar anonymously untuk mengoleksi karya seni ini dan mendukung para seniman lokal.</p>
                        <button onClick={openAuthModal} className="mt-2 px-4 py-2 bg-brand-gold text-brand-charcoal font-bold text-xs rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                          Masuk untuk Membeli / Berdonasi
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Dynamic Support System: Reviews, Ratings, and Admin curator awards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-white/5">
          
          {/* Left Area: Reviews Chamber */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-brand-gold" /> Ruang Apresiasi & Ulasan
              </h3>
              <span className="text-xs font-mono bg-slate-800 text-gray-400 px-2.5 py-1 rounded-md">
                {starCount} Ulasan Publik
              </span>
            </div>

            {/* List of comments / reviews */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedArtwork.ratings && selectedArtwork.ratings.length > 0 ? (
                selectedArtwork.ratings.map((rating) => (
                  <div 
                    key={rating.id} 
                    className="p-4 bg-slate-950/40 rounded-xl border border-white/5 flex gap-3 relative group transition hover:border-white/10"
                  >
                    <div className="h-9 w-9 rounded-full bg-brand-gold/15 flex items-center justify-center text-brand-gold shrink-0 border border-brand-gold/10">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-sans text-brand-gold">
                            {rating.authorName}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {rating.timestamp ? new Date(rating.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </span>
                        </div>
                        
                        {/* Rating Display of commenter */}
                        <div className="flex items-center gap-0.5" title={`${rating.score} Bintang`}>
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < rating.score ? 'text-brand-gold fill-current' : 'text-gray-700'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">
                        {rating.comment}
                      </p>
                    </div>

                    {/* Admin Delete Action */}
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDeleteReview(rating.id)}
                        className="absolute right-4 bottom-4 p-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-500/20 rounded-lg text-rose-400 transition cursor-pointer select-none md:opacity-0 group-hover:opacity-100"
                        title="Hapus ulasan ini (Modifikasi Kurator)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-950/25 rounded-2xl border border-dashed border-white/5">
                  <p className="text-xs text-gray-500">Belum ada ulasan apresiatif untuk karya ini.</p>
                  <p className="text-[10px] text-gray-600 mt-1">Jadilah yang pertama mendukung seniman!</p>
                </div>
              )}
            </div>

            {/* Submission Form */}
            {currentUser ? (
              <form onSubmit={handleSubmitReview} className="bg-slate-950/40 p-5 rounded-xl border border-white/5 space-y-4">
                <h4 className="text-xs uppercase tracking-widest font-mono text-brand-gold font-bold">Kirim Bintang & Ulasan Anda</h4>
                
                {/* Score Selector (1-5 Stars) */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Penilaian:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setRatingScore(num)}
                        className="text-brand-gold transition cursor-pointer scale-100 hover:scale-110 active:scale-95 filter drop-shadow select-none"
                      >
                        <Star 
                          className={`w-5 h-5 ${num <= ratingScore ? 'fill-current text-brand-gold' : 'text-gray-600'}`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-mono font-bold text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded border border-brand-gold/10">
                    {ratingScore} Bintang
                  </span>
                </div>

                {/* Feedback Input */}
                <div className="space-y-1">
                  <textarea 
                    value={ratingComment}
                    onChange={(e) => { setRatingComment(e.target.value); setRatingError(''); }}
                    placeholder="Tulis kritik konstruktif, pujian estetika, atau pesan dukungan mendalam untuk seniman pembuat karya..."
                    className="w-full min-h-[90px] bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-gold placeholder-gray-600 resize-none"
                    maxLength={350}
                  />
                  <div className="flex justify-between items-center">
                    {ratingError && (
                      <span className="text-[10px] text-rose-400 font-semibold">{ratingError}</span>
                    )}
                    <span className="text-[10px] text-gray-500 font-mono ml-auto">
                      {350 - ratingComment.length} karakter tersisa
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingRating}
                    className="px-5 py-2 bg-brand-gold hover:bg-amber-500 text-brand-charcoal font-bold text-xs uppercase tracking-wide rounded-xl flex items-center gap-2 transition disabled:opacity-50 select-none cursor-pointer"
                  >
                    {isSubmittingRating ? 'Memproses...' : 'Kirim Apresiasi'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-slate-950/20 rounded-xl border border-dashed border-white/10 text-center space-y-2">
                <p className="text-xs text-gray-400">Ingin memberikan bintang rating dan ulasan Anda?</p>
                <button 
                  onClick={openAuthModal}
                  className="px-3.5 py-1.5 bg-brand-gold text-brand-charcoal text-xs font-black rounded-lg hover:bg-white transition"
                >
                  Masuk / Daftar Anonim
                </button>
              </div>
            )}
          </div>

          {/* Right Area: Awards Curation Deck */}
          <div className="lg:col-span-4 space-y-6">
            <div className="border-b border-white/5 pb-3">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-gold" /> Galeri Kurasi
              </h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Setiap karya pilihan dikurasi oleh tim Rumah Adiksi Creative Lab Pelabuhan Ratu untuk menjamin keaslian, semangat lokal, serta kedaulatan seni pesisir.
              </p>

              {/* Informational predefined awards list */}
              <div className="space-y-3 pt-3">
                {predefinedAwards.map((item, id) => {
                  const isAwardGranted = selectedArtwork.awards?.includes(item.name);
                  return (
                    <div 
                      key={id} 
                      className={`p-3 rounded-xl border transition ${
                        isAwardGranted 
                          ? 'bg-brand-gold/10 border-brand-gold/30 text-white' 
                          : 'bg-slate-950/25 border-white/5 opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-brand-gold block">{item.name}</span>
                        {isAwardGranted && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-400/20">✔ Aktif</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-snug">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CURATOR CONTROL SUITE (Admins only) */}
            {userRole === 'admin' && (
              <div className="bg-slate-950/65 p-4 rounded-xl border border-brand-gold/25 space-y-4">
                <div className="flex items-center gap-2 text-brand-gold font-mono text-[11px] font-bold uppercase tracking-wider pb-1 border-b border-white/5">
                  <Sparkles className="w-4 h-4 text-brand-gold" /> Ruang Direksi Kurator
                </div>
                
                <p className="text-[10px] text-gray-400">
                  Sebagai Kurator Administrator, Anda dapat memberikan tanda penghargaan kebudayaan ini secara instan:
                </p>

                {/* Toggle badging buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {predefinedAwards.map((item, idx) => {
                    const active = selectedArtwork.awards?.includes(item.name);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleAward(item.name)}
                        className={`p-2.5 rounded-lg text-[10px] font-bold tracking-tight text-center transition cursor-pointer select-none flex flex-col justify-center items-center gap-1 border ${
                          active 
                            ? 'bg-brand-gold text-brand-charcoal font-black border-brand-gold' 
                            : 'bg-black/30 text-gray-400 hover:text-white border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span>{item.name.split(' ')[0]}</span>
                        <span className="truncate w-full">{item.name.substring(item.name.indexOf(' ') + 1)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Award */}
                <form onSubmit={handleAddCustomAward} className="pt-2 border-t border-white/5 space-y-2">
                  <label className="text-[10px] font-mono uppercase text-gray-400 block font-bold">Kustomisasi Gelar Baru:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={customAwardText}
                      onChange={(e) => setCustomAwardText(e.target.value)}
                      placeholder="Contoh: 🌟 Seniman Berbakat 2026"
                      className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold flex-1 min-w-0"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-brand-gold text-brand-charcoal rounded-xl hover:bg-white transition cursor-pointer select-none"
                      title="Tambahkan Gelar Baru"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Gallery grid section
  const sortedAndFilteredArtworks = [...filteredArtworks].sort((a, b) => {
    if (sortBy === 'terpopuler') {
      const popA = (a.views || 0) + (a.likes || 0) * 3;
      const popB = (b.views || 0) + (b.likes || 0) * 3;
      return popB - popA;
    }
    return new Date(b.createdDate || '').getTime() - new Date(a.createdDate || '').getTime();
  });

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-white/5 pb-6">
        <div className="space-y-2">
          <span className="text-xs font-mono text-brand-gold uppercase tracking-wider">GALERI SENI RUMAH ADIKSI</span>
          <h2 className="font-serif text-3xl font-bold text-white tracking-tight">Pameran Karya Kreatif</h2>
          <p className="text-sm text-gray-400 max-w-xl font-sans">
            Jelajahi karya-karya orisinal dari para seniman dan kreator di Pelabuhan Ratu. Setiap apresiasi Anda turut mendukung ekosistem kreatif lokal.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Dropdown Filter for sorting */}
          <div className="flex items-center gap-2 bg-slate-950/70 py-2 px-3 rounded-xl border border-white/5 text-xs text-gray-400">
            <span className="font-mono text-gray-500 whitespace-nowrap">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'terbaru' | 'terpopuler')}
              className="bg-transparent text-white font-bold outline-none border-none cursor-pointer focus:ring-0 text-xs min-w-[100px]"
            >
              <option value="terbaru" className="bg-slate-950 text-white font-semibold">Terbaru</option>
              <option value="terpopuler" className="bg-slate-910 text-white font-semibold">Terpopuler</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-white/5 justify-start sm:justify-center">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'painting', label: 'Lukisan' },
              { id: 'music', label: 'Musik' },
              { id: 'photography', label: 'Fotografi' },
              { id: 'craft', label: 'Kriya' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as FilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all select-none ${
                  activeFilter === tab.id
                    ? 'bg-brand-gold text-brand-charcoal font-bold shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn" id="art-works-grid">
        <AnimatePresence>
          {sortedAndFilteredArtworks.map((art) => {
            const hasLiked = art.likedBy?.includes(currentUser?.uid || '') || false;
            const avgScore = getAverageRating(art);
            return (
              <motion.div
                key={art.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="group relative flex flex-col justify-between bg-slate-900/40 rounded-2xl border border-white/5 hover:border-brand-gold/30 overflow-hidden shadow-lg hover:shadow-brand-gold/5 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedArtwork(art)}
              >
                {/* Labels Left */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-semibold bg-slate-950/80 text-brand-gold px-2.5 py-1 rounded-full border border-brand-gold/15 shadow-sm">
                    {getCategoryIcon(art.type)} {art.type}
                  </span>
                  {art.awards && art.awards.length > 0 && (
                    <span className="text-[9px] font-mono font-bold uppercase bg-brand-gold text-brand-charcoal px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                      🏆 Curated Badge
                    </span>
                  )}
                  {art.isSold && (
                    <span className="text-[10px] font-mono font-bold uppercase bg-rose-600/90 text-white px-2.5 py-1 rounded-full shadow-md">Terjual</span>
                  )}
                </div>

                {/* Like Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 1.4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 12 }}
                  onClick={(e) => handleLike(art.id, e)}
                  className={`absolute top-3 right-3 z-10 p-2 rounded-full cursor-pointer border transition-colors ${ 
                    hasLiked 
                      ? 'bg-rose-500/15 text-rose-500 border-rose-500/40' 
                      : 'bg-slate-950/80 text-gray-400 hover:text-white border-white/10'
                  }`}
                >
                  <motion.div
                    animate={{ scale: hasLiked ? [1, 1.4, 1] : 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-rose-500' : ''}`} />
                  </motion.div>
                </motion.button>

                {/* Aspect Cover Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-950 border-b border-white/5">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />
                </div>

                {/* Header Information */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-serif text-lg font-bold text-white group-hover:text-brand-gold transition-colors line-clamp-1">
                      {art.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">Oleh: <strong className="text-white hover:underline" onClick={(e) => { e.stopPropagation(); onExploreArtist(art.artistId); }}>{art.artistName}</strong></span>
                      <span className="text-gray-500">{art.createdDate}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1" title={`${art.views || 0} Melihat`}><Eye className="w-3.5 h-3.5" /> {art.views || 0}</span>
                      <span className="flex items-center gap-1" title={`${art.likes || 0} Suka`}><Heart className={`w-3.5 h-3.5 ${hasLiked ? 'text-rose-500 fill-current' : ''}`} /> {art.likes || 0}</span>
                      
                      {/* Star rating preview */}
                      {avgScore > 0 && (
                        <span className="flex items-center gap-0.5 text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/10" title={`Rata-rata ulasan bintang: ${avgScore}`}>
                          <Star className="w-3 h-3 fill-current" /> {avgScore}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-brand-gold mt-0.5">{formatRupiah(art.price)}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredArtworks.length === 0 && (
        <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-white/5">
          <p className="text-gray-400">Belum ada karya seni dalam kategori ini.</p>
        </div>
      )}
    </div>
  );
}
