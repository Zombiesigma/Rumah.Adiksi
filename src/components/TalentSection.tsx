/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Instagram,
  Youtube,
  Pin,
  Award,
  BookOpen,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Heart,
  Search,
  X,
  Compass,
  Filter,
  MapPin,
  Users,
  CheckCircle,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Talent, GalleryItem } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface TalentSectionProps {
  talents: Talent[];
  artworks: GalleryItem[];
  selectedTalentId: string | null;
  setSelectedTalentId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  onExploreArtDetail: (art: GalleryItem) => void;
}

export default function TalentSection({
  talents,
  artworks,
  selectedTalentId,
  setSelectedTalentId,
  setActiveTab,
  onExploreArtDetail
}: TalentSectionProps) {
  const [searchField, setSearchField] = useState('');
  const [selectedSubLocation, setSelectedSubLocation] = useState('all');
  const [activeGenre, setActiveGenre] = useState<'all' | 'tradisi' | 'modern' | 'fusion'>('all');
  const [selectedSkillTag, setSelectedSkillTag] = useState<string | null>(null);
  const [likedTalents, setLikedTalents] = useState<string[]>([]);

  // Load liked talents local cache on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('adiksi_liked_talents');
      if (stored) {
        setLikedTalents(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load liked talents cache:', e);
    }
  }, []);

  // Helper classification logic
  const getTalentClassification = (talent: Talent) => {
    const text = `${talent.field} ${talent.bio} ${talent.skills.join(' ')}`.toLowerCase();
    
    const traditionalKeywords = [
      'tradisi', 'tarawangsa', 'suling', 'pahat', 'ukir', 'bambu', 'kriya', 'budayawan', 'dalang', 
      'klasik', 'heritage', 'wayang', 'tradisional', 'pesisir', 'kayu', 'rotan', 'tenun', 'anyaman', 'batik'
    ];
    const modernKeywords = [
      'modern', 'digital', 'gitar', 'bass', 'drum', 'indie', 'vector', 'desain', 'graphic', 'photographer', 
      'fotografi', 'videografi', 'software', 'pop', 'jazz', 'rock', 'synth', 'band', 'electronic', 'dj'
    ];

    const hasTrad = traditionalKeywords.some(kw => text.includes(kw));
    const hasMod = modernKeywords.some(kw => text.includes(kw));

    if (hasTrad && hasMod) return 'fusion';
    if (hasTrad) return 'tradisi';
    return 'modern';
  };

  const getTalentArtworks = (talentId: string) => {
    return artworks.filter((art) => art.artistId === talentId);
  };

  // Upvote/Like Talent helper
  const handleLikeTalent = async (talentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAlreadyLiked = likedTalents.includes(talentId);
    
    let updatedLikes = [...likedTalents];
    const talentObj = talents.find(t => t.id === talentId);
    if (!talentObj) return;

    // Get current likes from talent payload or default to 0
    let currentLikes = (talentObj as any).likesCount || 0;

    if (isAlreadyLiked) {
      // Remove upvote
      updatedLikes = updatedLikes.filter(id => id !== talentId);
      currentLikes = Math.max(0, currentLikes - 1);
    } else {
      // Add upvote
      updatedLikes.push(talentId);
      currentLikes += 1;
    }

    try {
      // Optimistic update local storage
      setLikedTalents(updatedLikes);
      localStorage.setItem('adiksi_liked_talents', JSON.stringify(updatedLikes));

      // Update Firestore
      await setDoc(doc(db, 'talents', talentId), {
        likesCount: currentLikes
      }, { merge: true });
    } catch (err) {
      console.error('Failed to update talent likes:', err);
    }
  };

  // Get locations list
  const locations = Array.from(
    new Set(talents.map((t) => t.location.replace('Pelabuhan Ratu - ', '')))
  );

  // Extract all unique skills to make a popular skills tag cloud
  const allSkills = talents.reduce((acc: string[], curr) => [...acc, ...curr.skills], []);
  const skillFrequencies = allSkills.reduce((acc: { [key: string]: number }, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {});

  const popularSkills = Object.entries(skillFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);

  // Filter strategy
  const filteredTalents = talents.filter((t) => {
    const classification = getTalentClassification(t);
    
    const matchesSearch =
      t.name.toLowerCase().includes(searchField.toLowerCase()) ||
      t.field.toLowerCase().includes(searchField.toLowerCase()) ||
      t.skills.some((s) => s.toLowerCase().includes(searchField.toLowerCase()));

    const matchesLocation =
      selectedSubLocation === 'all' ||
      t.location.includes(selectedSubLocation);

    const matchesGenre = activeGenre === 'all' || classification === activeGenre;

    const matchesSkillTag = !selectedSkillTag || t.skills.includes(selectedSkillTag);

    return matchesSearch && matchesLocation && matchesGenre && matchesSkillTag;
  });

  // Calculate statistics
  const totalTalentsCount = talents.length;
  const traditionalCount = talents.filter(t => getTalentClassification(t) === 'tradisi').length;
  const modernCount = talents.filter(t => getTalentClassification(t) === 'modern').length;
  const fusionCount = talents.filter(t => getTalentClassification(t) === 'fusion').length;
  const totalPortfoliosCount = artworks.length;

  return (
    <div className="space-y-8 py-4 text-white font-sans">
      
      {/* Top Header & Interactive Stats Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-white/5 pb-8">
        
        {/* Banner Left Details */}
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/25">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping" />
            <span className="text-[10px] font-mono font-bold text-brand-gold tracking-widest uppercase">DIKATOR BAKAT NUSANTARA</span>
          </div>
          
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Direktori Bakat <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-gold to-orange-500 font-black">
              Tradisi & Modern
            </span>
          </h2>
          
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-2xl font-normal">
            Wadah kurasi bagi pemuda tani, musisi indie pesisir, budayawan, pengrajin akar kayu, desainer kontemporer, dan kreator kustom Pelabuhan Ratu. Jelajahi portofolio orisinil mereka dan jalin kolaborasi karya yang mandiri.
          </p>
        </div>

        {/* Banner Right Statistics - Bento Block */}
        <div className="lg:col-span-4 bg-brand-card/90 border border-white/5 p-5 rounded-3xl grid grid-cols-2 gap-4 w-full shadow-lg relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-full filter blur-xl" />
          
          <div className="col-span-2 flex items-center gap-2 border-b border-white/5 pb-2.5">
            <TrendingUp className="w-4 h-4 text-brand-gold" />
            <span className="text-[10px] font-mono font-extrabold text-white uppercase tracking-wider">EKOSISTEM BERDAYA</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 font-mono block">TOTAL TALENTA</span>
            <span className="text-2xl font-serif font-black text-white block leading-none">{totalTalentsCount}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 font-mono block">KARYA DIPILIH</span>
            <span className="text-2xl font-serif font-black text-brand-gold block leading-none">{totalPortfoliosCount}</span>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-2">
            <span className="text-[9px] text-gray-500 font-mono block">HERITAGE TRADISI</span>
            <span className="text-xs font-bold text-amber-500 block">{traditionalCount} Preserver</span>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-2">
            <span className="text-[9px] text-gray-500 font-mono block">FUSION & MODERN</span>
            <span className="text-xs font-bold text-sky-400 block">{modernCount + fusionCount} Kreator</span>
          </div>
        </div>

      </div>

      {/* Advanced Control & Filter Panel */}
      <div className="bg-brand-card border border-white/5 p-6 rounded-3xl space-y-5 shadow-sm">
        
        {/* Filters Top Bar */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between pb-4 border-b border-white/5">
          
          {/* Main Genre Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveGenre('all')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'all' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}
            >
              <Compass className="w-3.5 h-3.5" /> Semua Aliran
            </button>
            <button
              onClick={() => setActiveGenre('tradisi')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'tradisi' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold' : 'text-gray-400 hover:text-white'}`}
            >
              🏛️ Warisan Tradisi
            </button>
            <button
              onClick={() => setActiveGenre('modern')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'modern' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              ⚡ Inovasi Modern
            </button>
            <button
              onClick={() => setActiveGenre('fusion')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'fusion' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              🎛️ Fusion Mix
            </button>
          </div>

          {/* District sub-locations tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-extrabold text-gray-500 uppercase flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-gray-500" /> Wilayah:
            </span>
            <button
              onClick={() => setSelectedSubLocation('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                selectedSubLocation === 'all'
                  ? 'bg-brand-gold/15 text-brand-gold border border-brand-gold/25'
                  : 'text-gray-400 bg-slate-950 border border-white/5 hover:text-white'
              }`}
            >
              Semua Wilayah
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedSubLocation(loc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  selectedSubLocation === loc
                    ? 'bg-brand-gold/15 text-brand-gold border border-brand-gold/25'
                    : 'text-gray-400 bg-slate-950 border border-white/5 hover:text-white'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

        </div>

        {/* Searching Input and Clickable tag cloud */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-1">
          
          {/* Real-time search query box */}
          <div className="md:col-span-5 relative w-full">
            <span className="absolute left-3.5 top-3 text-gray-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari talenta, jenis keahlian, atau komoditas..."
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-gray-550 focus:outline-none focus:border-brand-gold font-medium"
            />
            {searchField && (
              <button 
                onClick={() => setSearchField('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Popular Skills Cloud */}
          <div className="md:col-span-7 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="w-3 h-3" /> Rekomendasi Tag:
            </span>
            
            <div className="flex flex-wrap gap-1.5">
              {popularSkills.map((skill) => {
                const isSelected = selectedSkillTag === skill;
                return (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkillTag(isSelected ? null : skill)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-gold border-brand-gold text-brand-charcoal font-black' 
                        : 'bg-slate-950/40 border-white/5 text-gray-400 hover:text-white hover:border-brand-gold/20'
                    }`}
                  >
                    #{skill}
                  </button>
                );
              })}
              {selectedSkillTag && (
                <button
                  onClick={() => setSelectedSkillTag(null)}
                  className="px-2 py-1 text-[10px] bg-rose-950/20 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg flex items-center gap-0.5"
                >
                  Clear Tag <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Main Talents Directory Presentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="talents-grid">
        <AnimatePresence mode="popLayout">
          {filteredTalents.map((talent) => {
            const personalArt = getTalentArtworks(talent.id);
            const isExpanded = selectedTalentId === talent.id;
            const hasLiked = likedTalents.includes(talent.id);
            
            // Get classification
            const classification = getTalentClassification(talent);
            const currentLikes = (talent as any).likesCount || 0;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                whileHover={!isExpanded ? { 
                  y: -8, 
                  scale: 1.025,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(217, 119, 6, 0.1)"
                } : undefined}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.25 }
                }}
                key={talent.id}
                className={`group flex flex-col justify-between p-6 rounded-3xl border transition-all duration-300 ease-out relative overflow-hidden cursor-pointer ${
                  isExpanded
                    ? 'bg-gradient-to-b from-slate-950 via-zinc-950 to-brand-card/95 border-brand-gold/45 shadow-2xl md:col-span-2 lg:col-span-3'
                    : 'bg-brand-card border-white/5 hover:border-brand-gold/30 hover:bg-slate-950/70 shadow-sm'
                }`}
                id={`talent-card-${talent.id}`}
              >
                
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/[0.02] rounded-full filter blur-2xl group-hover:bg-brand-gold/[0.04] transition-all" />

                <div className="space-y-4">
                  
                  {/* Card Front Top Metadata & Likes Upvote Row */}
                  <div className="flex justify-between items-center z-10 relative">
                    
                    {/* Classification Glow Badges */}
                    {classification === 'tradisi' ? (
                      <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/25 text-[8px] font-mono text-amber-500 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        🏛️ Warisan Tradisi
                      </span>
                    ) : classification === 'fusion' ? (
                      <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/25 text-[8px] font-mono text-emerald-400 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        🎛️ Fusion Genre
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/25 text-[8px] font-mono text-sky-400 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        ⚡ Inovasi Modern
                      </span>
                    )}

                    {/* Upvote support action trigger */}
                    <button
                      onClick={(e) => handleLikeTalent(talent.id, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer border ${
                        hasLiked 
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/25 shadow-sm shadow-rose-500/5' 
                          : 'bg-slate-950/60 border-white/5 text-gray-500 hover:text-white hover:border-white/10'
                      }`}
                      title={hasLiked ? 'Batalkan Dukungan' : 'Kirim Dukungan Semangat'}
                    >
                      <Heart className={`w-3 h-3 ${hasLiked ? 'fill-current text-rose-500 scale-110' : ''}`} />
                      <span>{currentLikes} Dukungan</span>
                    </button>

                  </div>

                  {/* Profile Header Grid */}
                  <div className="flex items-start gap-4 z-10 relative pt-1">
                    
                    {/* Portrait Avatar framing */}
                    <div className="relative shrink-0 select-none">
                      <div className={`absolute -inset-1 rounded-full blur-md opacity-30 group-hover:opacity-100 transition-opacity duration-300 ${classification === 'tradisi' ? 'bg-amber-500' : classification === 'fusion' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                      
                      <img
                        src={talent.avatarUrl}
                        alt={talent.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className={`w-14 h-14 rounded-full object-cover relative z-10 border-2 ${classification === 'tradisi' ? 'border-amber-500/60 shadow-amber-950/20' : classification === 'fusion' ? 'border-emerald-500/60' : 'border-sky-500/60'}`}
                      />
                    </div>

                    {/* Basic Identity Details */}
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-serif text-md font-extrabold text-white group-hover:text-brand-gold transition-colors truncate flex items-center gap-1.5">
                        {talent.name}
                        <CheckCircle className="w-3.5 h-3.5 text-brand-gold shrink-0" title="Kreator Terverifikasi" />
                      </h3>
                      
                      <p className="text-xs font-mono text-gray-300 font-bold flex items-center gap-1 truncate uppercase">
                        <Award className="w-3 h-3 text-brand-gold shrink-0" /> {talent.field}
                      </p>
                      
                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-0.5 truncate">
                        <MapPin className="w-3 h-3 text-gray-600 shrink-0" /> {talent.location}
                      </div>
                    </div>

                  </div>

                  {/* Creative Narrative Bio */}
                  <div className="bg-slate-950/45 p-3.5 rounded-2xl border border-white/5 relative">
                    <p className={`text-xs text-gray-400 leading-relaxed font-sans ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {talent.bio || "Seniman peduli pesisir ini berdedikasi memajukan kreasi kesenian di daerah Pelabuhan Ratu."}
                    </p>
                  </div>

                  {/* Specialties Skills tag list on card front */}
                  <div className="flex flex-wrap gap-1">
                    {talent.skills.slice(0, 5).map((skill) => {
                      const isFilteringByThis = selectedSkillTag === skill;
                      return (
                        <span
                          key={skill}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSkillTag(isFilteringByThis ? null : skill);
                          }}
                          className={`text-[9px] font-mono px-2 py-0.5 cursor-pointer rounded transition-all border ${
                            isFilteringByThis 
                              ? 'bg-brand-gold border-brand-gold text-brand-charcoal font-black' 
                              : 'bg-slate-950 text-gray-400 border-white/5 hover:border-brand-gold/20 hover:text-white'
                          }`}
                        >
                          #{skill}
                        </span>
                      );
                    })}
                    {talent.skills.length > 5 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/5 text-gray-500 rounded">
                        +{talent.skills.length - 5} lainnya
                      </span>
                    )}
                  </div>

                  {/* PORTFOLIO ACCORDION: Reveals portfolios in gorgeous detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-white/5 pt-5 mt-5 space-y-4"
                      >
                        {/* Social handles container */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-white/5">
                          <span className="text-gray-500 font-bold">KONEKTIVITAS SOSIAL:</span>
                          {talent.socialMedia.instagram && (
                            <a
                              href={`https://instagram.com/${talent.socialMedia.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-gray-300 hover:text-brand-gold transition-colors"
                            >
                              <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                              <span>@{talent.socialMedia.instagram}</span>
                            </a>
                          )}
                          {talent.socialMedia.youtube && (
                            <a
                              href={`https://youtube.com/search?q=${encodeURIComponent(talent.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>YouTube</span>
                            </a>
                          )}
                          {talent.socialMedia.tiktok && (
                            <span className="text-gray-300 font-bold flex items-center gap-1">
                              <span className="text-sky-400">T:</span> @{talent.socialMedia.tiktok}
                            </span>
                          )}
                          {!talent.socialMedia.instagram && !talent.socialMedia.youtube && !talent.socialMedia.tiktok && (
                            <span className="text-gray-600 italic">Hanya komunikasi langsung (WhatsApp)</span>
                          )}
                        </div>

                        {/* Showcase Portfolio Grid */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono text-brand-gold uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <BookOpen className="w-4 h-4 text-brand-gold" /> Karya yang Dipromosikan ({personalArt.length})
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {personalArt.map((art) => (
                              <div
                                key={art.id}
                                onClick={() => {
                                  onExploreArtDetail(art);
                                  setActiveTab('gallery');
                                }}
                                className="group/art relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-white/10 hover:border-brand-gold cursor-pointer"
                              >
                                <img
                                  src={art.imageUrl}
                                  alt={art.title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-transparent to-transparent flex flex-col justify-end p-2.5">
                                  <h5 className="text-[10px] text-white font-extrabold tracking-tight line-clamp-1">{art.title}</h5>
                                  <span className="text-[8px] text-brand-gold mt-1 font-bold flex items-center gap-0.5 uppercase tracking-wide">
                                    Lihat Detail <ArrowUpRight className="w-2.5 h-2.5" />
                                  </span>
                                </div>
                              </div>
                            ))}
                            {personalArt.length === 0 && (
                              <div className="col-span-full border border-dashed border-white/5 rounded-2xl p-8 text-center text-xs text-gray-500 bg-slate-950/20">
                                Kreator ini belum mengunggah karya lukis atau kriya ke etalase utama adat.
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Footers controls: Expand & WhatsApp Collaborate */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-3 z-10 relative">
                  
                  <button
                    onClick={() => setSelectedTalentId(isExpanded ? null : talent.id)}
                    className={`text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                      isExpanded
                        ? 'bg-slate-950 hover:bg-neutral-900 text-white border border-white/10'
                        : 'bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/20'
                    }`}
                  >
                    {isExpanded ? 'Tutup Detail' : 'Lihat Portofolio'}
                  </button>

                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Rumah%20Adiksi,%20saya%20tertarik%20untuk%20berkolaborasi%20atau%20memesan%20karya%20dari%20seniman%20${encodeURIComponent(talent.name)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-gray-400 hover:text-white hover:underline flex items-center gap-1 transition-all"
                  >
                    Mulai Kolaborasi <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* No matching results state */}
      {filteredTalents.length === 0 && (
        <div className="text-center py-20 bg-brand-card/40 rounded-3xl border border-white/5 space-y-3">
          <span className="text-mono text-3xl block">🔍</span>
          <p className="text-gray-400 font-serif text-sm">Tidak ada talenta yang cocok dengan kriteria pencarian Anda.</p>
          <button 
            onClick={() => {
              setSearchField('');
              setSelectedSubLocation('all');
              setActiveGenre('all');
              setSelectedSkillTag(null);
            }} 
            className="text-xs font-mono font-bold border border-white/10 rounded-xl px-4 py-2 hover:bg-white/5 text-brand-gold"
          >
            Bersihkan Semua Filter
          </button>
        </div>
      )}

    </div>
  );
}
