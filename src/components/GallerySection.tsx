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
  User,
  Trash2,
  Plus,
  X,
  Sparkles,
  ShieldAlert,
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
  startChat?: (target: { userId?: string | null; userName?: string | null; userAvatar?: string | null; roomId?: string | null }) => void;
}

type FilterType = 'all' | 'painting' | 'music' | 'photography' | 'craft';

export default function GallerySection({ 
  artworks, 
  setArtworks, 
  addToCart, 
  onExploreArtist, 
  currentUser, 
  openAuthModal,
  userRole,
  startChat
}: GallerySectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedArtwork, setSelectedArtwork] = useState<GalleryItem | null>(null);
  const [sortBy, setSortBy] = useState<'terbaru' | 'terpopuler'>('terbaru');
  const [isShared, setIsShared] = useState(false);
  const [shareMessage, setShareMessage] = useState('Tautan Disalin!');
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingError, setRatingError] = useState<string>('');

  const [customAwardText, setCustomAwardText] = useState<string>('');

  useEffect(() => {
    if (selectedArtwork && !viewedIds.includes(selectedArtwork.id)) {
      setViewedIds((prev) => [...prev, selectedArtwork.id]);
      const artRef = doc(db, 'artworks', selectedArtwork.id);
      updateDoc(artRef, {
        views: (selectedArtwork.views || 0) + 1
      }).catch((err) => console.warn('Gagal menambah hitungan view: ', err));
    }
  }, [selectedArtwork?.id, viewedIds, selectedArtwork]);

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

  const handleShare = async () => {
    if (!selectedArtwork) return;
    const shareUrl = `${window.location.origin}/?tab=gallery&art=${selectedArtwork.id}`;
    const shareData = {
      title: `${selectedArtwork.title} - Rumah Adiksi Pelabuhanratu`,
      text: `Lihat karya seni "${selectedArtwork.title}" oleh ${selectedArtwork.artistName} di Rumah Adiksi Pelabuhanratu!`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareMessage('Berhasil Dibagikan!');
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage('Tautan Disalin!');
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    }).catch(err => console.error('Gagal menyalin tautan: ', err));
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
  const currentArtwork = selectedArtwork ? (artworks.find(a => a.id === selectedArtwork.id) || selectedArtwork) : null;
  if (currentArtwork) {
    const avgScore = getAverageRating(currentArtwork);
    const starCount = currentArtwork.ratings?.length || 0;
    const isCurrentArtworkLiked = currentArtwork.likedBy?.includes(currentUser?.uid || '') || false;

    return (
      <motion.div 
        id="artwork-fullpage-detail"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="space-y-8 py-6 text-white max-w-5xl mx-auto font-sans"
      >
        {/* Editorial Navigation Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-brand-gold/20 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedArtwork(null)}
              className="group flex items-center gap-2 px-4 py-2.5 bg-[#1E3932] hover:bg-brand-gold text-white hover:text-[#1E3932] text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer select-none border border-brand-gold/30"
            >
              <span className="transition-transform group-hover:-translate-x-1 font-mono">←</span> Kembali ke Galeri
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-400">
              <span>/</span>
              <span className="text-gray-500">Karya Seni</span>
              <span>/</span>
              <span className="text-brand-gold font-bold truncate max-w-[180px]">{currentArtwork.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleLike(currentArtwork.id, e)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer select-none border ${
                isCurrentArtworkLiked 
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:bg-rose-500/25' 
                  : 'bg-[#1E3932]/80 text-gray-300 border-brand-gold/20 hover:text-rose-400 hover:border-rose-500/30'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 transition-transform active:scale-125 ${isCurrentArtworkLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{isCurrentArtworkLiked ? 'Batal Suka' : 'Suka'}</span>
            </button>

            <button
              id="share-artwork-btn"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3932] hover:bg-brand-gold text-white hover:text-[#1E3932] hover:border-brand-gold text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer select-none border border-brand-gold/20"
            >
              {isShared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{isShared ? shareMessage : 'Bagikan Karya'}</span>
            </button>
          </div>
        </div>

        {/* Master Detail Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Photo Showcase (Left Space) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="group relative bg-[#0A1F1A] rounded-3xl overflow-hidden border border-brand-gold/20 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.85)] flex justify-center items-center p-3 sm:p-5 min-h-[340px] md:min-h-[460px] max-h-[640px] transition-all duration-500 hover:border-brand-gold/40">
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 pointer-events-none scale-105 transition-all duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${currentArtwork.imageUrl})` }}
              />
              
              <img
                src={currentArtwork.imageUrl}
                alt={currentArtwork.title}
                referrerPolicy="no-referrer"
                className="relative z-10 rounded-2xl w-full object-contain max-h-[5600] h-auto my-auto shadow-2xl transition-all duration-700 ease-out group-hover:scale-[1.01]"
              />

              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent pointer-events-none" />
            </div>

            {/* Metrics Bento Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1E3932]/60 p-4 rounded-2xl border border-brand-gold/10 text-center transition-all duration-300 hover:border-brand-gold/30 flex flex-col justify-center items-center gap-1">
                <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">Melihat</span>
                <span className="font-mono text-lg font-black text-gray-200 flex items-center gap-1.5 mt-0.5">
                  <Eye className="w-4 h-4 text-emerald-400" /> {currentArtwork.views}
                </span>
              </div>
              
              <button
                onClick={(e) => handleLike(currentArtwork.id, e)}
                className={`bg-[#1E3932]/60 p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col justify-center items-center gap-1 cursor-pointer select-none active:scale-95 ${
                  isCurrentArtworkLiked 
                    ? 'border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)] text-rose-400' 
                    : 'border-brand-gold/10 hover:border-rose-500/20 text-gray-300 hover:text-white'
                }`}
              >
                <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">Suka</span>
                <span className="font-mono text-lg font-black flex items-center gap-1.5 mt-0.5">
                  <Heart className={`w-4 h-4 transition-all ${isCurrentArtworkLiked ? 'text-rose-500 fill-current scale-110' : 'text-gray-400'}`} /> {currentArtwork.likes}
                </span>
              </button>

              <div className="bg-[#1E3932]/60 p-4 rounded-2xl border border-brand-gold/10 text-center transition-all duration-300 hover:border-brand-gold/30 flex flex-col justify-center items-center gap-1">
                <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">Apresiasi</span>
                <span className="font-mono text-lg font-black text-brand-gold flex items-center gap-1 mt-0.5" title={`${avgScore} / 5 Bintang`}>
                  <Star className="w-4 h-4 text-brand-gold fill-current" /> {avgScore > 0 ? `${avgScore}/5` : 'Baru'}
                </span>
              </div>
            </div>
          </div>

          {/* Exhibition Plaque Detailed Info Column (Right Space) */}
          <div className="lg:col-span-5 space-y-6 bg-gradient-to-b from-[#1E3932]/80 to-[#0A1F1A] p-6 rounded-3xl border border-brand-gold/20 shadow-2xl relative text-left">
            {/* Category Indicator Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-md border border-brand-gold/20 font-bold uppercase tracking-widest font-mono">
                {getCategoryIcon(currentArtwork.type)} {currentArtwork.type}
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">EXHIBIT CODE #{currentArtwork.id.substring(0, 5).toUpperCase()}</span>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {currentArtwork.title}
              </h3>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/5 rounded-2xl border border-brand-gold/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center font-serif text-brand-gold text-lg font-bold shadow-md">
                    {currentArtwork.artistName.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-gray-400 font-black">Seniman Kreator</p>
                    <button
                      onClick={() => {
                        onExploreArtist(currentArtwork.artistId);
                        setSelectedArtwork(null);
                      }}
                      className="text-white hover:text-brand-gold text-sm font-bold block transition cursor-pointer"
                    >
                      {currentArtwork.artistName}
                    </button>
                  </div>
                </div>

                {startChat && currentArtwork.artistId !== currentUser?.uid && (
                  <button
                    onClick={() => {
                      startChat({ userId: currentArtwork.artistId, userName: currentArtwork.artistName });
                      setSelectedArtwork(null);
                    }}
                    className="px-3 py-1.5 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-[#1E3932] text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer border border-brand-gold/25"
                    title="Mulai diskusi langsung dengan seniman"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Tanya Seniman
                  </button>
                )}
              </div>
            </div>

            {currentArtwork.awards && currentArtwork.awards.length > 0 && (
              <div className="space-y-2.5 bg-brand-gold/10 p-4 rounded-xl border border-brand-gold/25 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10">
                  <AwardIcon className="w-20 h-20 text-brand-gold" />
                </div>
                
                <p className="text-[9px] font-mono uppercase tracking-widest text-brand-gold font-bold flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-brand-gold rounded-full animate-ping" />
                  Rekognisi Kebudayaan Kuratorial:
                </p>
                <div className="flex flex-wrap gap-2 relative z-10">
                  {currentArtwork.awards.map((awr, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 bg-brand-gold text-[#1E3932] text-[10px] font-sans font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-md"
                    >
                      ★ {awr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-brand-gold/20 pt-5">
              <h4 className="text-[10px] uppercase font-mono text-gray-400 tracking-widest font-bold">Kisah di Balik Karya:</h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap pl-1 border-l-2 border-brand-gold/25">
                {currentArtwork.description}
              </p>
            </div>

            <div className="border-t border-brand-gold/20 pt-5">
              {currentUser ? (
                <div className="flex items-center justify-between gap-4 p-4 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 shadow-inner">
                  <div className="text-left">
                    <span className="text-[9px] text-gray-400 uppercase font-mono tracking-wider font-black">Nilai Apresiasi</span>
                    <span className="text-xl sm:text-2xl font-serif font-black text-brand-gold block mt-0.5">
                      {formatRupiah(currentArtwork.price)}
                    </span>
                  </div>
                  {currentArtwork.price && !currentArtwork.isSold ? (
                    <button
                      onClick={() => handleAddToCart(currentArtwork)}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-gold hover:bg-white text-[#1E3932] font-black rounded-xl text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer select-none active:scale-95 shadow-md"
                    >
                      <ShoppingBag className="w-4 h-4 font-black" /> Koleksi Karya
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
                      {currentArtwork.isSold ? 'Sudah Terjual' : 'Koleksi Arsip'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 bg-[#1E3932]/40 rounded-2xl border border-dashed border-brand-gold/20 text-center space-y-4">
                  <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-brand-gold/20">
                    <Lock className="w-4 h-4 text-gray-400"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-200">Akses Kolektor Terproteksi</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans">Masuk atau bergabung anonim untuk mendapatkan karya orisinal & berdonasi langsung ke seniman pilihan.</p>
                  </div>
                  <button 
                    onClick={openAuthModal} 
                    className="w-full py-2.5 bg-brand-gold hover:bg-white text-[#1E3932] font-black text-[10px] uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer select-none shadow-md"
                  >
                    Masuk Ke Galeri Kolektor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Support System: Guestbook & Curation Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-brand-gold/20">
          
          {/* Guestbook Section (Left Column) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-brand-gold/20 pb-3.5">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 text-left">
                <MessageSquare className="w-5 h-5 text-brand-gold" /> Ruang Apresiasi & Ulasan Kolektor
              </h3>
              <span className="text-[10px] font-mono bg-[#1E3932] text-gray-300 px-3 py-1 rounded-md border border-brand-gold/20">
                {starCount} Catatan Pengunjung
              </span>
            </div>

            <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {currentArtwork.ratings && currentArtwork.ratings.length > 0 ? (
                currentArtwork.ratings.map((rating) => (
                  <div 
                    key={rating.id} 
                    className="p-4 bg-[#1E3932]/60 rounded-2xl border border-brand-gold/10 flex gap-3.5 relative group transition hover:border-brand-gold/30 text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-brand-gold/15 flex items-center justify-center text-brand-gold shrink-0 border border-brand-gold/10">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-brand-gold font-sans">
                            {rating.authorName}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {rating.timestamp ? new Date(rating.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-0.5" title={`${rating.score} Bintang`}>
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < rating.score ? 'text-brand-gold fill-current' : 'text-gray-700'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans mt-0.5">
                        {rating.comment}
                      </p>
                    </div>

                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDeleteReview(rating.id)}
                        className="absolute right-4 bottom-4 p-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/10 hover:border-rose-500/30 rounded-lg text-rose-400 transition cursor-pointer select-none md:opacity-0 group-hover:opacity-100"
                        title="Hapus ulasan ini (Modifikasi Kurator)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-[#1E3932]/20 rounded-2xl border border-dashed border-brand-gold/10 space-y-2">
                  <p className="text-xs text-gray-400">Belum ada ulasan apresiatif untuk karya agung ini.</p>
                  <p className="text-[10px] text-gray-500">Jadilah yang pertama untuk meninggalkan jejak apresiasi!</p>
                </div>
              )}
            </div>

            {currentUser ? (
              <form onSubmit={handleSubmitReview} className="bg-[#1E3932]/40 p-5 rounded-2xl border border-brand-gold/20 space-y-4 text-left">
                <h4 className="text-[10px] uppercase tracking-widest font-mono text-brand-gold font-bold">Kirim Bintang & Ulasan Anda</h4>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Penilaian:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setRatingScore(num)}
                        className="text-brand-gold transition-all duration-200 cursor-pointer scale-100 hover:scale-125 hover:rotate-6 active:scale-95 filter drop-shadow select-none"
                      >
                        <Star 
                          className={`w-5.5 h-5.5 ${num <= ratingScore ? 'fill-current text-brand-gold' : 'text-gray-600'}`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded border border-brand-gold/15">
                    {ratingScore} Bintang
                  </span>
                </div>

                <div className="space-y-1">
                  <textarea 
                    value={ratingComment}
                    onChange={(e) => { setRatingComment(e.target.value); setRatingError(''); }}
                    placeholder="Tulis kritik beralur, kalimat pujian mendalam, atau pesan interpretasi orisinal Anda untuk mendukung seniman lokal..."
                    className="w-full min-h-[95px] bg-[#0A1F1A] border border-brand-gold/20 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-brand-gold placeholder-gray-500 resize-none font-sans"
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
                    className="px-5 py-2.5 bg-brand-gold hover:bg-white text-[#1E3932] font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition disabled:opacity-50 select-none cursor-pointer shadow-md"
                  >
                    {isSubmittingRating ? 'Memproses...' : 'Kirim Apresiasi'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-[#1E3932]/20 rounded-xl border border-dashed border-brand-gold/10 text-center space-y-2">
                <p className="text-xs text-gray-400">Ingin memberikan ulasan apresiatif Anda?</p>
                <button 
                  onClick={openAuthModal}
                  className="px-4 py-2 bg-brand-gold text-[#1E3932] hover:bg-white text-xs font-black rounded-lg transition select-none cursor-pointer"
                >
                  Masuk / Daftar Anonim
                </button>
              </div>
            )}
          </div>

          {/* Exhibition Deck Definitions (Right Column) */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="border-b border-brand-gold/20 pb-3">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-gold" /> Galeri Kurasi Resmi
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Setiap karya terpilih melewati penyaringan komite Rumah Adiksi Creative Lab untuk menjaga orisinalitas tinggi, apresiasi budaya pesisir, serta mendukung martabat kedaulatan seniman Pelabuhan Ratu.
              </p>

              <div className="space-y-3 pt-1">
                {predefinedAwards.map((item, id) => {
                  const isAwardGranted = currentArtwork.awards?.includes(item.name);
                  return (
                    <div 
                      key={id} 
                      className={`p-3 rounded-xl border transition-all duration-300 ${
                        isAwardGranted 
                          ? 'bg-brand-gold/10 border-brand-gold/30 text-white shadow-sm' 
                          : 'bg-[#1E3932]/20 border-brand-gold/10 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-brand-gold block">{item.name}</span>
                        {isAwardGranted && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-400/25">✔ Tersemat</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-snug">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {userRole === 'admin' && (
              <div className="bg-[#1E3932]/80 p-5 rounded-2xl border border-brand-gold/25 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-brand-gold font-mono text-[11px] font-bold uppercase tracking-wider pb-1.5 border-b border-brand-gold/20">
                  <Sparkles className="w-4 h-4 text-brand-gold" /> Direksi Kurator Eksklusif
                </div>
                
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Admin dapat memberikan tanda kepelbagaian kebudayaan instan di bawah ini:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {predefinedAwards.map((item, idx) => {
                    const active = currentArtwork.awards?.includes(item.name);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleAward(item.name)}
                        className={`p-2.5 rounded-xl text-[10px] font-bold tracking-tight text-center transition cursor-pointer select-none flex flex-col justify-center items-center gap-1.5 border ${
                          active 
                            ? 'bg-brand-gold text-[#1E3932] font-black border-brand-gold shadow-[0_4px_12px_rgba(235,166,42,0.15)]' 
                            : 'bg-[#0A1F1A] text-gray-400 hover:text-white border-brand-gold/20 hover:bg-brand-gold/10'
                        }`}
                      >
                        <span className="text-xs">{item.name.split(' ')[0]}</span>
                        <span className="truncate w-full font-sans tracking-tight">{item.name.substring(item.name.indexOf(' ') + 1)}</span>
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleAddCustomAward} className="pt-3 border-t border-brand-gold/20 space-y-2">
                  <label className="text-[10px] font-mono uppercase text-gray-400 block font-bold">Terbitkan Gelar Baru:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={customAwardText}
                      onChange={(e) => setCustomAwardText(e.target.value)}
                      placeholder="Contoh: 🏆 Masterpiece 2026"
                      className="bg-[#0A1F1A] border border-brand-gold/20 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold flex-1 min-w-0 font-sans"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-brand-gold hover:bg-white text-[#1E3932] rounded-xl transition duration-300 cursor-pointer select-none flex-shrink-0"
                      title="Tambahkan Gelar Baru"
                    >
                      <Plus className="w-4 h-4 font-bold" />
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-gray-150 pb-6">
        <div className="space-y-2">
          <span className="text-xs font-sans font-bold text-brand-accent uppercase tracking-wider">GALERI SENI RUMAH ADIKSI</span>
          <h2 className="font-sans text-3xl font-extrabold text-brand-green tracking-tight">Pameran Karya Kreatif</h2>
          <p className="text-sm text-gray-600 max-w-xl font-sans">
            Jelajahi karya-karya orisinal dari para seniman dan kreator di Pelabuhan Ratu. Setiap apresiasi Anda turut mendukung ekosistem kreatif lokal.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-white py-2 px-4 rounded-full border border-gray-250 text-xs text-gray-600 shadow-sm">
            <span className="font-sans text-gray-400 whitespace-nowrap">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'terbaru' | 'terpopuler')}
              className="bg-transparent text-brand-green font-bold outline-none border-none cursor-pointer focus:ring-0 text-xs min-w-[100px]"
            >
              <option value="terbaru" className="bg-white text-gray-900 font-semibold">Terbaru</option>
              <option value="terpopuler" className="bg-white text-gray-900 font-semibold">Terpopuler</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-full border border-gray-200 justify-start sm:justify-center">
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all select-none ${
                  activeFilter === tab.id
                    ? 'bg-brand-accent text-white font-bold shadow-sm'
                    : 'text-gray-600 hover:text-brand-accent hover:bg-gray-50'
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
                className="group relative flex flex-col justify-between bg-white rounded-3xl border border-gray-200 hover:border-brand-accent/40 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedArtwork(art)}
              >
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-sans font-bold bg-white/95 text-brand-accent px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
                    {getCategoryIcon(art.type)} {art.type}
                  </span>
                  {art.awards && art.awards.length > 0 && (
                    <span className="text-[9px] font-sans font-bold uppercase bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      🏆 Curated Badge
                    </span>
                  )}
                  {art.isSold && (
                    <span className="text-[10px] font-sans font-bold uppercase bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-sm">Terjual</span>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 1.4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 12 }}
                  onClick={(e) => handleLike(art.id, e)}
                  className={`absolute top-3 right-3 z-10 p-2 rounded-full cursor-pointer border transition-colors ${ 
                    hasLiked 
                      ? 'bg-rose-50 text-rose-500 border-rose-200 shadow-sm' 
                      : 'bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-50 border-gray-200 shadow-sm'
                  }`}
                >
                  <motion.div
                    animate={{ scale: hasLiked ? [1, 1.4, 1] : 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-rose-500' : ''}`} />
                  </motion.div>
                </motion.button>

                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 border-b border-gray-150">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />
                </div>

                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-sans text-lg font-extrabold text-brand-green group-hover:text-brand-accent transition-colors line-clamp-1">
                      {art.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="text-gray-500">Oleh: <strong className="text-brand-green hover:text-brand-accent cursor-pointer hover:underline font-bold" onClick={(e) => { e.stopPropagation(); onExploreArtist(art.artistId); }}>{art.artistName}</strong></span>
                      <span className="text-gray-400 font-medium">{art.createdDate}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-150 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs text-gray-500 font-sans">
                      <span className="flex items-center gap-1" title={`${art.views || 0} Melihat`}><Eye className="w-3.5 h-3.5" /> {art.views || 0}</span>
                      <span className="flex items-center gap-1" title={`${art.likes || 0} Suka`}><Heart className={`w-3.5 h-3.5 ${hasLiked ? 'text-rose-500 fill-current' : ''}`} /> {art.likes || 0}</span>
                      
                      {avgScore > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200" title={`Rata-rata ulasan bintang: ${avgScore}`}>
                          <Star className="w-3 h-3 fill-current text-amber-500" /> {avgScore}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-brand-accent mt-0.5">{formatRupiah(art.price)}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredArtworks.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-150">
          <p className="text-gray-500 font-sans">Belum ada karya seni dalam kategori ini.</p>
        </div>
      )}
    </div>
  );
}
