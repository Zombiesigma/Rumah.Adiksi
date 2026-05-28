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
  Check
} from 'lucide-react';
import { GalleryItem } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface GallerySectionProps {
  artworks: GalleryItem[];
  setArtworks: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  addToCart: (artwork: GalleryItem) => void;
  onExploreArtist: (artistId: string) => void;
  currentUser?: FirebaseUser | null;
  openAuthModal?: () => void;
}

type FilterType = 'all' | 'painting' | 'music' | 'photography' | 'craft';

export default function GallerySection({ artworks, setArtworks, addToCart, onExploreArtist, currentUser, openAuthModal }: GallerySectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedArtwork, setSelectedArtwork] = useState<GalleryItem | null>(null);
  const [sortBy, setSortBy] = useState<'terbaru' | 'terpopuler'>('terbaru');
  const [isShared, setIsShared] = useState(false);

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

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (openAuthModal) openAuthModal();
      return;
    }
    setArtworks((prev) =>
      prev.map((art) => {
        if (art.id === id) {
          const isLiked = (art as any).userLiked;
          return {
            ...art,
            likes: isLiked ? art.likes - 1 : art.likes + 1,
            userLiked: !isLiked
          } as any;
        }
        return art;
      })
    );
  };

  const handleAddToCart = (artwork: GalleryItem) => {
    if (!currentUser) {
        if (openAuthModal) openAuthModal();
        return;
    }
    addToCart(artwork);
    setSelectedArtwork(null);
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

  if (selectedArtwork) {
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
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-brand-gold hover:text-brand-charcoal text-xs font-bold rounded-xl transition cursor-pointer"
          >
            ← Kembali ke Galeri
          </button>
          <button
            id="share-artwork-btn"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold hover:text-brand-charcoal text-brand-gold text-xs font-bold rounded-xl transition cursor-pointer select-none border border-brand-gold/20"
          >
            {isShared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {isShared ? 'Tautan Disalin!' : 'Bagikan Karya'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                referrerPolicy="no-referrer"
                className="w-full object-contain max-h-[500px] h-auto mx-auto"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 bg-brand-card/30 p-6 rounded-2xl border border-white/5">
            <div className="space-y-3">
              <span className="text-xs text-brand-gold font-mono font-bold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-md border border-brand-gold/20">
                {selectedArtwork.type}
              </span>
              <h3 className="font-serif text-3xl font-bold tracking-tight text-white leading-tight">
                {selectedArtwork.title}
              </h3>
              <div className="flex items-center gap-2 text-sm font-sans text-gray-400">
                <span>Oleh:</span>
                <button
                  onClick={() => {
                    onExploreArtist(selectedArtwork.artistId);
                    setSelectedArtwork(null);
                  }}
                  className="text-brand-gold hover:underline font-bold bg-brand-gold/5 px-2.5 py-1 rounded cursor-pointer"
                >
                  {selectedArtwork.artistName}
                </button>
              </div>
            </div>

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
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold hover:bg-white text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
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
                        <p className="text-xs text-gray-400">Masuk atau daftar untuk mengoleksi karya seni ini dan mendukung para seniman lokal.</p>
                        <button onClick={openAuthModal} className="mt-2 px-4 py-2 bg-brand-gold text-brand-charcoal font-bold text-xs rounded-lg hover:bg-white transition-colors">
                          Masuk untuk Membeli
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
          <p className="text-sm text-gray-400 max-w-xl">
            Jelajahi karya-karya orisinal dari para seniman dan kreator di Pelabuhan Ratu. Setiap apresiasi Anda turut mendukung ekosistem kreatif lokal.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Dropdown Filter untuk menyaring berdasarkan Terpopuler/Terbaru */}
          <div className="flex items-center gap-2 bg-slate-950/70 py-2 px-3 rounded-xl border border-white/5 text-xs text-gray-400">
            <span className="font-mono text-gray-500 whitespace-nowrap">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'terbaru' | 'terpopuler')}
              className="bg-transparent text-white font-bold outline-none border-none cursor-pointer focus:ring-0 text-xs min-w-[100px]"
            >
              <option value="terbaru" className="bg-slate-950 text-white font-semibold">Terbaru</option>
              <option value="terpopuler" className="bg-slate-950 text-white font-semibold">Terpopuler</option>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="art-works-grid">
        <AnimatePresence>
          {sortedAndFilteredArtworks.map((art) => (
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
              <div className="absolute top-3 left-3 z-20 flex gap-1.5">
                <span className="flex items-center gap-1.5 text-xs uppercase font-mono font-semibold bg-slate-950/80 text-brand-gold px-2.5 py-1 rounded-full border border-brand-gold/15 shadow-sm">
                  {getCategoryIcon(art.type)} {art.type}
                </span>
                {art.isSold && (
                  <span className="text-xs font-mono font-bold uppercase bg-rose-600/90 text-white px-2.5 py-1 rounded-full shadow-md">Terjual</span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 1.4 }}
                transition={{ type: "spring", stiffness: 450, damping: 12 }}
                onClick={(e) => handleLike(art.id, e)}
                className={`absolute top-3 right-3 z-20 p-2 rounded-full cursor-pointer border transition-colors ${ 
                  (art as any).userLiked 
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/40' 
                    : 'bg-slate-950/80 text-gray-400 hover:text-white border-white/10'
                }`}
              >
                <motion.div
                  animate={{ scale: (art as any).userLiked ? [1, 1.4, 1] : 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Heart className={`w-4 h-4 ${(art as any).userLiked ? 'fill-current text-rose-500' : ''}`} />
                </motion.div>
              </motion.button>

              <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
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
                  <h3 className="font-serif text-lg font-bold text-white group-hover:text-brand-gold transition-colors line-clamp-1">
                    {art.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Oleh: <strong className="text-white hover:underline" onClick={(e) => { e.stopPropagation(); onExploreArtist(art.artistId); }}>{art.artistName}</strong></span>
                    <span className="text-gray-500">{art.createdDate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {art.views}</span>
                    <span className="flex items-center gap-1.5"><Heart className={`w-4 h-4 ${(art as any).userLiked ? 'text-rose-500 fill-current' : ''}`} /> {art.likes}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-brand-gold mt-0.5">{formatRupiah(art.price)}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
