/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  BookOpen,
  Palette,
  Utensils,
  Award,
  Users,
  Heart,
  ArrowRight,
  Coffee,
  ShoppingBag,
  Calendar,
  MessageSquare,
  Plus,
  Star,
  Eye,
  X,
  Clock,
  MapPin,
  Tag
} from 'lucide-react';
import { Talent, GalleryItem, ShopItem, ArtEvent, CommunityPost } from '../types';
import { INITIAL_SHOP_ITEMS } from '../data';

interface HomeSectionProps {
  talents: Talent[];
  artworks: GalleryItem[];
  shopItems?: ShopItem[];
  events: ArtEvent[];
  posts: CommunityPost[];
  setActiveTab: (tab: string) => void;
  onSelectTalent: (talent: Talent) => void;
  addToCart?: (item: ShopItem, qty?: number) => void;
}

export default function HomeSection({
  talents,
  artworks,
  shopItems = [],
  events,
  posts,
  setActiveTab,
  onSelectTalent,
  addToCart
}: HomeSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showQuickView, setShowQuickView] = useState(false);

  const featuredProducts = (shopItems.length > 0 ? shopItems : INITIAL_SHOP_ITEMS).slice(0, 3);
  const nextEvent = events.length > 0 ? events[0] : null;
  const recentPosts = posts.slice(0, 2);

  const slides = artworks.length > 0 
    ? artworks.slice(0,3).map(art => ({
        url: art.imageUrl,
        title: art.title,
        desc: `Karya orisinal oleh ${art.artistName}.`,
        status: art.isSold ? 'Terjual' : 'Tersedia',
        tag: `Kriya: ${art.type.toUpperCase()}`,
        date: art.createdDate || 'Baru',
        time: art.price ? `Rp ${art.price.toLocaleString('id-ID')}` : 'Pajangan',
        loc: `Oleh: ${art.artistName}`,
        summary: art.description
      }))
    : [
        {
          url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
          title: 'Harapan Baru',
          desc: 'Pelabuhan Ratu bukan hanya laut, tapi jiwa kreatif pemudanya.',
          status: 'Live',
          tag: 'Kolektif Seni',
          date: '22-29 Mei 2026',
          time: '14:00 - 21:00 WIB',
          loc: 'Rumah Adiksi, Pelabuhan Ratu',
          summary: 'Pameran seni rupa kontemporer oleh seniman muda pesisir.'
        }
    ];

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => setActiveSlide((prev) => (prev + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [slides]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight || 450;
      }
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 25;
    const particles: any[] = [];
    const colors = ['rgba(245, 158, 11, 0.4)', 'rgba(217, 119, 6, 0.4)', 'rgba(99, 102, 241, 0.25)', 'rgba(255, 255, 255, 0.15)'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 3 + 1, color: colors[Math.floor(Math.random() * colors.length)], speedX: (Math.random() - 0.5) * 0.5, speedY: (Math.random() - 0.5) * 0.4 - 0.1, alpha: Math.random() * 0.4 + 0.2 });
    }

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      });
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationId); };
  }, []);

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <span className="text-xs uppercase font-sans tracking-widest text-brand-accent font-extrabold flex items-center gap-1.5 mb-1.5"><Compass className="w-4 h-4 animate-spin-slow text-brand-accent" /> Inkubator Talenta Pesisir</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-green font-sans md:text-4xl">Rumah Kreativitas: <span className="text-brand-gold italic">Dari Candu jadi Karya</span></h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('manifesto')} 
            className="px-5 py-2.5 bg-brand-accent hover:bg-brand-green text-white text-xs font-bold rounded-full flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Baca Manifesto</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('gallery')} 
            className="px-5 py-2.5 bg-transparent hover:bg-brand-accent/5 text-brand-accent border border-brand-accent text-xs font-bold rounded-full flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span>Jelajahi Karya</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Majestic Hero Banner Section */}
        <div className="md:col-span-12 lg:col-span-8 bg-brand-card rounded-3xl overflow-hidden relative border border-white/5 min-h-[380px] sm:min-h-[440px] md:min-h-[480px] flex flex-col justify-between shadow-2xl group hover:border-brand-gold/25 transition-all duration-300">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <canvas ref={canvasRef} className="w-full h-full opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
          </div>
          
          <div className="absolute inset-0 z-[1] opacity-75">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeSlide} 
                initial={{ opacity: 0, scale: 1.05 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 1.2, ease: 'easeInOut' }} 
                className="absolute inset-0"
              >
                <img 
                  src={slides[activeSlide]?.url} 
                  alt={slides[activeSlide]?.title} 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover mix-blend-luminosity brightness-50 group-hover:scale-[1.03] transition-transform duration-[6s] ease-out" 
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-charcoal via-transparent to-transparent" />
          </div>

          {/* Slider Header bar */}
          <div className="relative z-10 p-5 sm:p-6 md:p-8 flex justify-between items-center w-full">
            <span className="px-3 py-1 bg-brand-gold/15 text-brand-gold text-[10px] font-mono font-bold uppercase tracking-widest rounded-md border border-brand-gold/35">PILIHAN KURATOR</span>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5 mr-1.5">
                {slides.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={(e) => { e.stopPropagation(); setActiveSlide(idx); }} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === idx ? 'w-5 bg-brand-gold' : 'w-1.5 bg-white/20'}`} 
                  />
                ))}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border transition-all ${slides[activeSlide]?.status === 'Live' || slides[activeSlide]?.status === 'Tersedia' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35' : 'bg-amber-500/10 text-amber-400 border-amber-500/35'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${slides[activeSlide]?.status === 'Live' || slides[activeSlide]?.status === 'Tersedia' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{slides[activeSlide]?.status}</span>
              </div>
            </div>
          </div>

          {/* Slider bottom details */}
          <div className="relative z-10 p-5 sm:p-6 md:p-8 space-y-3 sm:space-y-4 max-w-xl">
            <div className="space-y-2">
              <span className="text-brand-gold text-xs font-mono tracking-widest uppercase block font-bold">{slides[activeSlide]?.tag}</span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-serif leading-tight tracking-tight">{slides[activeSlide]?.title}</h1>
              <p className="text-xs sm:text-sm text-gray-300 max-w-lg font-medium">{slides[activeSlide]?.desc}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-1.5">
              <button 
                onClick={() => setActiveTab('gallery')} 
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-brand-gold hover:bg-amber-500 text-brand-charcoal text-[10px] sm:text-[11px] font-mono font-black uppercase rounded-full tracking-wider shadow-lg shadow-brand-gold/15 cursor-pointer active:scale-95 transition-all"
              >
                Lihat Galeri
              </button>
              
              <button 
                onClick={() => setActiveTab('events')} 
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 text-[10px] sm:text-[11px] font-mono font-black uppercase rounded-full tracking-wider cursor-pointer active:scale-95 transition-all"
              >
                Reservasi Tiket
              </button>
              
              <button 
                onClick={() => setShowQuickView(true)} 
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-neutral-850/90 hover:bg-neutral-800 text-brand-gold border border-brand-gold/20 hover:border-brand-gold/40 text-[10px] sm:text-[11px] font-mono font-black uppercase rounded-full tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-all"
              >
                <Eye className="w-4 h-4 animate-pulse" />
                <span>Quick View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Adiksi Shop Bento Sidebar */}
        <div className="md:col-span-12 lg:col-span-4 bg-brand-house rounded-3xl p-5 sm:p-6 border border-brand-uplift/30 flex flex-col justify-between shadow-lg hover:border-brand-gold/25 transition-all duration-300 text-white">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-brand-uplift/25 pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-brand-gold" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Bazaar Adiksi</h3>
              </div>
              <span className="text-[9px] font-mono text-brand-gold tracking-widest uppercase px-2 py-0.5 bg-brand-gold/10 rounded border border-brand-gold/25 font-bold">Otentik</span>
            </div>
            
            <p className="text-xs text-gray-300 mb-4 font-medium leading-relaxed">Nikmati Kopi Arabika Jampang Sukabumi dan kriya premium daur ulang pemuda.</p>
            
            <div className="space-y-3">
              {featuredProducts.map((p) => (
                <div 
                  key={p.id} 
                  className="flex items-center gap-3 bg-black/30 p-2.5 rounded-2xl hover:bg-black/50 border border-brand-uplift/25 group transition-all"
                >
                  <img 
                    src={p.imageUrl} 
                    alt={p.name} 
                    referrerPolicy="no-referrer" 
                    className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-gray-100 truncate group-hover:text-brand-gold leading-tight">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-400 capitalize font-mono">{p.category}</span>
                      <div className="flex items-center text-[9px] text-amber-500 font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="ml-0.5">{p.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                    <span className="text-xs font-bold text-white font-mono font-black">{(p.price / 1000).toFixed(0)}k</span>
                    <button 
                      onClick={() => addToCart && addToCart(p, 1)} 
                      className="p-1 px-2.5 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-brand-charcoal rounded-lg border border-brand-gold/25 hover:border-transparent text-[10px] font-mono font-extrabold transition-all flex items-center gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Beli</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-5 pt-3 border-t border-brand-uplift/25">
            <button 
              onClick={() => setActiveTab('shop')} 
              className="w-full py-2.5 bg-brand-gold hover:bg-amber-500 text-brand-charcoal text-xs font-mono font-black uppercase rounded-2xl tracking-widest shadow-lg shadow-brand-gold/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Semua Produk</span>
            </button>
          </div>
        </div>

        {/* Talent Directory Preview */}
        <div className="md:col-span-12 lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 flex flex-col justify-between shadow-sm min-h-[380px] hover:border-brand-accent/20 transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-accent" />
                <h3 className="text-xs font-bold text-brand-green font-mono uppercase tracking-wider">Direktori Talenta</h3>
              </div>
              <button 
                onClick={() => setActiveTab('talents')} 
                className="text-[10px] text-gray-500 hover:text-brand-accent uppercase font-mono tracking-widest font-black cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>
            
            <p className="text-xs text-gray-650 mb-4 font-medium leading-relaxed">Jelajahi portofolio & komoditas pemuda Sukabumi. Mulai berkolaborasi.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {talents.slice(0, 4).map((talent) => (
                <div 
                  key={talent.id} 
                  onClick={() => onSelectTalent(talent)} 
                  className="flex items-center gap-3 bg-brand-cream/40 p-2.5 rounded-2xl hover:bg-brand-accent/5 border border-gray-200/60 hover:border-brand-accent/25 transition-all cursor-pointer group"
                >
                  <img 
                    src={talent.avatarUrl} 
                    alt={talent.name} 
                    referrerPolicy="no-referrer" 
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 group-hover:border-brand-accent transition-colors" 
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate group-hover:text-brand-accent leading-tight">{talent.name}</p>
                    <p className="text-[10px] text-brand-accent/80 font-mono truncate uppercase leading-none mt-1">{talent.field.split(' ')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-150">
            {talents.slice(0, 1).map((spotlight) => (
              <div 
                key={spotlight.id} 
                className="flex items-center justify-between bg-brand-gold/[0.04] p-3 rounded-2xl border border-brand-gold/25"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse shrink-0" />
                  <span className="text-[9px] uppercase font-mono text-gray-500 italic font-bold shrink-0">Sorotan Utama:</span>
                  <span className="text-xs font-black text-brand-gold truncate max-w-[110px]">{spotlight.name}</span>
                </div>
                <button 
                  onClick={() => onSelectTalent(spotlight)} 
                  className="text-[10px] text-brand-gold hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Lihat Profil</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Events & Live Discussions */}
        <div className="md:col-span-12 lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 flex flex-col md:flex-row gap-5 shadow-sm min-h-[380px] hover:border-brand-accent/20 transition-all duration-300">
          
          <div className="flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-150 pb-4 md:pb-0 md:pr-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <h4 className="text-xs font-bold uppercase text-rose-600 tracking-wider font-mono">Acara Terdekat</h4>
              </div>
              
              {nextEvent ? (
                <div className="space-y-2 mt-4 space-y-3">
                  <span className="px-2 py-0.5 bg-rose-50/75 text-rose-600 text-[9px] font-bold font-mono uppercase rounded border border-rose-200">Tiket Tersedia</span>
                  <h3 className="text-base font-extrabold text-gray-950 font-serif leading-snug">{nextEvent.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{nextEvent.description}</p>
                  
                  <div className="text-[10px] text-gray-700 font-mono flex items-center gap-1.5 mt-2 bg-brand-cream/55 p-2 rounded-xl border border-gray-200">
                    <Calendar className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                    <span className="truncate">{nextEvent.date}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Belum ada agenda terdekat.</p>
              )}
            </div>
            
            <button 
              onClick={() => setActiveTab('events')} 
              className="w-full mt-4 py-2.5 bg-brand-cream/60 hover:bg-brand-accent/10 hover:text-brand-accent text-gray-700 border border-gray-200 hover:border-brand-accent/25 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition-all duration-200 active:scale-95"
            >
              Jadwal Giat Seni
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-150 justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-accent" />
                  <h4 className="text-xs font-bold uppercase text-brand-green tracking-wider font-mono">Forum Curah Gagasan</h4>
                </div>
                <span className="text-[8px] font-mono text-emerald-600 px-1.5 py-0.5 bg-emerald-500/10 rounded font-bold border border-emerald-500/15 animate-pulse">Live</span>
              </div>
              
              <div className="space-y-2.5 mt-3">
                {recentPosts.length > 0 ? (
                  recentPosts.map(post => (
                    <div key={post.id} className="bg-brand-cream/35 p-2.5 rounded-2xl border border-gray-200/70 space-y-1.5">
                      <span className="text-xs text-gray-850 font-semibold italic line-clamp-2 leading-snug">"{post.content}"</span>
                      <div className="flex items-center gap-1.5 justify-between border-t border-gray-200/60 pt-1.5 mt-1.5">
                        <span className="text-[10px] text-brand-accent font-mono font-bold">@{post.authorName}</span>
                        <span className="text-[8px] text-gray-500 font-mono">{post.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">Belum ada diskusi komunitas terbaru.</p>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setActiveTab('community')} 
              className="w-full mt-4 py-2.5 bg-brand-accent hover:bg-brand-green text-white rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition-all duration-200 active:scale-95 shadow-sm"
            >
              Masuk Komunitas
            </button>
          </div>

        </div>

      </div>

      {/* Dynamic statistics section using custom dynamic Lucide icons */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { icon: Users, val: talents.length || 5, label: 'Kreator Terdaftar', color: 'text-amber-600 bg-amber-500/10' },
          { icon: Palette, val: artworks.length || 6, label: 'Karya Terpajang', color: 'text-brand-accent bg-brand-accent/10' },
          { icon: Utensils, val: (shopItems.length ? shopItems.reduce((a, b) => a + (b.stock || 0), 0) : 180), label: 'Stok Kopi & Merchandise', color: 'text-emerald-700 bg-emerald-50' },
          { icon: Award, val: events.length || 4, label: 'Agenda Seni Aktif', color: 'text-indigo-600 bg-indigo-55' }
        ].map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              key={idx} 
              className="p-5 rounded-3xl bg-white border border-gray-200 flex items-center gap-4 hover:border-brand-accent/30 hover:shadow-md transition-all duration-300"
            >
              <div className={`p-3 rounded-2xl ${item.color} shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-serif font-black text-brand-green block leading-none">{item.val}</span>
                <span className="text-[10px] font-bold text-gray-500 block mt-1 tracking-tight leading-none uppercase">{item.label}</span>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Quick View Full Slide Details Dialog */}
      <AnimatePresence>
        {showQuickView && slides[activeSlide] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              transition={{ duration: 0.3 }} 
              className="bg-brand-card border border-brand-gold/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-gold/5 rounded-full filter blur-[70px]" />
              <button onClick={() => setShowQuickView(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"><X className="w-4 h-4" /></button>
              
              <div className="relative h-64 rounded-2xl overflow-hidden border border-white/5 shadow-inner">
                <img src={slides[activeSlide].url} alt={slides[activeSlide].title} referrerPolicy="no-referrer" className="w-full h-full object-cover brightness-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2.5 py-1 bg-brand-gold/20 backdrop-blur-md text-brand-gold text-[10px] font-mono font-black uppercase tracking-wider rounded border border-brand-gold/45">{slides[activeSlide].tag}</span>
                  <span className={`px-2.5 py-1 backdrop-blur-md text-[10px] font-mono font-black uppercase tracking-wider rounded border ${slides[activeSlide].status === 'Live' || slides[activeSlide].status === 'Tersedia' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/45' : 'bg-amber-500/20 text-amber-400 border-amber-500/45'}`}>{slides[activeSlide].status}</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-serif font-black text-white">{slides[activeSlide].title}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-brand-gold" />
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-mono text-gray-500 block">Identitas</span>
                    <span className="text-xs text-white font-semibold truncate block">{slides[activeSlide].date}</span>
                  </div>
                </div>
                
                <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-brand-gold" />
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-mono text-gray-500 block">Status / Nilai</span>
                    <span className="text-xs text-white font-semibold truncate block">{slides[activeSlide].time}</span>
                  </div>
                </div>
                
                <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-brand-gold" />
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-mono text-gray-500 block">Kreator Pesisir</span>
                    <span className="text-xs text-white font-semibold truncate block">{slides[activeSlide].loc}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-brand-gold border-b border-white/5 pb-1 block">Deskripsi Karya</span>
                <p className="text-xs text-gray-300 leading-relaxed">{slides[activeSlide].summary}</p>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                <button 
                  onClick={() => setShowQuickView(false)} 
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-mono font-bold uppercase transition-colors"
                >
                  Tutup
                </button>
                <button 
                  onClick={() => { setShowQuickView(false); setActiveTab('gallery'); }} 
                  className="px-5 py-2.5 bg-brand-gold hover:bg-amber-500 text-brand-charcoal text-xs font-mono font-black uppercase rounded-xl tracking-wider shadow-md shadow-brand-gold/10 transition-all active:scale-95 cursor-pointer"
                >
                  Buka Galeri
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
