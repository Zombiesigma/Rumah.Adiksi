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
  SlidersHorizontal,
  MessageSquare
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
  startChat?: (target: { userId?: string | null; userName?: string | null; userAvatar?: string | null; roomId?: string | null }) => void;
}

export default function TalentSection({
  talents,
  artworks,
  selectedTalentId,
  setSelectedTalentId,
  setActiveTab,
  onExploreArtDetail,
  startChat
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
    <div className="space-y-8 py-4 text-gray-900 font-sans">
      
      {/* Top Header & Interactive Stats Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-gray-150 pb-8">
        
        {/* Banner Left Details */}
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/25">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping" />
            <span className="text-[10px] font-sans font-bold text-brand-accent tracking-widest uppercase">DIREKTORI BAKAT NUSANTARA</span>
          </div>
          
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-brand-green tracking-tight leading-tight">
            Direktori Talenta & Seniman <br className="hidden sm:inline" />
            <span className="text-brand-accent font-black">
              Pelabuhan Ratu
            </span>
          </h2>
          
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed max-w-2xl font-normal">
            Wadah kurasi bagi pemuda tani, musisi indie pesisir, budayawan, pengrajin akar kayu, desainer kontemporer, dan kreator kustom Pelabuhan Ratu. Jelajahi portofolio orisinil mereka dan jalin kolaborasi karya yang mandiri.
          </p>
        </div>

        {/* Banner Right Statistics - Bento Block */}
        <div className="lg:col-span-4 bg-white border border-gray-200 p-5 rounded-3xl grid grid-cols-2 gap-4 w-full shadow-sm relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full filter blur-xl" />
          
          <div className="col-span-2 flex items-center gap-2 border-b border-gray-150 pb-2.5">
            <TrendingUp className="w-4 h-4 text-brand-accent" />
            <span className="text-[10px] font-sans font-extrabold text-brand-green uppercase tracking-wider">EKOSISTEM BERDAYA</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 font-sans block uppercase">TOTAL TALENTA</span>
            <span className="text-2xl font-sans font-black text-brand-green block leading-none">{totalTalentsCount}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 font-sans block uppercase">KARYA DIPILIH</span>
            <span className="text-2xl font-sans font-black text-brand-accent block leading-none">{totalPortfoliosCount}</span>
          </div>

          <div className="space-y-1 border-t border-gray-150 pt-2">
            <span className="text-[9px] text-gray-400 font-sans block uppercase">HERITAGE TRADISI</span>
            <span className="text-xs font-bold text-amber-655 block">{traditionalCount} Preserver</span>
          </div>

          <div className="space-y-1 border-t border-gray-150 pt-2">
            <span className="text-[9px] text-gray-400 font-sans block uppercase">FUSION & MODERN</span>
            <span className="text-xs font-bold text-emerald-600 block">{modernCount + fusionCount} Kreator</span>
          </div>
        </div>

      </div>

      {/* Advanced Control & Filter Panel */}
      <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-5 shadow-sm">
        
        {/* Filters Top Bar */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between pb-4 border-b border-gray-150">
          
          {/* Main Genre Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-gray-50 rounded-full border border-gray-200">
            <button
              onClick={() => setActiveGenre('all')}
              className={`px-4 py-2 rounded-full text-xs font-sans font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'all' ? 'bg-brand-accent text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/30'}`}
            >
              <Compass className="w-3.5 h-3.5" /> Semua Aliran
            </button>
            <button
              onClick={() => setActiveGenre('tradisi')}
              className={`px-4 py-2 rounded-full text-xs font-sans font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'tradisi' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-650 hover:text-gray-900 hover:bg-gray-200/30'}`}
            >
              🏛️ Warisan Tradisi
            </button>
            <button
              onClick={() => setActiveGenre('modern')}
              className={`px-4 py-2 rounded-full text-xs font-sans font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'modern' ? 'bg-sky-650 text-white shadow-sm' : 'text-gray-655 hover:text-gray-900 hover:bg-gray-200/30'}`}
            >
              ⚡ Inovasi Modern
            </button>
            <button
              onClick={() => setActiveGenre('fusion')}
              className={`px-4 py-2 rounded-full text-xs font-sans font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${activeGenre === 'fusion' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-655 hover:text-gray-900 hover:bg-gray-200/30'}`}
            >
              🎛️ Fusion Mix
            </button>
          </div>

          {/* District sub-locations tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-sans font-bold text-gray-550 uppercase flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" /> Wilayah:
            </span>
            <button
              onClick={() => setSelectedSubLocation('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                selectedSubLocation === 'all'
                  ? 'bg-brand-accent text-white border border-brand-accent shadow-sm'
                  : 'text-gray-600 bg-gray-50 border border-gray-200/60 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Semua Wilayah
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedSubLocation(loc)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                  selectedSubLocation === loc
                    ? 'bg-brand-accent text-white border border-brand-accent shadow-sm'
                    : 'text-gray-600 bg-gray-50 border border-gray-200/60 hover:text-gray-900 hover:bg-gray-100'
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
          <div className="md:col-span-4 relative w-full">
            <span className="absolute left-3.5 top-3 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari talenta, jenis keahlian..."
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 rounded-full"
            />
            {searchField && (
              <button 
                onClick={() => setSearchField('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Popular Skills Cloud */}
          <div className="md:col-span-8 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-sans font-bold text-gray-550 uppercase flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="w-3 h-3 text-gray-400" /> Rekomendasi Tag:
            </span>
            
            <div className="flex flex-wrap gap-1.5 animate-fade-in">
              {popularSkills.map((skill) => {
                const isSelected = selectedSkillTag === skill;
                return (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkillTag(isSelected ? null : skill)}
                    className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-accent border-brand-accent text-white shadow-sm' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    #{skill}
                  </button>
                );
              })}
              {selectedSkillTag && (
                <button
                  onClick={() => setSelectedSkillTag(null)}
                  className="px-2.5 py-1 text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-full flex items-center gap-0.5 font-bold transition-all"
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
                    ? 'bg-[#F1F8F5] border-brand-accent/60 shadow-lg md:col-span-2 lg:col-span-3'
                    : 'bg-white border-gray-150 hover:border-brand-accent/40 hover:bg-[#F9FAF9] shadow-sm'
                }`}
                id={`talent-card-${talent.id}`}
              >
                
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/[0.02] rounded-full filter blur-2xl group-hover:bg-brand-accent/[0.04] transition-all" />

                <div className="space-y-4">
                  
                  {/* Card Front Top Metadata & Likes Upvote Row */}
                  <div className="flex justify-between items-center z-10 relative">
                    
                    {/* Classification Glow Badges */}
                    {classification === 'tradisi' ? (
                      <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-[8px] font-sans text-amber-700 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        🏛️ Warisan Tradisi
                      </span>
                    ) : classification === 'fusion' ? (
                      <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[8px] font-sans text-emerald-700 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        🎛️ Fusion Genre
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-sky-50 border border-sky-200 text-[8px] font-sans text-sky-700 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        ⚡ Inovasi Modern
                      </span>
                    )}

                    {/* Upvote support action trigger */}
                    <button
                      onClick={(e) => handleLikeTalent(talent.id, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold transition-all active:scale-95 cursor-pointer border ${
                        hasLiked 
                          ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' 
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'
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
                      <div className={`absolute -inset-1 rounded-full blur-md opacity-20 group-hover:opacity-60 transition-opacity duration-300 ${classification === 'tradisi' ? 'bg-amber-500' : classification === 'fusion' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                      
                      <img
                        src={talent.avatarUrl}
                        alt={talent.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className={`w-14 h-14 rounded-full object-cover relative z-10 border-2 ${classification === 'tradisi' ? 'border-amber-500/50 shadow-sm' : classification === 'fusion' ? 'border-emerald-500/50' : 'border-sky-500/50'}`}
                      />
                    </div>

                    {/* Basic Identity Details */}
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-sans text-md font-extrabold text-brand-green group-hover:text-brand-accent transition-colors truncate flex items-center gap-1.5">
                        {talent.name}
                        <CheckCircle className="w-3.5 h-3.5 text-brand-accent shrink-0" title="Kreator Terverifikasi" />
                      </h3>
                      
                      <p className="text-xs font-sans text-gray-600 font-bold flex items-center gap-1 truncate uppercase">
                        <Award className="w-3 h-3 text-brand-accent shrink-0" /> {talent.field}
                      </p>
                      
                      <div className="text-[10px] text-gray-400 font-sans flex items-center gap-0.5 truncate">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {talent.location}
                      </div>
                    </div>

                  </div>

                  {/* Creative Narrative Bio */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-150 relative">
                    <p className={`text-xs text-gray-600 leading-relaxed font-sans ${isExpanded ? '' : 'line-clamp-3'}`}>
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
                          className={`text-[9px] font-sans px-2.5 py-0.5 cursor-pointer rounded-full transition-all border ${
                            isFilteringByThis 
                              ? 'bg-brand-accent border-brand-accent text-white font-black' 
                              : 'bg-white text-gray-550 border-gray-200 hover:border-brand-accent/50 hover:text-gray-900'
                          }`}
                        >
                          #{skill}
                        </span>
                      );
                    })}
                    {talent.skills.length > 5 && (
                      <span className="text-[9px] font-sans px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">
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
                        className="overflow-hidden border-t border-gray-150 pt-5 mt-5 space-y-4"
                      >
                        {/* Social handles container */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-sans bg-white p-2.5 rounded-2xl border border-gray-150">
                          <span className="text-gray-400 font-bold">KONEKTIVITAS SOSIAL:</span>
                          {talent.socialMedia.instagram && (
                            <a
                              href={`https://instagram.com/${talent.socialMedia.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-gray-650 hover:text-brand-accent transition-colors font-bold"
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
                              className="flex items-center gap-1.5 text-gray-650 hover:text-red-600 transition-colors font-bold"
                            >
                              <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>YouTube</span>
                            </a>
                          )}
                          {talent.socialMedia.tiktok && (
                            <span className="text-gray-600 font-bold flex items-center gap-1">
                              <span className="text-emerald-600">T:</span> @{talent.socialMedia.tiktok}
                            </span>
                          )}
                          {!talent.socialMedia.instagram && !talent.socialMedia.youtube && !talent.socialMedia.tiktok && (
                            <span className="text-gray-400 italic">Hanya komunikasi langsung (WhatsApp)</span>
                          )}
                          {startChat && (
                            <button
                              onClick={() => startChat({ userId: talent.id, userName: talent.name })}
                              className="px-3 py-1.5 bg-brand-accent/10 hover:bg-brand-accent hover:text-white text-brand-accent border border-brand-accent/20 hover:border-transparent rounded-full text-[10px] uppercase font-sans font-bold flex items-center gap-1 transition-all cursor-pointer ml-auto shrink-0 select-none"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Pesan Privat (Live Chat)
                            </button>
                          )}
                        </div>

                        {/* Showcase Portfolio Grid */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-sans text-brand-green uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <BookOpen className="w-4 h-4 text-brand-green" /> Karya yang Dipromosikan ({personalArt.length})
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {personalArt.map((art) => (
                              <div
                                key={art.id}
                                onClick={() => {
                                  onExploreArtDetail(art);
                                  setActiveTab('gallery');
                                }}
                                className="group/art relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 hover:border-brand-accent cursor-pointer"
                              >
                                <img
                                  src={art.imageUrl}
                                  alt={art.title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-brand-green/90 via-transparent to-transparent flex flex-col justify-end p-2.5">
                                  <h5 className="text-[10px] text-white font-extrabold tracking-tight line-clamp-1">{art.title}</h5>
                                  <span className="text-[8px] text-brand-accent mt-1 font-bold flex items-center gap-0.5 uppercase tracking-wide">
                                    Lihat Detail <ArrowUpRight className="w-2.5 h-2.5" />
                                  </span>
                                </div>
                              </div>
                            ))}
                            {personalArt.length === 0 && (
                              <div className="col-span-full border border-dashed border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-400 bg-gray-50/50">
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
                <div className="mt-5 pt-4 border-t border-gray-150 flex items-center justify-between gap-3 z-10 relative">
                  
                  <button
                    onClick={() => setSelectedTalentId(isExpanded ? null : talent.id)}
                    className={`text-xs font-sans font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                      isExpanded
                        ? 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300'
                        : 'bg-brand-accent/15 hover:bg-brand-accent text-brand-accent hover:text-white border border-brand-accent/20'
                    }`}
                  >
                    {isExpanded ? 'Tutup Detail' : 'Lihat Portofolio'}
                  </button>

                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Rumah%20Adiksi,%20saya%20tertarik%20untuk%20berkolaborasi%20atau%20memesan%20karya%20dari%20seniman%20${encodeURIComponent(talent.name)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-sans font-bold text-gray-500 hover:text-brand-accent hover:underline flex items-center gap-1 transition-all"
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
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-150 space-y-3">
          <span className="text-3xl block">🔍</span>
          <p className="text-gray-550 font-sans text-sm">Tidak ada talenta yang cocok dengan kriteria pencarian Anda.</p>
          <button 
            onClick={() => {
              setSearchField('');
              setSelectedSubLocation('all');
              setActiveGenre('all');
              setSelectedSkillTag(null);
            }} 
            className="text-xs font-sans font-bold border border-brand-accent/30 rounded-full px-4 py-2 hover:bg-brand-accent/5 text-brand-accent transition-all cursor-pointer"
          >
            Bersihkan Semua Filter
          </button>
        </div>
      )}

    </div>
  );
}
