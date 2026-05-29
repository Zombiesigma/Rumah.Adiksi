/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  Award,
  Pin,
  Instagram,
  Youtube,
  BookOpen,
  Plus,
  Trash2,
  FolderPlus,
  Image,
  CheckCircle,
  AlertCircle,
  Eye,
  Heart,
  ExternalLink,
  ChevronRight,
  MapPin,
  Settings,
  Globe,
  Share2,
  Video,
  ShoppingBag,
  Clock,
  ArrowLeft,
  Users,
  Palette,
  MessageSquare
} from 'lucide-react';
import { Talent, GalleryItem } from '../types';
import { db, auth, handleFirestoreError, OperationType, cleanUndefined } from '../lib/firebase';
import { doc, setDoc, deleteDoc, collection, query, where, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { showSuccessToast, showConfirmDialog, showErrorToast } from '../lib/alerts';
import CloudUploader from './CloudUploader';

interface ProfileSectionProps {
  currentUser: any;
  userRole: 'user' | 'admin' | null;
  talents: Talent[];
  artworks: GalleryItem[];
  openAuthModal: () => void;
  triggerToast: (msg: string) => void;
  setActiveTab: (tab: string) => void;
  startChat?: (target: { userId?: string | null; userName?: string | null; userAvatar?: string | null; roomId?: string | null }) => void;
}

export default function ProfileSection({
  currentUser,
  userRole,
  talents,
  artworks,
  openAuthModal,
  triggerToast,
  setActiveTab,
  startChat
}: ProfileSectionProps) {
  const [loading, setLoading] = useState(false);
  const [showArtworkForm, setShowArtworkForm] = useState(false);
  const [viewMode, setViewMode] = useState<'public' | 'editor' | 'dashboard'>('public');

  const [profileName, setProfileName] = useState('');
  const [profileField, setProfileField] = useState('Seni Rupa');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileLocation, setProfileLocation] = useState('Pelabuhan Ratu - Citepus');
  const [skillsInput, setSkillsInput] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');

  const [artTitle, setArtTitle] = useState('');
  const [artType, setArtType] = useState<'painting' | 'music' | 'photography' | 'craft' | 'digital'>('painting');
  const [artPrice, setArtPrice] = useState('');
  const [artDescription, setArtDescription] = useState('');
  const [artImageUrl, setArtImageUrl] = useState('');

  const [filterCategory, setFilterCategory] = useState<string>('all');

  const userTalent = currentUser ? talents.find((t) => t.id === currentUser.uid) : null;

  useEffect(() => {
    if (currentUser) {
      if (userTalent) {
        setProfileName(userTalent.name || currentUser.displayName || '');
        setProfileField(userTalent.field || 'Seni Rupa');
        setProfileBio(userTalent.bio || '');
        setProfileAvatarUrl(userTalent.avatarUrl || currentUser.photoURL || '');
        setProfileLocation(userTalent.location || 'Pelabuhan Ratu - Citepus');
        setSkillsInput(userTalent.skills ? userTalent.skills.join(', ') : '');
        setInstagram(userTalent.socialMedia?.instagram || '');
        setYoutube(userTalent.socialMedia?.youtube || '');
        setTiktok(userTalent.socialMedia?.tiktok || '');
      } else {
        setProfileName(currentUser.displayName || '');
        setProfileAvatarUrl(currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80');
        setProfileField('Seni Rupa');
        setProfileBio('');
        setProfileLocation('Pelabuhan Ratu - Citepus');
        setSkillsInput('');
        setInstagram('');
        setYoutube('');
        setTiktok('');
      }
    }
  }, [currentUser, userTalent]);

  const [myOrders, setMyOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      ordersData.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setMyOrders(ordersData);
    });

    return () => unsub();
  }, [currentUser]);

  const [myPosts, setMyPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setMyPosts(postsData);
    }, (error) => {
      console.error("Gagal mendapatkan posts saya:", error);
    });
    return () => unsub();
  }, [currentUser]);

  const handleLaunchCollaboration = async (post: any) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // 1. Update the post status to 'running'
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        status: 'running'
      });
      
      // 2. Identify participants
      const memberUids = Object.values(post.collaborativeMemberUids || {}) as string[];
      const uniqueParticipants = Array.from(new Set([currentUser.uid, ...memberUids])).filter(uid => !!uid);
      
      // 3. Setup Group Chat metadata
      const groupId = `group_${post.id}`;
      const groupChatPayload = {
        id: groupId,
        type: 'group',
        title: `🎨 Kolaborasi: ${post.title}`,
        avatarUrl: post.imageUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=150',
        participants: uniqueParticipants,
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Kreator Adiksi',
          ...Object.entries(post.collaborativeMembers || {}).reduce((acc: any, [role, name]: any) => {
            const uId = post.collaborativeMemberUids?.[role];
            if (uId) {
              acc[uId] = name;
            }
            return acc;
          }, {})
        },
        participantAvatars: {
          [currentUser.uid]: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
        },
        lastMessage: 'Proyek resmi dimulai! Chat grup telah dibuka! 🚀',
        lastMessageTime: new Date().toISOString(),
        lastMessageSenderId: currentUser.uid,
        createdAt: new Date().toISOString(),
        associatedPostId: post.id,
        status: 'running'
      };
      
      // Save metadata
      const chatDocRef = doc(db, 'chats', groupId);
      await setDoc(chatDocRef, groupChatPayload);
      
      // 4. Send automated first message to subcollection messages
      const msgRef = collection(db, 'chats', groupId, 'messages');
      await addDoc(msgRef, {
        senderId: currentUser.uid,
        senderName: 'Sistem Adiksi',
        senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
        text: `PROYEK DI GAS SEKARANG! 🚀: Kolaborasi '${post.title}' resmi diluncurkan oleh ${currentUser.displayName}! Mari berdiskusi tentang tahap selanjutnya di sini.`,
        timestamp: new Date().toISOString(),
        isSystem: true
      });
      
      triggerToast("Proyek Kolaborasi resmi DI GAS! Chat Grup Seni berhasil dibuat! 🚀");
      
      if (startChat) {
        startChat({ roomId: groupId });
      } else {
        setActiveTab('chat');
      }
    } catch (err) {
      console.error("Gagal meluncurkan kolaborasi:", err);
      triggerToast("Gagal memulai proyek kolaborasi.");
    } finally {
      setLoading(false);
    }
  };

  const userArtworks = currentUser
    ? artworks.filter((art) => art.artistId === currentUser.uid)
    : [];

  const filteredUserArtworks = userArtworks.filter(
    (art) => filterCategory === 'all' || art.type === filterCategory
  );

  const totalArtworksCount = userArtworks.length;
  const cumulativeViewsCount = userArtworks.reduce((acc, art) => acc + (art.views || 0), 0);
  const cumulativeLikesCount = userArtworks.reduce((acc, art) => acc + (art.likes || 0), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileName.trim() || !profileField.trim() || !profileBio.trim()) {
      triggerToast('Nama, Bidang, dan Biodata wajib diisi!');
      return;
    }

    setLoading(true);

    const skillsArray = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const talentPayload: Talent = {
      id: currentUser.uid,
      name: profileName.trim(),
      field: profileField.trim(),
      bio: profileBio.trim(),
      avatarUrl: profileAvatarUrl.trim() || currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80',
      location: profileLocation,
      skills: skillsArray,
      portfolioIds: userArtworks.map((art) => art.id),
      socialMedia: {
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
        tiktok: tiktok.trim() || undefined,
      }
    };

    try {
      await setDoc(doc(db, 'talents', currentUser.uid), cleanUndefined(talentPayload));
      if (profileAvatarUrl.trim()) {
        await setDoc(doc(db, 'users', currentUser.uid), { photoURL: profileAvatarUrl.trim() }, { merge: true });
        if (auth.currentUser && auth.currentUser.uid === currentUser.uid) {
          await updateProfile(auth.currentUser, { photoURL: profileAvatarUrl.trim() });
        }
      }
      showSuccessToast('Profil disimpan', 'Perubahan profil Anda berhasil disimpan.');
    } catch (err: any) {
      console.error(err);
      showErrorToast('Gagal menyimpan profil', err.message || 'Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!artTitle.trim() || !artDescription.trim()) {
      triggerToast('Judul dan Deskripsi karya wajib diisi!');
      return;
    }
    if (!artImageUrl) {
      triggerToast('Gambar karya wajib diunggah!');
      return;
    }

    setLoading(true);
    const newId = `art-user-${Date.now()}`;

    const artworkPayload: GalleryItem = {
      id: newId,
      title: artTitle.trim(),
      artistId: currentUser.uid,
      artistName: profileName.trim() || currentUser.displayName || 'Kreator Adiksi',
      type: artType,
      price: artPrice ? parseInt(artPrice, 10) : undefined,
      description: artDescription.trim(),
      imageUrl: artImageUrl,
      isSold: false,
      likes: 0,
      views: 1,
      createdDate: new Date().toISOString().split('T')[0]
    };

    try {
      await setDoc(doc(db, 'artworks', newId), cleanUndefined(artworkPayload));
      
      if (userTalent) {
        const updatedPortfolioIds = [...(userTalent.portfolioIds || []), newId];
        await setDoc(doc(db, 'talents', currentUser.uid), { portfolioIds: updatedPortfolioIds }, { merge: true });
      }

      showSuccessToast('Karya berhasil dibuat', `"${artTitle}" telah tersimpan ke galeri Anda.`);
      setArtTitle('');
      setArtPrice('');
      setArtDescription('');
      setArtImageUrl('');
      setShowArtworkForm(false);
    } catch (err: any) {
      console.error(err);
      showErrorToast('Gagal menyimpan karya', err.message || 'Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArtwork = async (artId: string, artTitle: string) => {
    const confirmation = await showConfirmDialog('Hapus Karya', `Apakah Anda yakin ingin menghapus karya "${artTitle}" dari galeri?`, 'Ya, hapus', 'Tidak');
    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'artworks', artId));
      
      if (userTalent) {
        const updatedPortfolioIds = (userTalent.portfolioIds || []).filter((id) => id !== artId);
        await setDoc(doc(db, 'talents', currentUser.uid), { portfolioIds: updatedPortfolioIds }, { merge: true });
      }

      showSuccessToast('Karya Dihapus', `"${artTitle}" berhasil dihapus dari galeri Anda.`);
    } catch (err: any) {
      console.error(err);
      showErrorToast('Gagal menghapus karya', err.message || 'Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto border border-brand-gold/20">
          <UserIcon className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-white tracking-tight">Portofolio Kreator Pesisir</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Halaman ini khusus bagi pemuda tani, seniman pesisir, pengrajin bambu, dan musisi lokal untuk mempublikasikan portofolio karya mereka langsung ke Direktori Bakat Utama.
          </p>
        </div>
        <button
          onClick={openAuthModal}
          className="px-6 py-3 bg-gradient-to-r from-brand-gold to-amber-500 hover:from-white hover:to-white text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
        >
          Masuk Sekarang untuk Membuat Portofolio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-4 max-w-5xl mx-auto">
      <div className="border-b border-white/5 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-mono text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-brand-gold animate-pulse" /> CREATOR STUDIO & PERSISTENCE
          </span>
          <h2 className="font-serif text-3xl font-bold text-white tracking-tight">Studio Kreator Anda</h2>
          <p className="text-xs text-gray-400 max-w-xl">
            Sajikan profil publik terbaik Anda kepada khalayak. Switchnya memberi Anda pratinjau instan bagaimana portofolio Anda dion-boarding ke <strong className="text-brand-gold">Direktori Bakat</strong>.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setViewMode('public')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'public'
                  ? 'bg-brand-gold text-brand-charcoal shadow-md scale-105'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Tampilan Publik (Preview)
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-brand-gold text-brand-charcoal shadow-md scale-105'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Edit Profil
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'dashboard'
                  ? 'bg-brand-gold text-brand-charcoal shadow-md scale-105'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Dasbor Kreator
            </button>
          </div>

          <button
            onClick={() => setActiveTab('talents')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            Lihat Direktori Bakat <ChevronRight className="w-4 h-4 text-brand-gold" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4 transition-all hover:border-brand-gold/20">
          <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center border border-brand-gold/20 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Total Karya</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalArtworksCount} <span className="text-xs text-gray-500 font-normal">Karya Seni</span></div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4 transition-all hover:border-amber-500/20">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/25 shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Kumulatif View</div>
            <div className="text-2xl font-bold text-white mt-0.5">{cumulativeViewsCount} <span className="text-xs text-gray-500 font-normal">Kali Dilihat</span></div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4 transition-all hover:border-rose-500/20">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/25 shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Apresiasi Cinta</div>
            <div className="text-2xl font-bold text-white mt-0.5">{cumulativeLikesCount} <span className="text-xs text-gray-500 font-normal">Suka & Dukungan</span></div>
          </div>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <div className="space-y-8 animate-fadeIn text-left">
          {/* Header banner describing dashboard */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-brand-gold/15 p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/[0.03] rounded-full filter blur-3xl p-0" />
            <div className="space-y-1 relative">
              <h3 className="font-serif text-2xl font-black text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-brand-gold animate-bounce" /> Hub Dasbor Kreator
              </h3>
              <p className="text-xs text-gray-400 max-w-lg leading-relaxed">
                Kelola portofolio karya seni, analisis engagement publik, pantau status pendaftaran workshop, serta koordinasikan rekrutmen kolaborasi aktif Anda di sini.
              </p>
            </div>
            <button 
              onClick={() => setViewMode('public')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start md:self-auto"
            >
              <ArrowLeft className="w-4 h-4 text-brand-gold" /> Kembali ke Profil
            </button>
          </div>

          {/* Section Grid: Artworks list on Left (or top) & Forum Posts on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMN 1: MANAGE PORTFOLIO ARTWORKS */}
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-brand-gold" /> Karya yang Diunggah ({userArtworks.length})
                </h4>
                <button
                  onClick={() => {
                    setViewMode('public');
                    setShowArtworkForm(true);
                  }}
                  className="px-2.5 py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/20 rounded-xl text-[10px] uppercase font-mono font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Unggah Baru
                </button>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {userArtworks.length > 0 ? (
                  userArtworks.map((art) => {
                    const artRating = art.ratings && art.ratings.length > 0
                      ? (art.ratings.reduce((sum, r) => sum + r.score, 0) / art.ratings.length).toFixed(1)
                      : null;

                    return (
                      <div 
                        key={art.id} 
                        className="p-3 bg-slate-950/80 border border-white/5 rounded-2xl flex items-center justify-between gap-4 transition-all hover:border-brand-gold/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={art.imageUrl} 
                            alt={art.title} 
                            className="w-12 h-12 rounded-xl object-cover border border-white/5 shrink-0 bg-slate-900"
                          />
                          <div className="min-w-0 space-y-0.5 text-left">
                            <h5 className="text-xs font-extrabold text-white truncate">{art.title}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                              <span className="uppercase text-brand-gold font-bold">{art.type}</span>
                              <span>•</span>
                              <span>{art.price ? `Rp ${art.price.toLocaleString('id-ID')}` : 'Pameran'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                          <div className="text-right text-gray-400 space-y-0.5">
                            <div className="flex items-center gap-1 justify-end">
                              <Eye className="w-3 h-3 text-gray-500" /> {art.views || 0}
                            </div>
                            <div className="flex items-center gap-1 justify-end">
                              <Heart className="w-3 h-3 text-rose-500" /> {art.likes || 0}
                            </div>
                          </div>
                          
                          {artRating && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded font-bold">
                              ★ {artRating}
                            </span>
                          )}

                          <button
                            onClick={async () => {
                              const confirm = await showConfirmDialog("Sertifikasi Hapus Karya", `Apakah Anda yakin ingin menghapus karya seni "${art.title}" secara permanen dari galeri dan database?`, 'Ya, Hapus', 'Batal');
                              if (confirm.isConfirmed) {
                                try {
                                  setLoading(true);
                                  await deleteDoc(doc(db, 'artworks', art.id));
                                  triggerToast("Karya seni berhasil dihapus.");
                                } catch (err) {
                                  showErrorToast("Gagal menghapus karya.", "Koneksi database terganggu.");
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white rounded-xl transition cursor-pointer"
                            title="Hapus Karya"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <Plus className="w-6 h-6 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs text-gray-400 font-bold">Belum Ada Karya Terunggah</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed px-4">Unggah lukisan, musik, digital craft Anda untuk dipasarkan ke penikmat seni.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: MANAGE FORUM POSTS, WORKSHOPS & COLLABORATIVE GAS */}
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Users className="w-5 h-5 text-brand-gold animate-pulse" /> Postingan Forum Komunitas ({myPosts.length})
              </h4>

              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {myPosts.length > 0 ? (
                  myPosts.map((post) => {
                    const isCollab = post.group === 'Kolaborasi';
                    const isWorkshop = post.group === 'Workshop';
                    const rolesList = post.rolesNeeded || [];
                    const claimedCount = Object.keys(post.collaborativeMembers || {}).length;
                    const isRunning = post.status === 'running';

                    return (
                      <div 
                        key={post.id} 
                        className="p-4 bg-slate-950/80 border border-white/5 rounded-2xl space-y-3 transition-all hover:border-brand-gold/10"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${isCollab ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : isWorkshop ? 'bg-violet-500/10 text-violet-400 border-violet-500/25' : 'bg-sky-505/10 text-sky-400 border-sky-500/25'}`}>
                                {post.group}
                              </span>
                              {isRunning && (
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border bg-orange-500/10 text-brand-gold border-brand-gold/20 animate-pulse flex items-center gap-1">
                                  🚀 AKTIF BERJALAN
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-extrabold text-white truncate leading-snug">{post.title}</h5>
                          </div>
                          
                          <button
                            onClick={async () => {
                              const confirm = await showConfirmDialog("Hapus Postingan Forum", "Hapus postingan diskusi ini secara permanen?", "Ya, Hapus", "Batal");
                              if (confirm.isConfirmed) {
                                try {
                                  setLoading(true);
                                  await deleteDoc(doc(db, 'posts', post.id));
                                  triggerToast("Postingan forum berhasil dihapus.");
                                } catch (err) {
                                  showErrorToast("Gagal menghapus postingan.", "Koneksi database terganggu.");
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            className="p-1.5 bg-white/5 hover:bg-rose-500 text-gray-400 hover:text-white rounded-lg transition shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* If Collaboration: Role status and GAS button */}
                        {isCollab && (
                          <div className="space-y-3 border-t border-white/5 pt-3">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-gray-400">Perekrutan Peran: <strong className="text-white">{claimedCount} / {rolesList.length}</strong> Terisi</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-left">
                              {rolesList.map((role: string) => {
                                const claimerName = post.collaborativeMembers?.[role];
                                const claimerUid = post.collaborativeMemberUids?.[role];

                                return (
                                  <div key={role} className="p-1.5 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-between gap-1.5">
                                    <div className="min-w-0">
                                      <span className="text-[9px] text-gray-500 uppercase block leading-none">{role}</span>
                                      <span className={claimerName ? "text-emerald-400 font-bold truncate block" : "text-gray-600 truncate block"}>
                                        {claimerName || 'Belum Terisi'}
                                      </span>
                                    </div>
                                    {claimerName && claimerUid && startChat && (
                                      <button
                                        onClick={() => startChat({ userId: claimerUid, userName: claimerName })}
                                        className="p-1 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-brand-charcoal rounded transition"
                                        title={`Kirim Pesan ke ${claimerName}`}
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Launch now section ("apakah bisa di gas langsung") */}
                            {!isRunning ? (
                              <button
                                disabled={claimedCount === 0 || loading}
                                onClick={() => handleLaunchCollaboration(post)}
                                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 cursor-pointer"
                              >
                                🚀 GAS SEKARANG! (Mulai Proyek)
                              </button>
                            ) : (
                              <div className="p-2.5 bg-slate-900 border border-brand-gold/10 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                                <span className="text-gray-400 text-[10px]">Chat Proyek Kolaborasi Aktif Berjalan</span>
                                <button
                                  onClick={() => startChat ? startChat({ roomId: `group_${post.id}` }) : setActiveTab('chat')}
                                  className="px-2.5 py-1 bg-brand-gold hover:bg-white text-brand-charcoal font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
                                >
                                  Masuk Chat <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* If Workshop: quota and registration list */}
                        {isWorkshop && (
                          <div className="text-[11px] font-mono text-left border-t border-white/5 pt-3 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Terregistrasi:</span>
                              <span className="font-bold text-violet-400">{(post.registeredParticipants || []).length} Orang</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Kuota/Fee:</span>
                              <span className="text-white">{post.workshopQuota || 'Unlimited'} @ {post.workshopFee || 'Gratis'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <MessageSquare className="w-6 h-6 mx-auto text-gray-650 mb-1" />
                    <p className="text-xs text-gray-400 font-bold">Belum Ada Postingan Komunitas</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed px-4">Tulis gagasan kolaborasi, tanya diskusi rujukan, atau program edukasi workshop seni.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-7 space-y-6">
          {viewMode === 'public' ? (
            <div className="space-y-6">
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="h-28 bg-gradient-to-r from-teal-900/20 via-brand-gold/10 to-amber-900/20 relative border-b border-white/5 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,166,61,0.15),transparent_60%)]" />
                  <span className="absolute top-4 right-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[8px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-sm">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> PREVIEW PROFIL PUBLIK
                  </span>
                </div>

                <div className="relative px-6 pb-6 pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-5 relative z-10">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-brand-gold shadow-lg group">
                      <img
                        src={profileAvatarUrl || currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80'}
                        alt={profileName || 'Avatar'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {instagram && (
                        <a
                          href={`https://instagram.com/${instagram}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-purple-600 hover:to-indigo-500 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {youtube && (
                        <a
                          href={`https://youtube.com/${youtube}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-rose-600 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                      {tiktok && (
                        <a
                          href={`https://tiktok.com/@${tiktok}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-cyan-600 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                        >
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                      {!instagram && !youtube && !tiktok && (
                        <span className="text-[9px] font-mono text-gray-500 italic">Medsos belum ditautkan</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
                          {profileName || currentUser?.displayName || 'Nama Seniman'}
                        </h3>
                        {userRole === 'admin' && (
                          <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1 text-xs text-brand-gold font-mono font-bold uppercase tracking-wide">
                          <Award className="w-3.5 h-3.5 text-brand-gold shrink-0" /> {profileField}
                        </span>
                        <span className="w-1 h-1 bg-white/10 rounded-full hidden sm:inline" />
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium font-mono">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" /> {profileLocation}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                      <div className="absolute -right-2 -bottom-2 opacity-10">
                        <Award className="w-20 h-20 text-brand-gold" />
                      </div>
                      <h4 className="text-[9px] font-mono text-brand-gold uppercase tracking-widest font-black mb-1.5">KISAH & BIOGRAFI KREATOR</h4>
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-serif italic">
                        {profileBio || 'Lengkapi cerita Anda dengan merekam narasi perjuangan, visi, dan proses lahirnya karya tradisional di daerah Pelabuhan Ratu. Edit profil sekarang untuk memperbarui.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-bold">KEAHLIAN UTAMA & SPESIALISASI</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {skillsInput ? (
                          skillsInput.split(',').map((s) => s.trim()).filter((s) => s).map((sku) => (
                            <span
                              key={sku}
                              className="text-[10px] font-mono bg-white/5 hover:bg-brand-gold/10 hover:text-brand-gold border border-white/10 hover:border-brand-gold/25 transition-all text-gray-300 px-2.5 py-1 rounded-xl"
                            >
                              ✨ {sku}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-gray-500 italic">Belum mengisi keahlian khusus</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 bg-slate-950/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-mono text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-brand-gold animate-bounce" />
                    <span>Dionboarding-kan: <strong className="text-gray-400">Aktif & Siap Kolaborasi</strong></span>
                  </div>
                  <button
                    onClick={() => setViewMode('editor')}
                    className="text-brand-gold hover:text-white transition-colors flex items-center gap-1 font-bold underline cursor-pointer self-start sm:self-auto"
                  >
                    Sesuaikan Info & Tautan Ini <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-6">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Award className="w-5 h-5 text-brand-gold" /> Informasi Identitas & Bakat
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Nama Publik Seniman *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sanggar Bagas atau Jaka Samudra"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Bidang Kreativitas *</label>
                  <select
                    value={profileField}
                    onChange={(e) => setProfileField(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60 transition-colors"
                  >
                    <option value="Seni Rupa & Lukis">Seni Rupa & Lukis</option>
                    <option value="Musik Tradisional / Modern">Musik Tradisional / Modern</option>
                    <option value="Kerajinan Tangan (Kriya)">Kerajinan Tangan (Kriya)</option>
                    <option value="Seni Fotografi & Sinematik">Seni Fotografi & Sinematik</option>
                    <option value="Desainer Kreatif & Digital">Desainer Kreatif & Digital</option>
                    <option value="Kebudayaan & Seni Pertunjukan">Kebudayaan & Seni Pertunjukan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Wilayah (Asal Kampung) *</label>
                  <select
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60 transition-colors"
                  >
                    <option value="Pelabuhan Ratu - Citepus">Citepus</option>
                    <option value="Pelabuhan Ratu - Cisolok">Cisolok</option>
                    <option value="Pelabuhan Ratu - Karanghawu">Karanghawu</option>
                    <option value="Pelabuhan Ratu - Cimaja">Cimaja</option>
                    <option value="Pelabuhan Ratu - Cikakak">Cikakak</option>
                    <option value="Pelabuhan Ratu - Jampang">Jampang</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <CloudUploader onSuccess={(result) => setProfileAvatarUrl(result.url)} folder="avatars" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Keahlian Utama (Pisahkan dengan Koma) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lukisan Minyak, Ukir Bambu, Gitaris Akustik, Sinematografi Alam"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Biografi & Kisah Kreator *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ceritakan latar belakang Anda, visi seni Anda, dan bagaimana karya Anda terinspirasi dari alam pesisir Pelabuhan Ratu..."
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60 resize-none"
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-white/5">
                <label className="text-[10px] font-mono text-brand-gold uppercase tracking-wider block">Sosial Media & Jaringan (Opsional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-500 font-mono">IG:</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-500 font-mono">YT:</span>
                    <input
                      type="text"
                      placeholder="username/channel"
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-500 font-mono">TT:</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-gold hover:bg-white text-brand-charcoal font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Simpan & Perbarui Portofolio
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex flex-col gap-4 border-b border-white/5 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-gold" /> Etalase Karya ({userArtworks.length})
                </h3>
                <button
                  onClick={() => setShowArtworkForm(!showArtworkForm)}
                  className="px-2.5 py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/20 rounded-xl text-[10px] uppercase font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {showArtworkForm ? 'Batal' : <><Plus className="w-3.5 h-3.5" /> Unggah Karya</>}
                </button>
              </div>

              {!showArtworkForm && (
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1.5 rounded-xl border border-white/5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'painting', label: 'Lukisan' },
                    { id: 'music', label: 'Musik' },
                    { id: 'photography', label: 'Foto' },
                    { id: 'craft', label: 'Kriya' },
                    { id: 'digital', label: 'Digital' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFilterCategory(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] uppercase font-mono font-bold transition-all cursor-pointer grow text-center ${
                        filterCategory === item.id
                          ? 'bg-brand-gold text-brand-charcoal shadow-sm'
                          : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {showArtworkForm ? (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleAddArtwork}
                  className="bg-slate-950 p-4 border border-brand-gold/20 rounded-2xl space-y-4"
                >
                  <h4 className="text-xs font-mono font-bold uppercase text-brand-gold flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4" /> Pengisian Informasi Karya Baru
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Judul Karya *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ombak Karanghawu Senja Hari"
                      value={artTitle}
                      onChange={(e) => setArtTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Jenis Karya *</label>
                      <select
                        value={artType}
                        onChange={(e) => setArtType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="painting">Lukisan</option>
                        <option value="music">Seni Musik</option>
                        <option value="photography">Fotografi</option>
                        <option value="craft">Kriya / Ukir</option>
                        <option value="digital">Digital Art</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Harga Apresiasi (Rp)</label>
                      <input
                        type="number"
                        placeholder="Contoh: 1500000"
                        value={artPrice}
                        onChange={(e) => setArtPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-gold/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <CloudUploader onSuccess={(result) => setArtImageUrl(result.url)} folder="artworks" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Deskripsi (Kisah di Balik Karya) *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Tuliskan latar belakang karya, bahan yang digunakan, pesan tersirat, atau inspirasi rupa..."
                      value={artDescription}
                      onChange={(e) => setArtDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-gold/60 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-gradient-to-r from-brand-gold to-amber-500 hover:from-white hover:to-white text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Image className="w-4 h-4" /> Publikasi Karya Seni
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                    {filteredUserArtworks.map((art) => (
                      <div
                        key={art.id}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-white/5 hover:border-brand-gold/40 transition-all flex flex-col justify-end"
                      >
                        <img
                          src={art.imageUrl}
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3 flex flex-col justify-end">
                          <h4 className="text-white text-xs font-bold leading-tight line-clamp-1">{art.title}</h4>
                          <div className="flex items-center justify-between w-full mt-1.5">
                            <span className="text-[9px] font-mono text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/10">{art.type}</span>
                            <button
                              onClick={() => handleDeleteArtwork(art.id, art.title)}
                              className="p-1 text-gray-400 hover:text-rose-500 transition-colors pointer-events-auto"
                              title="Hapus Karya"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {userArtworks.length > 0 && filteredUserArtworks.length === 0 && (
                      <div className="col-span-full border border-dashed border-white/5 rounded-2xl p-8 text-center text-xs text-gray-500">
                        <FolderPlus className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                        <p className="font-semibold">Kategori Kosong</p>
                        <p className="text-[10px] text-gray-600 px-4 mt-1 leading-relaxed">
                          Tidak ada karya dengan kategori ini. Unggah karya seni baru atau silakan ubah filter kategori Anda.
                        </p>
                      </div>
                    )}

                    {userArtworks.length === 0 && (
                      <div className="col-span-full border border-dashed border-white/5 rounded-2xl p-8 text-center text-xs text-gray-500">
                        <FolderPlus className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                        <p className="font-semibold">Galeri Anda Masih Kosong</p>
                        <p className="text-[10px] text-gray-600 px-4 mt-1 leading-relaxed">
                          Terbitkan karya pertama Anda dengan mengeklik tombol "Unggah Karya" di kanan atas. Karya Anda otomatis dionboarding-kan ke galeri.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-gold animate-pulse" /> Riwayat Transaksi ({myOrders.length})
            </h3>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {myOrders.length > 0 ? (
                myOrders.map((order) => {
                  const orderDate = order.createdAt 
                    ? new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Tanggal tidak tersedia';
                    
                  return (
                    <div 
                      key={order.id} 
                      className="p-3.5 bg-slate-950/80 border border-white/5 hover:border-brand-gold/10 rounded-2xl space-y-3 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-gray-500 block">ID PESANAN</span>
                          <span className="text-xs font-mono font-bold text-white">#{order.id}</span>
                        </div>
                        
                        {order.status === 'paid' ? (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> LUNAS
                          </span>
                        ) : order.status === 'pending' ? (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-lg flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> TERPENDING
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-bold bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-lg flex items-center gap-1 shrink-0">
                            GAGAL / BATAL
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 py-1.5 border-y border-white/5">
                        {order.items && order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-medium line-clamp-1">
                              {item.name} <strong className="text-brand-gold ml-1">x{item.quantity}</strong>
                            </span>
                            <span className="text-gray-300 font-mono">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] text-gray-500 font-mono font-medium">{orderDate}</span>
                        <span className="font-mono font-bold text-brand-gold">
                          Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center text-xs text-gray-500">
                  <Clock className="w-7 h-7 mx-auto text-gray-600 mb-2 animate-bounce" />
                  <p className="font-semibold">Belum Ada Riwayat Transaksi</p>
                  <p className="text-[10px] text-gray-600 px-4 mt-1 leading-relaxed">
                    Lakukan checkout dan pembayaran di menu Keranjang untuk melihat transaksi pembelian karya atau produk Anda di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>)}
    </div>
  );
}
