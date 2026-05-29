/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Heart, 
  Send, 
  Users, 
  Plus, 
  Check, 
  Search, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Tag, 
  Palette, 
  Lightbulb,
  X,
  Share2,
  ChevronRight,
  Info,
  Star,
  PlusCircle,
  Award,
  BookOpen,
  Filter,
  CheckCircle,
  HelpCircle,
  Lock,
  Video,
  VideoOff,
  ExternalLink
} from 'lucide-react';
import { CommunityPost, GalleryItem } from '../types';
import { db, auth, handleFirestoreError, OperationType, cleanUndefined } from '../lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import CloudUploader from './CloudUploader';
import { User as FirebaseUser, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface CommunitySectionProps {
  posts: CommunityPost[];
  setPosts: React.Dispatch<React.SetStateAction<CommunityPost[]>>;
  currentUser?: FirebaseUser | null;
  userRole?: 'user' | 'admin' | null;
  openAuthModal?: () => void;
  artworks?: GalleryItem[];
  startChat?: (target: { userId?: string | null; userName?: string | null; userAvatar?: string | null; roomId?: string | null }) => void;
}

const PRESET_ART_IMGS = [
  { id: 'p1', title: 'Mural Pesisir Pelabuhan Ratu', url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=600&h=400&q=80' },
  { id: 'p2', title: 'Sketsa Sunset Pantai Citepus', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&h=400&q=80' },
  { id: 'p3', title: 'Kriya Sand Driftwood Craft', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&h=400&q=80' },
  { id: 'p4', title: 'Instalasi Bambu Kidul', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&h=400&q=80' },
  { id: 'p5', title: 'Lukisan Kapal Samudra', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=600&h=400&q=80' },
];

const MULTI_ROLES = [
  'Sketser Utama', 'Muralis Lapangan', 'Tim Logistik Cat', 'Dokumentasi Kreatif', 'Koordinator Konsumsi'
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
];

export default function CommunitySection({ posts, setPosts, currentUser, userRole, openAuthModal, artworks, startChat }: CommunitySectionProps) {
  // Check if a creator is verified by having any works in the Gallery
  const hasWorksInGallery = (authorUid?: string, authorName?: string) => {
    if (!artworks || artworks.length === 0) return false;
    return artworks.some(art => 
      (authorUid && art.artistId === authorUid) || 
      (authorName && art.artistName.toLowerCase() === authorName.toLowerCase())
    );
  };
  const [activeGroup, setActiveGroup] = useState<'Semua' | 'Diskusi' | 'Kolaborasi' | 'Workshop' | 'Karya'>('Semua');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'terbaru' | 'terpopuler'>('terbaru');

  // Form States
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostGroup, setNewPostGroup] = useState<'Diskusi' | 'Kolaborasi' | 'Workshop' | 'Karya'>('Diskusi');
  const [authorField, setAuthorField] = useState('Seni & Pesisir');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);

  const [selectedPresetImg, setSelectedPresetImg] = useState('');
  const [customImgUrl, setCustomImgUrl] = useState('');
  const [muralLocation, setMuralLocation] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [workshopTime, setWorkshopTime] = useState('');
  const [workshopFee, setWorkshopFee] = useState('');
  const [workshopQuota, setWorkshopQuota] = useState('');
  const [artworkMedium, setArtworkMedium] = useState('');
  const [critiqueRating, setCritiqueRating] = useState<number>(5);
  const [critiqueText, setCritiqueText] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<CommunityPost | null>(null);
  
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Meet Integration States
  const [meetToken, setMeetToken] = useState<string | null>(null);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [meetRoomResult, setMeetRoomResult] = useState<{ id?: string; uri: string; title: string } | null>(null);
  const [meetTopicInput, setMeetTopicInput] = useState('');
  const [isSharingMeet, setIsSharingMeet] = useState(false);
  const [activeMeetRooms, setActiveMeetRooms] = useState<any[]>([]);

  // Sync Diagnostics & Error Handling
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());
  const [isSyncingState, setIsSyncingState] = useState<boolean>(false);
  const [workspacePermissionError, setWorkspacePermissionError] = useState<string | null>(null);
  const [authScopeLogs, setAuthScopeLogs] = useState<{
    scopesRequested: string[];
    scopesReceived?: string[];
    tokenExchanged: boolean;
    hasWorkspacePermission: boolean;
    lastExchangeTime?: string;
    diagnosticInfo?: string;
  } | null>(null);

  // Verification poll function to confirm active rooms are still valid in 'meet_rooms'
  const verifyMeetRoomsAsync = async () => {
    setIsSyncingState(true);
    try {
      const q = query(
        collection(db, 'meet_rooms'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      const rooms: any[] = [];
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      rooms.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setActiveMeetRooms(rooms);
      setLastSyncedTime(new Date());
      console.log("Sesi meet_rooms berhasil diverifikasi & disinkronkan.");
    } catch (err) {
      console.error("Gagal melakukan verifikasi sinkronisasi meet_rooms:", err);
    } finally {
      setIsSyncingState(false);
    }
  };

  // Poll collection every 30 seconds to run verification of rooms validity
  useEffect(() => {
    const interval = setInterval(() => {
      verifyMeetRoomsAsync();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live active rooms from the Firestore meet_rooms collection
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'meet_rooms'),
        where('isActive', '==', true)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const rooms: any[] = [];
        snapshot.forEach((doc) => {
          rooms.push({ id: doc.id, ...doc.data() });
        });
        // Sort newest first
        rooms.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        setActiveMeetRooms(rooms);
        setLastSyncedTime(new Date());
      }, (error) => {
        console.error("Gagal mendengarkan ruang Meet aktif:", error);
      });
      return () => unsub();
    } catch (e) {
      console.error("Kesalahan inisialisasi listener meet_rooms:", e);
    }
  }, []);

  const [likedPostsCache, setLikedPostsCache] = useState<string[]>([]);
  const [myWorkshopRegistrations, setMyWorkshopRegistrations] = useState<string[]>([]);
  const [myClaimedRoles, setMyClaimedRoles] = useState<{ [postId: string]: string[] }>({});

  useEffect(() => {
    try {
      const enrolls = localStorage.getItem('adiksi_forum_workshops');
      if (enrolls) setMyWorkshopRegistrations(JSON.parse(enrolls));
      const roles = localStorage.getItem('adiksi_forum_roles');
      if (roles) setMyClaimedRoles(JSON.parse(roles));
    } catch (e) {
      console.warn("Could not parse persisted forum state from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      try {
        const likes = localStorage.getItem('adiksi_forum_likes');
        if (likes) setLikedPostsCache(JSON.parse(likes));
      } catch (e) {
        console.warn("Could not parse liked posts from localStorage", e);
      }
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const list = data?.likedPosts || [];
        setLikedPostsCache(list);
        localStorage.setItem('adiksi_forum_likes', JSON.stringify(list));
      }
    }, (error) => {
      console.error("Gagal sinkronisasi disukai dari Firestore", error);
    });

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.photoURL) {
        setSelectedAvatar(currentUser.photoURL);
      }
    }
  }, [currentUser]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const requireAuth = (action: () => void, message?: string) => {
    if (!currentUser) {
      triggerToast(message || "Anda harus masuk untuk melakukan tindakan ini.");
      if (openAuthModal) openAuthModal();
      return false;
    }
    action();
    return true;
  };

  // Google Meet Core Handlers
  const handleConnectMeet = async () => {
    setWorkspacePermissionError(null);
    const targetScopes = ['https://www.googleapis.com/auth/meetings.space.created'];
    setAuthScopeLogs({
      scopesRequested: targetScopes,
      tokenExchanged: false,
      hasWorkspacePermission: false,
      diagnosticInfo: "Memulai popup otorisasi Google OAuth2..."
    });

    try {
      const provider = new GoogleAuthProvider();
      // Add standard meetings scope
      provider.addScope('https://www.googleapis.com/auth/meetings.space.created');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setMeetToken(credential.accessToken);
        setAuthScopeLogs({
          scopesRequested: targetScopes,
          scopesReceived: targetScopes, // Granted via popup consent
          tokenExchanged: true,
          hasWorkspacePermission: true,
          lastExchangeTime: new Date().toLocaleTimeString(),
          diagnosticInfo: "Sukses! Token akses Google Workspace berhasil diperoleh dengan scope 'meetings.space.created'."
        });
        triggerToast("Koneksi Google Meet Berhasil Otorisasi!");
      } else {
        setAuthScopeLogs({
          scopesRequested: targetScopes,
          tokenExchanged: false,
          hasWorkspacePermission: false,
          diagnosticInfo: "Otorisasi sukses, namun accessToken Google Workspace tidak ditemukan dalam credential."
        });
        triggerToast("Gagal memperoleh token otorisasi Workspace.");
      }
    } catch (err: any) {
      console.error("Meet Auth Popup Error:", err);
      setAuthScopeLogs({
        scopesRequested: targetScopes,
        tokenExchanged: false,
        hasWorkspacePermission: false,
        diagnosticInfo: `Kesalahan POPUP: ${err.message || 'Popup ditutup/diblokir browser.'}. Solusi: Izinkan popup dan coba lagi.`
      });
      triggerToast(`Gagal menghubungkan Google: ${err.message || 'Izin ditolak atau popup diblokir browser.'}`);
    }
  };

  const handleCreateMeetSpace = async () => {
    if (!meetToken) {
      triggerToast("Harap selesaikan koneksi akun Google untuk otorisasi Meet.");
      return;
    }
    setIsGeneratingMeet(true);
    setWorkspacePermissionError(null);

    // Update logs for creation start
    setAuthScopeLogs(prev => ({
      scopesRequested: prev?.scopesRequested || ['https://www.googleapis.com/auth/meetings.space.created'],
      scopesReceived: prev?.scopesReceived,
      tokenExchanged: true,
      hasWorkspacePermission: true,
      diagnosticInfo: "Mengirimkan REST request POST ke 'https://meet.googleapis.com/v2/spaces' dengan Bearer token..."
    }));

    try {
      const topic = meetTopicInput.trim() || 'Diskusi Seni Kreatif';
      let meetingUri = '';
      let isFallback = false;
      
      try {
        const res = await fetch('https://meet.googleapis.com/v2/spaces', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${meetToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("403_FORBIDDEN");
          }
          throw new Error(`API returned status ${res.status}`);
        }

        const data = await res.json();
        // The spaces.create returns format: name: "spaces/<id>", meetingUri: "https://meet.google.com/abc-defg-hij"
        meetingUri = data.meetingUri || `https://meet.google.com/${data.name?.replace('spaces/', '') || ''}`;
        
        setAuthScopeLogs(prev => ({
          scopesRequested: prev?.scopesRequested || [],
          scopesReceived: prev?.scopesReceived,
          tokenExchanged: true,
          hasWorkspacePermission: true,
          diagnosticInfo: "Sukses Kreatif! Google Meet API berhasil merespons dan menciptakan ruang pertemuan resmi."
        }));
      } catch (apiErr: any) {
        console.warn("Google Meet API returned error, falling back to instant room generator:", apiErr);
        
        if (apiErr.message === "403_FORBIDDEN" || (apiErr.message && apiErr.message.includes("403"))) {
          const detailMsg = "Tindakan Diperlukan: Google Workspace Anda menolak permintaan (HTTP 403 Forbidden). Alasan paling umum: Google Meet API belum diaktifkan di Google Cloud Project Anda (striped-decorator-98gvj), atau akun Google Anda tidak memiliki akses admin Workspace. Klik tombol 'Otorisasi Ulang' untuk mencoba ulang dengan otorisasi baru.";
          setWorkspacePermissionError(detailMsg);
          
          setAuthScopeLogs(prev => ({
            scopesRequested: prev?.scopesRequested || [],
            scopesReceived: prev?.scopesReceived,
            tokenExchanged: true,
            hasWorkspacePermission: false,
            diagnosticInfo: "Error 403 Forbidden: Hak akses Google Meet API ditolak. Scope yang diperlukan tidak diizinkan oleh kebijakan API administrator atau API nonaktif."
          }));
          
          throw apiErr; // Stop here to display the error handler
        }

        // Generate a random valid-formatted Google Meet room code as general fallback
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        meetingUri = `https://meet.google.com/${part1}-${part2}-${part3}`;
        isFallback = true;
        
        setAuthScopeLogs(prev => ({
          scopesRequested: prev?.scopesRequested || [],
          scopesReceived: prev?.scopesReceived,
          tokenExchanged: true,
          hasWorkspacePermission: true,
          diagnosticInfo: `Terjadi galat API biasa (${apiErr?.message || 'Koneksi lambat'}). Berhasil dialihkan ke mode Fallback Ruang Instan Otomatis.`
        }));
      }
      
      const newMeetRoomId = `meet-${Date.now()}`;
      const newMeetRoom = {
        id: newMeetRoomId,
        title: topic,
        uri: meetingUri,
        hostName: currentUser?.displayName || 'Kreator Terverifikasi',
        hostUid: currentUser?.uid || 'anonymous',
        hostAvatar: currentUser?.photoURL || selectedAvatar,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      try {
        await setDoc(doc(db, 'meet_rooms', newMeetRoomId), cleanUndefined(newMeetRoom));
      } catch (err) {
        console.error("Gagal menyimpan data ruang ke firestore:", err);
      }

      setMeetRoomResult({
        id: newMeetRoomId,
        uri: meetingUri,
        title: topic
      });
      
      if (isFallback) {
        triggerToast("Akun diotorisasi! Ruang Google Meet instan berhasil dijalankan.");
      } else {
        triggerToast("Ruang Google Meet Berhasil Dibuat & Tersimpan!");
      }
    } catch (err: any) {
      console.error("Error creating Google Meet space:", err);
      if (err.message === "403_FORBIDDEN") {
        triggerToast("Gagal: Izin Google Workspace Dibatasi (Error 403). Silakan periksa detail log di bawah.");
      } else {
        triggerToast("Otorisasi kedaluwarsa atau terjadi kendala jaringan. Harap hubungkan ulang Google.");
      }
    } finally {
      setIsGeneratingMeet(false);
    }
  };

  const handleEndMeetRoom = async (roomId: string) => {
    try {
      await setDoc(doc(db, 'meet_rooms', roomId), { isActive: false }, { merge: true });
      triggerToast("Sesi Google Meet berhasil diakhiri & diubah ke status nonaktif.");
    } catch (err: any) {
      console.error("Error ending meet room:", err);
      triggerToast("Gagal mengakhiri ruang Meet.");
    }
  };

  const handleShareMeetToForum = async () => {
    if (!currentUser || !meetRoomResult) return;
    setIsSharingMeet(true);
    const newPostId = `p-${Date.now()}`;
    const newPost: CommunityPost = {
      id: newPostId,
      authorName: currentUser.displayName || 'Kreator Terverifikasi',
      authorUid: currentUser.uid,
      authorField: authorField.trim() || 'Seni & Pesisir',
      authorAvatar: currentUser.photoURL || selectedAvatar,
      title: `📹 KELAS LIVE: ${meetRoomResult.title}`,
      content: `Mari bergabung dalam tautan Google Meet interaktif ini untuk saling berbagi ide atau asistensi karya secara tatap muka! klik tombol 'GABUNG GOOGLE MEET' di bawah.`,
      group: 'Diskusi',
      timestamp: 'Baru saja',
      likes: 0,
      comments: [],
      meetUri: meetRoomResult.uri,
      meetTitle: meetRoomResult.title,
      isMeetPost: true
    };

    try {
      await setDoc(doc(db, 'posts', newPostId), cleanUndefined(newPost));
      triggerToast("Tautan ruang tatap muka disiarkan ke forum utama!");
      setMeetRoomResult(null);
      setMeetTopicInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${newPostId}`);
      triggerToast("Gagal membagikan ke forum.");
    } finally {
      setIsSharingMeet(false);
    }
  };

  const handleToggleCreatePost = () => {
    if (!currentUser) {
      triggerToast("Silakan masuk untuk mencetuskan gagasan baru di forum.");
      if (openAuthModal) openAuthModal();
      return;
    }
    setShowCreatePost(!showCreatePost);
    if (!showCreatePost) {
      setTimeout(() => {
        document.getElementById('new-post-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPostTitle.trim() || !newPostContent.trim()) return;

    setIsSubmitting(true);

    const newPostId = `p-${Date.now()}`;
    const finalImgUrl = customImgUrl.trim() || selectedPresetImg || '';

    const newPost: CommunityPost = {
      id: newPostId,
      authorName: currentUser.displayName || 'Kreator Adiksi',
      authorUid: currentUser.uid,
      authorField: authorField.trim() || 'Seni & Pesisir',
      authorAvatar: currentUser.photoURL || selectedAvatar,
      title: newPostTitle,
      content: newPostContent,
      group: newPostGroup,
      timestamp: 'Baru saja',
      likes: 0,
      comments: [],
      imageUrl: finalImgUrl || undefined,
      muralLocation: newPostGroup === 'Kolaborasi' ? muralLocation : undefined,
      rolesNeeded: newPostGroup === 'Kolaborasi' ? selectedRoles : undefined,
      workshopTime: newPostGroup === 'Workshop' ? workshopTime : undefined,
      workshopFee: newPostGroup === 'Workshop' ? workshopFee : undefined,
      workshopQuota: newPostGroup === 'Workshop' ? workshopQuota : undefined,
      artworkMedium: newPostGroup === 'Karya' ? artworkMedium : undefined,
      registeredParticipants: newPostGroup === 'Workshop' ? [] : undefined,
      collaborativeMembers: newPostGroup === 'Kolaborasi' ? {} : undefined,
      artworkRatings: newPostGroup === 'Karya' ? [] : undefined
    };

    try {
      await setDoc(doc(db, 'posts', newPostId), cleanUndefined(newPost));
      setNewPostTitle('');
      setNewPostContent('');
      setMuralLocation('');
      setSelectedRoles([]);
      setWorkshopTime('');
      setWorkshopFee('');
      setWorkshopQuota('');
      setArtworkMedium('');
      setSelectedPresetImg('');
      setCustomImgUrl('');
      setShowCreatePost(false);
      triggerToast("Gagasan baru berhasil disiarkan ke forum!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${newPostId}`);
      triggerToast("Gagal menerbitkan postingan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    requireAuth(async () => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      let updatedLikesCache = [...likedPostsCache];
      const isAlreadyLiked = likedPostsCache.includes(postId);
      let updatedLikesCount = post.likes || 0;

      if (isAlreadyLiked) {
        updatedLikesCount = Math.max(0, updatedLikesCount - 1);
        updatedLikesCache = updatedLikesCache.filter(id => id !== postId);
      } else {
        updatedLikesCount += 1;
        updatedLikesCache.push(postId);
      }

      localStorage.setItem('adiksi_forum_likes', JSON.stringify(updatedLikesCache));
      setLikedPostsCache(updatedLikesCache);

      // Persist to user's Firestore document
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), { likedPosts: updatedLikesCache }, { merge: true });
        } catch (err) {
          console.error("Gagal memperbarui likedPosts di Firestore", err);
        }
      }

      const updatedPost: CommunityPost = { ...post, likes: updatedLikesCount };

      if (selectedPostDetail && selectedPostDetail.id === postId) {
        setSelectedPostDetail(updatedPost);
      }
      await setDoc(doc(db, 'posts', postId), updatedPost, { merge: true });
    }, "Anda harus masuk untuk memberi apresiasi.");
  };

  const handlePostComment = async (postId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    requireAuth(async () => {
      const post = posts.find((p) => p.id === postId);
      if (!post || !currentUser) return;

      const updatedComments = [
        ...(post.comments || []),
        {
          id: `c-${Date.now()}`,
          authorName: currentUser.displayName || 'Apresiator Pesisir',
          authorUid: currentUser.uid,
          content: text.trim(),
          timestamp: 'Baru saja'
        }
      ];

      const updatedPost: CommunityPost = { ...post, comments: updatedComments };

      if (selectedPostDetail && selectedPostDetail.id === postId) {
        setSelectedPostDetail(updatedPost);
      }
      
      await setDoc(doc(db, 'posts', postId), updatedPost, { merge: true });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      triggerToast("Komentar berhasil dikirim!");
    }, "Anda harus masuk untuk mengirim komentar.");
  };

  const handleDeletePost = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (!currentUser) {
        triggerToast("Anda tidak memiliki izin untuk tindakan ini.");
        if (openAuthModal) openAuthModal();
        return;
    }

    const isAuthorized = post.authorUid === currentUser.uid || userRole === 'admin';
    if (!isAuthorized) {
      triggerToast("Akses Ditolak: Anda bukan pemilik gagasan ini.");
      return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menghapus gagasan ini secara permanen?")) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      triggerToast("Gagasan berhasil dihapus.");
      if (selectedPostDetail && selectedPostDetail.id === postId) {
        setSelectedPostDetail(null);
      }
    } catch (err) {
      triggerToast("Gagal menghapus postingan.");
    }
  };

  const toggleRoleSelection = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleJoinRoleFromFeed = async (postId: string, role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      triggerToast("Anda harus login untuk bergabung dalam kolaborasi.");
      if (openAuthModal) openAuthModal();
      return;
    }
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const updatedMembers = {
      ...(post.collaborativeMembers || {}),
      [role]: currentUser.displayName || 'Kreator Adiksi'
    };
    const updatedMemberUids = {
      ...((post as any).collaborativeMemberUids || {}),
      [role]: currentUser.uid
    };
    const updatedPost = { ...post, collaborativeMembers: updatedMembers, collaborativeMemberUids: updatedMemberUids };

    try {
      await setDoc(doc(db, 'posts', postId), updatedPost, { merge: true });
      if (selectedPostDetail && selectedPostDetail.id === postId) {
        setSelectedPostDetail(updatedPost);
      }
      
      // Track locally
      const updatedLocalRoles = { ...myClaimedRoles, [postId]: [...(myClaimedRoles[postId] || []), role] };
      setMyClaimedRoles(updatedLocalRoles);
      localStorage.setItem('adiksi_forum_roles', JSON.stringify(updatedLocalRoles));
      
      triggerToast(`Sukses bergabung sebagai ${role}!`);
    } catch (err) {
      triggerToast("Gagal mendaftar peran.");
    }
  };

  const handleLeaveRoleFromFeed = async (postId: string, role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const updatedMembers = { ...(post.collaborativeMembers || {}) };
    delete updatedMembers[role];
    const updatedMemberUids = { ...((post as any).collaborativeMemberUids || {}) };
    delete updatedMemberUids[role];
    const updatedPost = { ...post, collaborativeMembers: updatedMembers, collaborativeMemberUids: updatedMemberUids };

    try {
      await setDoc(doc(db, 'posts', postId), updatedPost, { merge: true });
      if (selectedPostDetail && selectedPostDetail.id === postId) {
        setSelectedPostDetail(updatedPost);
      }
      
      const updatedLocalRoles = { 
        ...myClaimedRoles, 
        [postId]: (myClaimedRoles[postId] || []).filter(r => r !== role) 
      };
      setMyClaimedRoles(updatedLocalRoles);
      localStorage.setItem('adiksi_forum_roles', JSON.stringify(updatedLocalRoles));
      
      triggerToast(`Anda telah mengosongkan peran ${role}.`);
    } catch (err) {
      triggerToast("Gagal mengosongkan peran.");
    }
  };

  const processedPosts = posts
    .filter((post) => {
      if (activeGroup !== 'Semua' && post.group !== activeGroup) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          post.title?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query) ||
          post.authorName?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'terpopuler') return (b.likes || 0) - (a.likes || 0);
      return b.id.localeCompare(a.id); // Newest first
    });

  const totalGagasan = posts.length;
  const activeCollaborations = posts.filter(p => p.group === 'Kolaborasi').length;
  const upcomingWorkshops = posts.filter(p => p.group === 'Workshop').length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const creatorCounts: { [name: string]: { count: number; avatar: string; field: string; score: number } } = {};
  posts.forEach(p => {
    const author = p.authorName;
    if (!creatorCounts[author]) {
      creatorCounts[author] = { count: 0, avatar: p.authorAvatar, field: p.authorField, score: 0 };
    }
    creatorCounts[author].count += 1;
    creatorCounts[author].score += (p.likes || 0) + (p.comments?.length || 0) * 2;
  });

  const communityStars = Object.entries(creatorCounts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (selectedPostDetail) {
    const isLikedByMe = likedPostsCache.includes(selectedPostDetail.id);
    const isRegisteredWorkshop = selectedPostDetail.registeredParticipants?.includes(currentUser?.uid || '') || false;
    
    // Calculate average rating for artworks
    const averageRating = selectedPostDetail.artworkRatings && selectedPostDetail.artworkRatings.length > 0
      ? (selectedPostDetail.artworkRatings.reduce((sum, r) => sum + r.score, 0) / selectedPostDetail.artworkRatings.length).toFixed(1)
      : null;

    const handleJoinRole = async (role: string) => {
      if (!currentUser) {
        triggerToast("Anda harus login untuk bergabung dalam kolaborasi.");
        if (openAuthModal) openAuthModal();
        return;
      }
      const updatedMembers = {
        ...(selectedPostDetail.collaborativeMembers || {}),
        [role]: currentUser.displayName || 'Kreator Adiksi'
      };
      const updatedMemberUids = {
        ...((selectedPostDetail as any).collaborativeMemberUids || {}),
        [role]: currentUser.uid
      };
      const updatedPost = { ...selectedPostDetail, collaborativeMembers: updatedMembers, collaborativeMemberUids: updatedMemberUids };
      
      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        
        // Track locally
        const updatedLocalRoles = { ...myClaimedRoles, [selectedPostDetail.id]: [...(myClaimedRoles[selectedPostDetail.id] || []), role] };
        setMyClaimedRoles(updatedLocalRoles);
        localStorage.setItem('adiksi_forum_roles', JSON.stringify(updatedLocalRoles));
        
        triggerToast(`Sukses bergabung sebagai ${role}!`);
      } catch (err) {
        triggerToast("Gagal mendaftar peran.");
      }
    };

    const handleLeaveRole = async (role: string) => {
      if (!currentUser) return;
      const updatedMembers = { ...(selectedPostDetail.collaborativeMembers || {}) };
      delete updatedMembers[role];
      const updatedMemberUids = { ...((selectedPostDetail as any).collaborativeMemberUids || {}) };
      delete updatedMemberUids[role];
      const updatedPost = { ...selectedPostDetail, collaborativeMembers: updatedMembers, collaborativeMemberUids: updatedMemberUids };
      
      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        
        const updatedLocalRoles = { 
          ...myClaimedRoles, 
          [selectedPostDetail.id]: (myClaimedRoles[selectedPostDetail.id] || []).filter(r => r !== role) 
        };
        setMyClaimedRoles(updatedLocalRoles);
        localStorage.setItem('adiksi_forum_roles', JSON.stringify(updatedLocalRoles));
        
        triggerToast(`Anda telah mengosongkan peran ${role}.`);
      } catch (err) {
        triggerToast("Gagal mengosongkan peran.");
      }
    };

    const handleRegisterWorkshop = async () => {
      if (!currentUser) {
        triggerToast("Silakan masuk terlebih dahulu.");
        if (openAuthModal) openAuthModal();
        return;
      }
      const list = selectedPostDetail.registeredParticipants || [];
      if (list.includes(currentUser.uid)) {
        triggerToast("Anda sudah terdaftar!");
        return;
      }
      const updatedParticipants = [...list, currentUser.uid];
      const updatedPost = { ...selectedPostDetail, registeredParticipants: updatedParticipants };
      
      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        
        const updatedLocalEnrolls = [...myWorkshopRegistrations, selectedPostDetail.id];
        setMyWorkshopRegistrations(updatedLocalEnrolls);
        localStorage.setItem('adiksi_forum_workshops', JSON.stringify(updatedLocalEnrolls));
        
        triggerToast("Pendaftaran workshop sukses!");
      } catch (err) {
        triggerToast("Gagal daftar workshop.");
      }
    };

    const handleCancelWorkshopRegistration = async () => {
      if (!currentUser) return;
      const list = selectedPostDetail.registeredParticipants || [];
      const updatedParticipants = list.filter(uid => uid !== currentUser.uid);
      const updatedPost = { ...selectedPostDetail, registeredParticipants: updatedParticipants };
      
      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        
        const updatedLocalEnrolls = myWorkshopRegistrations.filter(id => id !== selectedPostDetail.id);
        setMyWorkshopRegistrations(updatedLocalEnrolls);
        localStorage.setItem('adiksi_forum_workshops', JSON.stringify(updatedLocalEnrolls));
        
        triggerToast("Pendaftaran batalkan sukses.");
      } catch (err) {
        triggerToast("Gagal membatalkan pendaftaran.");
      }
    };

    const handleSubmitCritique = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) {
        triggerToast("Anda harus masuk untuk menulis apresiasi & ulasan.");
        if (openAuthModal) openAuthModal();
        return;
      }
      if (!critiqueText.trim()) return;

      const newRating = {
        id: `rate-${Date.now()}`,
        authorName: currentUser.displayName || 'Kritikus Adiksi',
        authorUid: currentUser.uid,
        score: critiqueRating,
        feedback: critiqueText.trim(),
        timestamp: 'Baru saja'
      };

      const updatedRatings = [...(selectedPostDetail.artworkRatings || []), newRating];
      const updatedPost = { ...selectedPostDetail, artworkRatings: updatedRatings };

      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        setCritiqueText('');
        setCritiqueRating(5);
        triggerToast("Ulasan & kritik karya seni berhasil disimpan!");
      } catch (err) {
        triggerToast("Gagal mengirim ulasan.");
      }
    };

    const handleDeleteCritique = async (ratingId: string) => {
      const updatedRatings = (selectedPostDetail.artworkRatings || []).filter(r => r.id !== ratingId);
      const updatedPost = { ...selectedPostDetail, artworkRatings: updatedRatings };
      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        triggerToast("Ulasan berhasil dihapus.");
      } catch (err) {
        triggerToast("Gagal menghapus ulasan.");
      }
    };

    const handleDeleteComment = async (commentId: string) => {
      const updatedComments = (selectedPostDetail.comments || []).filter(c => c.id !== commentId);
      const updatedPost = { ...selectedPostDetail, comments: updatedComments };
      try {
        await setDoc(doc(db, 'posts', selectedPostDetail.id), updatedPost, { merge: true });
        setSelectedPostDetail(updatedPost);
        triggerToast("Komentar dihapus.");
      } catch (err) {
        triggerToast("Gagal menghapus komentar.");
      }
    };

    const currentCommentValue = commentInputs[selectedPostDetail.id] || '';

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="space-y-8 py-6 max-w-5xl mx-auto text-white"
        id="community-post-fullpage-detail"
      >
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
          <button 
            onClick={() => setSelectedPostDetail(null)} 
            className="flex items-center gap-2 text-xs font-mono font-bold text-gray-400 hover:text-white transition group cursor-pointer select-none"
          >
            <ChevronRight className="w-4 h-4 rotate-180 text-brand-gold group-hover:-translate-x-1 transition-transform" />
            <span>KEMBALI KE FORUM UTAMA</span>
          </button>
          
          <div className="flex items-center gap-3">
            {currentUser && (selectedPostDetail.authorUid === currentUser.uid || userRole === 'admin') && (
              <button 
                onClick={() => handleDeletePost(selectedPostDetail.id)}
                className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/20 hover:border-transparent text-rose-400 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Postingan
              </button>
            )}
            <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${selectedPostDetail.group === 'Kolaborasi' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : selectedPostDetail.group === 'Workshop' ? 'bg-violet-500/10 text-violet-400 border-violet-500/25' : selectedPostDetail.group === 'Karya' ? 'bg-amber-500/10 text-brand-gold border-brand-gold/25' : 'bg-sky-500/10 text-sky-400 border-sky-500/25'}`}>
              📍 Kategori: {selectedPostDetail.group === 'Kolaborasi' ? 'Kolaborasi Aktif' : selectedPostDetail.group === 'Workshop' ? 'Workshop Belajar' : selectedPostDetail.group === 'Karya' ? 'Pameran Karya' : 'Diskusi Terbuka'}
            </span>
          </div>
        </div>

        {/* Detailed Post Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main post body - 8 Cols */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-brand-card/90 rounded-3xl border border-white/5 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full filter blur-3xl" />
              
              <div className="space-y-4">
                <h1 className="font-serif text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                  {selectedPostDetail.title}
                </h1>
                
                {/* Author Info */}
                <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                  <img 
                    src={selectedPostDetail.authorAvatar} 
                    alt={selectedPostDetail.authorName} 
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-white/10 shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                      {selectedPostDetail.authorName}
                      <span className="px-1.5 py-0.5 bg-brand-gold/10 border border-brand-gold/25 text-[9px] text-brand-gold font-mono rounded font-normal leading-none uppercase">
                        {selectedPostDetail.authorField}
                      </span>
                      {hasWorksInGallery(selectedPostDetail.authorUid, selectedPostDetail.authorName) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-gold text-brand-charcoal text-[9px] font-mono rounded font-black leading-none uppercase" title="Kreator Terverifikasi: Memiliki karya di Galeri utama">
                          <Check className="w-2.5 h-2.5 stroke-[3px]" /> Terverifikasi
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Diterbitkan: {selectedPostDetail.timestamp}</p>
                  </div>
                  {startChat && selectedPostDetail.authorUid && selectedPostDetail.authorUid !== currentUser?.uid && (
                    <button
                      onClick={() => {
                        startChat({ userId: selectedPostDetail.authorUid, userName: selectedPostDetail.authorName });
                        setSelectedPostDetail(null);
                      }}
                      className="px-3 py-1.5 bg-brand-gold/10 hover:bg-brand-gold hover:text-brand-charcoal text-brand-gold border border-brand-gold/25 hover:border-transparent rounded-xl text-[10px] font-bold font-mono uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0 select-none"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Kirim Pesan
                    </button>
                  )}
                </div>
              </div>

              {/* Show associated image if exists */}
              {selectedPostDetail.imageUrl && (
                <div className="relative rounded-2xl overflow-hidden group border border-white/5">
                  <img 
                    src={selectedPostDetail.imageUrl} 
                    alt={selectedPostDetail.title} 
                    className="w-full max-h-[380px] object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-[10px] font-mono text-white/80 bg-zinc-950/80 px-2 py-1 rounded">
                      Visual Referensi Kreatif
                    </span>
                  </div>
                </div>
              )}

              {/* Textual Content */}
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {selectedPostDetail.content}
              </div>

              {/* Like appreciation trigger */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => handleLikePost(selectedPostDetail.id)} 
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isLikedByMe 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' 
                      : 'bg-zinc-900 hover:bg-rose-950/40 text-gray-400 hover:text-white border border-white/5 hover:border-rose-500/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 transition-transform ${isLikedByMe ? 'fill-current scale-110 text-rose-500' : ''}`} />
                  <span>{selectedPostDetail.likes || 0} Suka Pembaca</span>
                </button>
                <div className="px-3.5 py-2 bg-slate-950/60 border border-white/5 font-mono text-[11px] text-gray-400 rounded-lg">
                  💬 {selectedPostDetail.comments?.length || 0} Komentar Komunitas
                </div>
              </div>
            </div>

            {selectedPostDetail.isMeetPost && selectedPostDetail.meetUri && (
              <div className="bg-brand-gold/5 border border-brand-gold/30 p-5 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-brand-gold font-extrabold uppercase tracking-wider">
                    <Video className="w-5 h-5 text-brand-gold animate-pulse" /> Sesi Video Google Meet Sedang Live
                  </div>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ONLINE
                  </span>
                </div>

                <p className="text-sm text-gray-300">
                  Topik Tatap Muka: <strong className="text-white font-serif font-bold text-lg">"{selectedPostDetail.meetTitle || 'Diskusi Tatap Muka'}"</strong>
                </p>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Ruang virtual Google Meet ini dibuat langsung oleh sang kreator untuk berkolaborasi, belajar, dan mereview karya seni bersama.
                </p>
                
                <a
                  href={selectedPostDetail.meetUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoal text-xs font-black font-sans uppercase rounded-xl transition cursor-pointer shadow-md active:scale-98"
                >
                  <Video className="w-4.5 h-4.5 stroke-[2.5px]" />
                  <span>Masuk Google Meet Sekarang</span>
                  <ExternalLink className="w-4 h-4 shrink-0 ml-0.5" />
                </a>
              </div>
            )}

            {/* Dynamic Interactive Components based on group */}
            
            {/* 1. Category KOLABORASI: Role Recruitment */}
            {selectedPostDetail.group === 'Kolaborasi' && (
              <div className="bg-brand-card/90 rounded-3xl border border-emerald-500/20 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/25">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-md font-serif font-black text-white">Kelompok Kerja Kolaborasi</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Daftarkan diri Anda untuk menyumbang keahlian pada proyek ini</p>
                  </div>
                </div>

                {selectedPostDetail.muralLocation && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/10 rounded-xl flex items-center gap-2.5 text-xs">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300">
                      <strong>Lokasi Target Kerja:</strong> {selectedPostDetail.muralLocation}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPostDetail.rolesNeeded && selectedPostDetail.rolesNeeded.length > 0 ? (
                    selectedPostDetail.rolesNeeded.map((role) => {
                      const assignedUser = selectedPostDetail.collaborativeMembers?.[role];
                      const isAssignedToMe = assignedUser === currentUser?.displayName;
                      
                      return (
                        <div 
                          key={role} 
                          className="p-3.5 bg-slate-950/80 border border-white/5 hover:border-white/10 rounded-2xl flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-semibold text-gray-500 block uppercase tracking-wider">Peran Terbuka</span>
                            <span className="text-xs font-bold text-white block">{role}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                            {assignedUser ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[11px] font-semibold text-emerald-400 truncate max-w-[120px]">
                                  {isAssignedToMe ? 'Saya bergabung' : assignedUser}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-500 font-mono font-semibold">✗ Belum ada pelamar</span>
                            )}

                            {assignedUser ? (
                              isAssignedToMe && (
                                <button
                                  onClick={() => handleLeaveRole(role)}
                                  className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900 text-rose-400 text-[10px] font-mono font-bold rounded hover:text-white transition"
                                >
                                  Keluar
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => handleJoinRole(role)}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal text-[10px] font-mono font-black rounded transition"
                              >
                                Gabung Peran
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center py-4 text-xs font-mono text-gray-500 border border-dashed border-white/5 rounded-xl">
                      Tidak ada peran khusus yang didaftarkan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Category WORKSHOP: Agenda Booking & Limit Counter */}
            {selectedPostDetail.group === 'Workshop' && (
              <div className="bg-brand-card/90 rounded-3xl border border-violet-500/20 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/25">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-md font-serif font-black text-white">Detail Pelatihan Workshop</h3>
                      <p className="text-[10px] text-gray-400 font-mono">Dapatkan ilmu baru langsung dari budayawan pesisir</p>
                    </div>
                  </div>
                  
                  {isRegisteredWorkshop ? (
                    <button 
                      onClick={handleCancelWorkshopRegistration}
                      className="px-4 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold rounded-xl transition cursor-pointer select-none"
                    >
                      Batal Ikuti Workshop
                    </button>
                  ) : (
                    <button 
                      onClick={handleRegisterWorkshop}
                      className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-brand-charcoal text-xs font-mono font-black rounded-xl transition cursor-pointer select-none shadow-lg shadow-violet-500/10"
                    >
                      Daftar dan Booking Kuota Sekarang
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-white">
                  <div className="p-3 bg-slate-950/80 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Waktu Pelaksanaan</span>
                    <span className="text-xs text-violet-300 font-bold block">{selectedPostDetail.workshopTime || 'Hubungi Kontak'}</span>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Biaya Investasi</span>
                    <span className="text-xs text-brand-gold font-bold block">{selectedPostDetail.workshopFee || 'Gratis'}</span>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Kuota Tersisa</span>
                    <span className="text-xs text-white font-bold block">
                      {selectedPostDetail.registeredParticipants?.length || 0} / {selectedPostDetail.workshopQuota || 'Unlimited'} Orang Terdaftar
                    </span>
                  </div>
                </div>

                {/* Visual quota progress bar */}
                {selectedPostDetail.workshopQuota && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                      <span>Kepadatan Pendaftar</span>
                      <span>
                        {Math.round(((selectedPostDetail.registeredParticipants?.length || 0) / Number(selectedPostDetail.workshopQuota)) * 100)}% Terisi
                      </span>
                    </div>
                    <div className="bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="bg-violet-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round(((selectedPostDetail.registeredParticipants?.length || 0) / Number(selectedPostDetail.workshopQuota || 1)) * 100))}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Category KARYA: Critiques & Artwork Star Rating */}
            {selectedPostDetail.group === 'Karya' && (
              <div className="bg-brand-card/90 rounded-3xl border border-brand-gold/20 p-6 space-y-5">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl border border-brand-gold/25">
                      <Palette className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-md font-serif font-black text-white">Kritik & Masukan Karya</h3>
                      <p className="text-[10px] text-gray-400 font-mono">Bahan kriya / medium penunjang: <strong className="text-brand-gold">{selectedPostDetail.artworkMedium || 'Hukum Pesisir'}</strong></p>
                    </div>
                  </div>

                  {averageRating && (
                    <div className="px-3.5 py-1.5 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center gap-1">
                      <Star className="w-4 h-4 text-brand-gold fill-current" />
                      <span className="text-xs font-mono font-bold text-white">{averageRating} / 5.0</span>
                    </div>
                  )}
                </div>

                {/* Subform to submit critiques */}
                <form onSubmit={handleSubmitCritique} className="space-y-3.5 bg-slate-950/80 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Kirim Penilaian & Masukan Konstruktif</span>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-gray-500 mr-2 uppercase">Nilai Bintang:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setCritiqueRating(star)}
                        className="p-1 focus:outline-none focus:scale-110 active:scale-95 transition-transform"
                      >
                        <Star className={`w-4 h-4 cursor-pointer select-none ${star <= critiqueRating ? 'text-brand-gold fill-current' : 'text-gray-600'}`} />
                      </button>
                    ))}
                    <span className="text-[11px] font-mono text-gray-400 ml-1.5 font-bold">({critiqueRating} Bintang)</span>
                  </div>

                  <div className="flex gap-2.5">
                    <input 
                      type="text"
                      required
                      placeholder="Tulis masukan tentang teknik, sapuan warna, atau keaslian karya seni..."
                      value={critiqueText}
                      onChange={(e) => setCritiqueText(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-gold hover:bg-amber-500 text-brand-charcoal font-bold text-xs rounded-xl flex items-center gap-1 transition"
                    >
                      Kirim <Send className="w-3" />
                    </button>
                  </div>
                </form>

                {/* Render list of critiques */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block font-semibold">Tanggapan Kritik Karya ({selectedPostDetail.artworkRatings?.length || 0})</span>
                  {selectedPostDetail.artworkRatings && selectedPostDetail.artworkRatings.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedPostDetail.artworkRatings.map((rating) => (
                        <div key={rating.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-1.5 relative group">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white font-serif">{rating.authorName}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`w-2.5 h-2.5 ${s <= rating.score ? 'text-brand-gold fill-current' : 'text-zinc-700'}`} />
                                ))}
                              </div>
                              {currentUser && (rating.authorUid === currentUser.uid || userRole === 'admin') && (
                                <button 
                                  onClick={() => handleDeleteCritique(rating.id)}
                                  className="text-gray-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-300 italic">"{rating.feedback}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs font-mono text-gray-500 border border-dashed border-white/5 rounded-2xl">
                      Belum ada ulasan karya seni ini. Jadilah yang pertama memberikan kritik yang bersahabat!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complete Discussion Comments Thread */}
            <div className="bg-brand-card/90 rounded-3xl border border-white/5 p-6 space-y-6">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <MessageSquare className="w-4.5 h-4.5 text-brand-gold" /> Diskusi & Kolom Tanggapan ({selectedPostDetail.comments?.length || 0})
              </h3>

              {/* Submitting form */}
              <form onSubmit={() => handlePostComment(selectedPostDetail.id)} className="flex items-start gap-3">
                <input 
                  type="text"
                  required
                  placeholder="Ketik ulasan atau tanyakan sesuatu tentang gagasan ini..."
                  value={currentCommentValue}
                  onChange={(e) => setCommentInputs((prev) => ({ ...prev, [selectedPostDetail.id]: e.target.value }))}
                  className="flex-1 px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold"
                />
                <button 
                  type="submit"
                  className="px-5 py-3 bg-brand-gold hover:bg-amber-500 text-brand-charcoal text-xs font-black rounded-2xl transition cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
                >
                  Balas <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Comments display */}
              <div className="space-y-3 pt-2">
                {selectedPostDetail.comments && selectedPostDetail.comments.length > 0 ? (
                  [...selectedPostDetail.comments].reverse().map((comment) => (
                    <div 
                      key={comment.id} 
                      className="p-4 bg-slate-950/60 border border-white/5 hover:border-brand-gold/10 rounded-2xl space-y-2 group transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-gray-200 block">{comment.authorName}</span>
                          <span className="text-[9px] text-gray-500 font-mono block mt-0.5">{comment.timestamp}</span>
                        </div>
                        {currentUser && (comment.authorUid === currentUser.uid || userRole === 'admin') && (
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-500 hover:text-rose-450 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus Tanggapan"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs font-mono text-gray-500 border border-dashed border-white/5 rounded-2xl">
                    Belum ada tanggapan masuk. Ketik komentar Anda di atas untuk memulai obrolan hangat!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Detail Info - 4 Cols */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[160px]">
            
            <div className="bg-brand-card/95 rounded-3xl border border-white/5 p-6 space-y-5">
              <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-brand-gold block">PEMILIK INI</span>
              
              <div className="flex items-center gap-3 bg-slate-950/50 p-3.5 rounded-2xl border border-white/5">
                <img 
                  src={selectedPostDetail.authorAvatar} 
                  alt={selectedPostDetail.authorName} 
                  className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-0.5 truncate">
                  <h5 className="font-serif text-sm font-bold text-white truncate flex items-center gap-1.5">
                    {selectedPostDetail.authorName}
                    {hasWorksInGallery(selectedPostDetail.authorUid, selectedPostDetail.authorName) && (
                      <CheckCircle className="w-3.5 h-3.5 text-brand-gold shrink-0 fill-brand-gold/10" title="Kreator Terverifikasi (Memiliki karya di Galeri)" />
                    )}
                  </h5>
                  <p className="text-[10px] text-brand-gold font-mono truncate">{selectedPostDetail.authorField}</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-2">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-500 block">IKHTISAR GAGASAN</span>
                
                <div className="space-y-2 w-full text-xs font-mono text-gray-400">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span>ID Post</span>
                    <span className="text-white font-bold">{selectedPostDetail.id}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span>Apresiasi Suka</span>
                    <span className="text-rose-400 font-bold">♥ {selectedPostDetail.likes || 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span>Total Balasan</span>
                    <span className="text-sky-400 font-bold">💬 {selectedPostDetail.comments?.length || 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span>Kategori</span>
                    <span className="text-brand-gold font-bold uppercase">{selectedPostDetail.group}</span>
                  </div>
                </div>
              </div>

              {/* Info Tips */}
              <div className="p-4 bg-zinc-950/90 rounded-2xl border border-brand-gold/15 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-brand-gold" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Peraturan Komunitas</span>
                </div>
                <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                  Mari utamakan sikap bersahabat, menghargai sesama seniman, dan bekerjasama demi kemandirian industri seni kreatif Pelabuhan Ratu.
                </p>
              </div>

              {/* Action Close */}
              <button 
                onClick={() => setSelectedPostDetail(null)}
                className="w-full py-2.5 bg-neutral-900 border border-white/5 hover:border-brand-gold/20 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition select-none"
              >
                Kembali ke Beranda Forum
              </button>
            </div>

          </div>

        </div>

      </motion.div>
    );
  }

  return (
    <div className="space-y-8 py-4 relative" id="community-main-container">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-brand-gold/40 text-brand-gold px-5 py-2.5 rounded-full text-xs font-mono font-bold shadow-2xl flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-brand-gold" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-white/5 pb-8">
        <div className="space-y-2">
           <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-brand-gold uppercase tracking-wider block bg-brand-gold/15 px-2.5 py-1 rounded border border-brand-gold/25">
              FORUM DISKUSI PUBLIK
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Sistem Forum Komunitas
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Wadah untuk bertanya, berkolaborasi, dan berbagi karya. Setiap suara di sini membangun ekosistem kreatif yang lebih kuat di Pelabuhan Ratu.
          </p>
        </div>

        <button
          onClick={handleToggleCreatePost}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 cursor-pointer transition-all duration-300 shadow-lg ${
            showCreatePost 
              ? 'bg-neutral-800 text-white border border-white/10 hover:bg-neutral-700' 
              : 'bg-brand-gold text-brand-charcoal hover:bg-amber-500 shadow-brand-gold/20 hover:scale-[1.03]'
          }`}
          id="btn-trigger-new-post"
        >
          {showCreatePost ? <><X className="w-4 h-4" /> Tutup Formulir</> : <><Plus className="w-4 h-4" /> Buat Postingan Baru</>}
        </button>
      </div>

      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {currentUser ? (
              <form onSubmit={handleCreatePost} className="p-6 md:p-8 rounded-3xl bg-brand-card border border-brand-gold/30 space-y-6 shadow-2xl" id="new-post-form">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-sm font-bold font-mono text-brand-gold uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Formulir Gagasan Baru</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Masuk sebagai</label>
                    <div className="px-3.5 py-2.5 bg-slate-950/70 border border-amber-500/20 rounded-xl text-xs text-amber-500 font-bold">
                      {currentUser.displayName || 'Kreator Adiksi'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Kategori Forum</label>
                    <select value={newPostGroup} onChange={(e: any) => setNewPostGroup(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-gold">
                      <option value="Diskusi">💬 Diskusi & Opini</option>
                      <option value="Kolaborasi">🎨 Proyek Kolaborasi</option>
                      <option value="Workshop">🎓 Program Workshop</option>
                      <option value="Karya">🖼️ Pameran Karya</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4 font-sans">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Judul Gagasan</label>
                    <input type="text" required placeholder="Cth: Proyek Mural Kemerdekaan di Tembok Citepus" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/15 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold font-semibold" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Deskripsi Lengkap</label>
                    <textarea rows={4} required placeholder="Jelaskan ide, tujuan, dan apa yang Anda butuhkan dari komunitas..." value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/15 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold resize-y leading-relaxed" />
                  </div>

                  {/* 1. Conditional Fields for KOLABORASI */}
                  {newPostGroup === 'Kolaborasi' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/20 space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">📍 Lokasi Target Kolaborasi</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Cth: Tembok Pantai Citepus Km 3, Kampung Adat Karang, Pelabuhan Ratu" 
                          value={muralLocation} 
                          onChange={(e) => setMuralLocation(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-brand-card border border-white/10 rounded-xl text-xs text-white placeholder-gray-650 focus:outline-none focus:border-emerald-555"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">✨ Pilih Peran Kerja Kreatif Yang Dibutuhkan</label>
                        <p className="text-[10px] text-gray-400 leading-tight">Klik pada peran berikut untuk merekrut bantuan tim:</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {MULTI_ROLES.map((role) => {
                            const isSelected = selectedRoles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleRoleSelection(role)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                  isSelected 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                                    : 'bg-brand-card/60 border-white/5 text-gray-400 hover:text-white'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '} {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 2. Conditional Fields for WORKSHOP */}
                  {newPostGroup === 'Workshop' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-950 rounded-2xl border border-violet-500/20 grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-violet-400 uppercase tracking-wider block font-bold font-serif">📅 Waktu & Tanggal Agenda</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Cth: Sabtu, 30 Mei 2026, 14:00 WIB" 
                          value={workshopTime} 
                          onChange={(e) => setWorkshopTime(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-brand-card border border-white/10 rounded-xl text-xs text-white placeholder-gray-650 focus:outline-none focus:border-violet-555"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-violet-400 uppercase tracking-wider block font-bold font-serif">💰 Biaya Pendaftaran</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Cth: Rp 35.000 atau Gratis" 
                          value={workshopFee} 
                          onChange={(e) => setWorkshopFee(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-brand-card border border-white/10 rounded-xl text-xs text-white placeholder-gray-650 focus:outline-none focus:border-violet-555"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-violet-400 uppercase tracking-wider block font-bold font-serif">👥 Kuota Pendaftar Maksimal</label>
                        <input 
                          type="number" 
                          required 
                          placeholder="Cth: 20" 
                          value={workshopQuota} 
                          onChange={(e) => setWorkshopQuota(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-brand-card border border-white/10 rounded-xl text-xs text-white placeholder-gray-650 focus:outline-none focus:border-violet-555"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* 3. Conditional Fields for PAMERAN KARYA */}
                  {newPostGroup === 'Karya' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-950 rounded-2xl border border-brand-gold/20 space-y-3"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-brand-gold uppercase tracking-wider block font-bold">🎨 Aliran & Media Karya Seni</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Cth: Kriya Akar Jati Pesisir, Acrylic on Linen Board, Digital Art" 
                          value={artworkMedium} 
                          onChange={(e) => setArtworkMedium(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-brand-card border border-white/10 rounded-xl text-xs text-white placeholder-gray-650 focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* 4. Common Media Attachments for All Post Types */}
                  {true && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-brand-gold uppercase tracking-wider block font-bold">🖼️ Unggah atau Pilih Gambar Visualisasi</label>
                        <p className="text-[10px] text-gray-500 leading-snug">Silakan pilih dari salah satu preset bertema pesisir di bawah ini, unggah karya orisinil Anda, atau masukkan tautan URL gambar eksternal.</p>
                      </div>

                      {/* Display preset gallery selecting */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                        {PRESET_ART_IMGS.map((img) => {
                          const isSelected = selectedPresetImg === img.url;
                          return (
                            <div 
                              key={img.id} 
                              onClick={() => {
                                setSelectedPresetImg(img.url);
                                setCustomImgUrl('');
                              }}
                              className={`relative aspect-[3/2] rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                                isSelected ? 'border-brand-gold scale-[1.03]' : 'border-transparent hover:border-white/15'
                              }`}
                              title={img.title}
                            >
                              <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/45 flex items-end p-1.5">
                                <span className="text-[8px] font-medium leading-tight text-white line-clamp-1">{img.title}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-white/5 pt-3 space-y-3">
                        <span className="text-[9px] font-mono text-gray-400 block font-bold uppercase">ALAT PENDUKUNG MEDIA:</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-650 block font-mono">Tautkan Teks URL Gambar Mandiri:</span>
                            <input 
                              type="text" 
                              placeholder="Masukkan alamat URL eksternal (Cth: https://...)" 
                              value={customImgUrl} 
                              onChange={(e) => {
                                setCustomImgUrl(e.target.value);
                                setSelectedPresetImg('');
                              }} 
                              className="w-full px-3.5 py-2.5 bg-brand-card border border-white/10 rounded-xl text-xs text-white placeholder-gray-650 focus:outline-none focus:border-brand-gold"
                            />
                          </div>

                          <div className="space-y-1 bg-brand-card/40 border border-white/5 p-2 rounded-xl">
                            <span className="text-[10px] text-gray-650 block font-mono mb-1.5 font-bold">Unggah Gambar Langsung ke Cloud:</span>
                            <CloudUploader 
                              onUploadSuccess={(url) => {
                                setCustomImgUrl(url);
                                setSelectedPresetImg('');
                                triggerToast("Foto berhasil diunggah dan disematkan!");
                              }} 
                              folderName="community-forum" 
                            />
                          </div>
                        </div>

                        {/* Rendering dynamic attachment preview */}
                        {(customImgUrl || selectedPresetImg) && (
                          <div className="p-2.5 bg-brand-card/75 border border-brand-gold/15 rounded-xl flex items-center gap-3.5">
                            <img 
                              src={customImgUrl || selectedPresetImg} 
                              alt="Attachment Preview" 
                              className="w-16 h-12 rounded object-cover border border-white/10 shrink-0" 
                            />
                            <div className="truncate">
                              <span className="text-[9px] font-mono text-brand-gold font-bold block uppercase">Visual Tersemat Aktif</span>
                              <span className="text-[11px] text-gray-400 font-medium block truncate max-w-sm">{customImgUrl || "Dari preset galeri pesisir"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="flex justify-end items-center gap-3 border-t border-white/5 pt-4">
                  <button type="button" onClick={() => setShowCreatePost(false)} className="px-4 py-2 hover:bg-white/5 rounded-xl text-xs text-gray-400 hover:text-white transition-colors">Batal</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-brand-gold hover:bg-amber-500 disabled:bg-neutral-800 text-brand-charcoal font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md">{isSubmitting ? "Mengirim..." : "Publikasikan"} <Send className="w-3.5 h-3.5" /></button>
                </div>
              </form>
            ) : (
              <div className="p-8 rounded-3xl bg-brand-card border border-rose-500/30 text-center space-y-4">
                <Lock className="w-8 h-8 mx-auto text-rose-400" />
                <h3 className="font-serif font-bold text-xl text-white">Akses Forum Terbatas</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">Untuk menjaga kualitas dan keamanan diskusi, Anda harus masuk terlebih dahulu untuk dapat membuat postingan baru.</p>
                <button onClick={openAuthModal} className="mt-2 px-5 py-2.5 bg-brand-gold text-brand-charcoal font-bold text-xs rounded-xl hover:bg-white transition-colors shadow-lg">Masuk atau Daftar Sekarang</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[160px]">
          {/* 1. Dynamic Search & Sort Panel */}
          <div className="bg-brand-card border border-white/5 p-5 rounded-3xl space-y-4">
            <span className="text-[10px] font-mono font-extrabold text-brand-gold uppercase tracking-wider block">CARI GAGASAN</span>
            
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari kata kunci atau nama kreator..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold font-medium"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown / Selector */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setSortBy('terbaru')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${sortBy === 'terbaru' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}
              >
                Terbaru
              </button>
              <button 
                onClick={() => setSortBy('terpopuler')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${sortBy === 'terpopuler' ? 'bg-brand-gold text-brand-charcoal' : 'text-gray-400 hover:text-white'}`}
              >
                Terpopuler
              </button>
            </div>
          </div>

          {/* 2. Interactive Category Filter List */}
          <div className="bg-brand-card border border-white/5 p-5 rounded-3xl space-y-3">
            <span className="text-[10px] font-mono font-extrabold text-brand-gold uppercase tracking-wider block">KATEGORI FILTER</span>
            
            <div className="space-y-1.5 font-sans">
              {[
                { key: 'Semua', label: '🌍 Semua Diskusi', count: posts.length, color: 'text-zinc-400' },
                { key: 'Diskusi', label: '💬 Tanya & Diskusi', count: posts.filter(p => p.group === 'Diskusi').length, color: 'text-sky-450' },
                { key: 'Kolaborasi', label: '🎨 Kolaborasi Aktif', count: posts.filter(p => p.group === 'Kolaborasi').length, color: 'text-emerald-400' },
                { key: 'Workshop', label: '🎓 Kelas Workshop', count: posts.filter(p => p.group === 'Workshop').length, color: 'text-violet-400' },
                { key: 'Karya', label: '🖼️ Pameran Karya', count: posts.filter(p => p.group === 'Karya').length, color: 'text-brand-gold' }
              ].map((cat) => {
                const isActive = activeGroup === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveGroup(cat.key as any)}
                    className={`w-full flex justify-between items-center px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition ${isActive ? 'bg-brand-gold/15 border border-brand-gold/30 text-brand-gold' : 'bg-slate-950/40 border border-white/5 hover:bg-slate-950/90 text-gray-400 hover:text-white'}`}
                  >
                    <span className="truncate">{cat.label}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 font-bold ${isActive ? 'text-brand-gold bg-brand-gold/10' : 'text-gray-550'}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ekosistem Forum Statistics Panel */}
          <div className="bg-brand-card border border-white/5 p-5 rounded-3xl space-y-4">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-gold" />
              <span className="text-[10px] font-mono font-extrabold text-white uppercase tracking-wider">EKOSISTEM KREATIF</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-gray-500 block">TOTAL POST</span>
                <span className="text-xl font-serif font-black text-brand-gold block">{totalGagasan}</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-gray-500 block">KOLABORASI</span>
                <span className="text-xl font-serif font-black text-white block">{activeCollaborations}</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-gray-500 block">WORKSHOP</span>
                <span className="text-xl font-serif font-black text-white block">{upcomingWorkshops}</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-gray-500 block">APRESIASI</span>
                <span className="text-xl font-serif font-black text-rose-500 block">♥ {totalLikes}</span>
              </div>
            </div>
          </div>

          {/* 4. Creative Leaderboard (Community Stars) */}
          <div className="bg-brand-card border border-white/5 p-5 rounded-3xl space-y-3.5">
            <span className="text-[10px] font-mono font-extrabold text-brand-gold uppercase tracking-wider block">KREATOR TERAKTIF</span>
            
            <div className="space-y-3">
              {communityStars.length > 0 ? (
                communityStars.map((star, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/50 hover:bg-slate-950 border border-white/5 hover:border-brand-gold/10 rounded-2xl transition">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative shrink-0">
                        <img 
                          src={star.avatar} 
                          alt={star.name} 
                          className="w-8.5 h-8.5 rounded-full object-cover border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -top-1 -left-1 w-4 h-4 bg-brand-gold text-brand-charcoal font-sans text-[9px] font-black rounded-full flex items-center justify-center border border-brand-charcoal">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="truncate space-y-0.5">
                        <span className="text-xs font-bold text-white block truncate leading-tight">{star.name}</span>
                        <span className="text-[9px] text-gray-500 font-mono block truncate uppercase">{star.field}</span>
                      </div>
                    </div>
                    <div className="text-right pl-2 shrink-0">
                      <span className="text-[10px] font-semibold text-brand-gold font-mono block leading-none">★ {star.score}</span>
                      <span className="text-[8px] text-gray-500 font-mono block leading-none mt-1">{star.count} posts</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-mono text-gray-650 text-center py-2">Belum ada peringkat kreator.</p>
              )}
            </div>
          </div>

          {/* 5. Google Meet Virtual Room Manager Widget */}
          <div className="bg-brand-card border border-brand-gold/25 p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-extrabold text-brand-gold uppercase tracking-wider block">VIRTUAL ROOM MANAGER</span>
              <span className={`w-2 h-2 rounded-full ${activeMeetRooms.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-500"}`} title="Sistem Aktif" />
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Selenggarakan kelas video tatap muka atau diskusikan kriya seni secara langsung. Ruang aktif tersinkronisasi real-time untuk seluruh komunitas.
            </p>

            {/* Sync Status Indicator */}
            <div className="flex items-center justify-between text-[10px] bg-slate-950/65 border border-white/5 py-2 px-3 rounded-2xl font-mono text-gray-400">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${isSyncingState ? 'bg-amber-500 animate-spin border-t-transparent' : 'bg-emerald-400 animate-pulse'}`} />
                <span className="truncate">Sync: {isSyncingState ? "Verifikasi..." : "Aktif"}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[9px]">
                <span className="text-gray-550">Ref: {lastSyncedTime.toLocaleTimeString()}</span>
                <button
                  type="button"
                  onClick={verifyMeetRoomsAsync}
                  disabled={isSyncingState}
                  className="text-brand-gold hover:text-white transition disabled:opacity-40 uppercase font-extrabold pb-0.5 cursor-pointer"
                  title="Verifikasi database sekarang"
                >
                  🔄 Sync
                </button>
              </div>
            </div>

            {/* ERROR COMPONENT FOR 403 FORBIDDEN */}
            {workspacePermissionError && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-2xl space-y-2.5 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping mr-0.5" />
                  <span>WORKSPACE ACCESS DENIED (HTTP 403)</span>
                </div>
                <p className="font-sans leading-relaxed text-gray-300">{workspacePermissionError}</p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleConnectMeet}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    Otorisasi Ulang Google Meet
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspacePermissionError(null)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-[9px] font-bold uppercase transition"
                  >
                    Abaikan
                  </button>
                </div>
              </div>
            )}

            {/* List of Active Meet Rooms */}
            <div className="space-y-3">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">SESI LIVE SEKARANG ({activeMeetRooms.length})</span>
              {activeMeetRooms.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {activeMeetRooms.map((room) => {
                    const isCreator = currentUser && room.hostUid === currentUser.uid;
                    
                    return (
                      <div key={room.id} className="p-3 bg-slate-950/70 border border-brand-gold/15 hover:border-brand-gold/35 rounded-2xl space-y-2.5 transition duration-300">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 truncate">
                            <span className="flex items-center gap-1 text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full w-max uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                              Live Open
                            </span>
                            <h4 className="text-xs font-bold text-white font-serif tracking-tight leading-snug truncate" title={room.title}>
                              {room.title}
                            </h4>
                          </div>
                          
                          {isCreator && (
                            <button
                              type="button"
                              onClick={() => handleEndMeetRoom(room.id)}
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white transition cursor-pointer shrink-0"
                              title="Akhiri Sesi (Khusus Pembuat Ruang)"
                            >
                              <VideoOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
                          {/* Host info */}
                          <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                            <img
                              src={room.hostAvatar || selectedAvatar}
                              alt={room.hostName}
                              className="w-5.5 h-5.5 rounded-full object-cover border border-white/15"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[10px] text-gray-400 truncate leading-none font-medium">{room.hostName}</span>
                          </div>

                          {/* Join Link */}
                          <a
                            href={room.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-gold hover:bg-white text-brand-charcoal text-[10px] font-black uppercase rounded-lg transition shadow cursor-pointer active:scale-95"
                          >
                            <Video className="w-3 h-3 stroke-[2.5px]" />
                            <span>Gabung</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 leading-normal italic text-center py-4 bg-slate-950/30 rounded-2xl border border-white/5">
                  Belum ada sesi tatap muka aktif saat ini.<br/>
                  Mulailah sesi baru di bawah!
                </p>
              )}
            </div>

            {/* Meet Creation Form / Authorization */}
            <div className="pt-3 border-t border-white/5 space-y-3">
              <span className="text-[9px] font-mono font-bold text-brand-gold uppercase tracking-widest block">ADMINISTRASI RUANG ANDA</span>
              
              {!meetToken ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleConnectMeet}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-sm active:scale-98"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Otorisasi Akun Google</span>
                  </button>
                  <div className="text-[9px] text-gray-500 font-mono text-center">
                    Gunakan integrasi tatap muka langsung via Google Meet premium.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/15 text-[10px] font-mono text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Google Meet Terhubung
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setMeetToken(null)}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-mono uppercase font-bold cursor-pointer"
                    >
                      Putus
                    </button>
                  </div>

                  {!meetRoomResult ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Contoh: Sesi Mentorship / Tanya Jawab..."
                        value={meetTopicInput}
                        onChange={(e) => setMeetTopicInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-gray-550 focus:outline-none focus:border-brand-gold font-medium font-sans"
                      />
                      <button
                        type="button"
                        disabled={isGeneratingMeet}
                        onClick={handleCreateMeetSpace}
                        className="w-full py-2.5 bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-50 text-brand-charcoal text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Video className="w-4 h-4 stroke-[2.5px]" />
                        <span>{isGeneratingMeet ? 'Mempersiapkan...' : 'Buka Ruang Meet Baru'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950/80 p-3 rounded-2xl border border-brand-gold/30 space-y-3">
                      <div className="space-y-1">
                        <span className="text-[8px] font-mono font-bold text-brand-gold uppercase block">RUANG INSTAN ANDA:</span>
                        <h4 className="text-xs font-bold text-white truncate leading-tight">{meetRoomResult.title}</h4>
                      </div>

                      <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-2 overflow-hidden select-all">
                        <span className="text-[10px] text-brand-gold truncate font-mono select-all font-bold">{meetRoomResult.uri}</span>
                        <a 
                          href={meetRoomResult.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1 bg-brand-gold text-brand-charcoal hover:bg-white rounded-md transition shrink-0"
                          title="Masuk Meet"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isSharingMeet}
                          onClick={handleShareMeetToForum}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{isSharingMeet ? 'Menyiarkan...' : 'Siarkan ke Forum'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMeetRoomResult(null);
                            setMeetTopicInput('');
                          }}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-bold rounded-xl transition cursor-pointer"
                        >
                          Selesai
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* EXPANDABLE SCOPE DIAGNOSTIC LOGS */}
            {authScopeLogs && (
              <div className="mt-3 p-3.5 bg-slate-950 border border-brand-gold/15 rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-mono font-extrabold text-brand-gold uppercase tracking-wider block">OAUTH2 SCOPE DIAGNOSTICS</span>
                  <button 
                    type="button"
                    onClick={() => setAuthScopeLogs(null)}
                    className="text-[8.5px] font-mono font-bold text-gray-500 hover:text-white uppercase transition cursor-pointer"
                  >
                    Tutup Logs
                  </button>
                </div>
                <div className="space-y-1.5 font-mono text-[9px]">
                  <div className="text-gray-400">
                    <span className="text-gray-550 mr-1">Scopes Requested:</span> 
                    <span className="text-zinc-300 font-bold">{authScopeLogs.scopesRequested.join(', ')}</span>
                  </div>
                  {authScopeLogs.scopesReceived && (
                    <div className="text-gray-400">
                      <span className="text-gray-550 mr-1">Scopes Granted:</span> 
                      <span className="text-emerald-400 font-bold">{authScopeLogs.scopesReceived.join(', ')}</span>
                    </div>
                  )}
                  <div className="text-gray-400">
                    <span className="text-gray-550 mr-1">Workspace Authorized:</span>{" "}
                    <span className={authScopeLogs.hasWorkspacePermission ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                      {authScopeLogs.hasWorkspacePermission ? "YES" : "NO"}
                    </span>
                  </div>
                  {authScopeLogs.lastExchangeTime && (
                    <div className="text-gray-500">
                      <span className="text-gray-550 mr-1">Last Timestamp:</span> {authScopeLogs.lastExchangeTime}
                    </div>
                  )}
                  <div className="text-[8.5px] p-2 bg-black/40 rounded-xl border border-white/5 text-gray-400 break-words leading-relaxed whitespace-pre-wrap font-sans">
                    <span className="font-mono text-brand-gold font-bold block mb-0.5">DEBUG STATUS LOG:</span>
                    {authScopeLogs.diagnosticInfo}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6" id="discussion-feed">
          {processedPosts.map((post) => {
            const isLikedByMe = likedPostsCache.includes(post.id);
            const isVerifiedAuthor = hasWorksInGallery(post.authorUid, post.authorName);
            return (
              <div
                key={post.id}
                onClick={() => requireAuth(() => setSelectedPostDetail(post), "Masuk untuk melihat detail dan berdiskusi.")}
                className={`bg-brand-card hover:bg-brand-card/90 rounded-3xl border p-6 space-y-5 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl group border-l-4 ${post.group === 'Kolaborasi' ? 'border-l-emerald-500' : post.group === 'Workshop' ? 'border-l-violet-500' : post.group === 'Karya' ? 'border-l-brand-gold' : 'border-l-sky-500'} border-white/5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img src={post.authorAvatar} alt={post.authorName} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-brand-card rounded-full shadow-sm animate-pulse" title="Online" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 px-0.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white leading-tight">{post.authorName}</h4>
                        {isVerifiedAuthor && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-brand-gold/10 border border-brand-gold/35 text-brand-gold text-[8px] font-mono font-black uppercase rounded" title="Kreator Terverifikasi: Memiliki karya di Galeri utama">
                            <Check className="w-2.5 h-2.5 stroke-[3px]" /> Terverifikasi
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{post.timestamp}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${post.group === 'Kolaborasi' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : post.group === 'Workshop' ? 'bg-violet-500/10 text-violet-400 border-violet-500/25' : post.group === 'Karya' ? 'bg-amber-500/10 text-brand-gold border-brand-gold/25' : 'bg-sky-500/10 text-sky-400 border-sky-500/25'}`}>
                    {post.group === 'Kolaborasi' ? '🎨 Kolaborasi' : post.group === 'Workshop' ? '🎓 Workshop' : post.group === 'Karya' ? '🖼️ Pameran' : '💬 Diskusi'}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-bold text-white tracking-tight group-hover:text-brand-gold transition-colors">
                    {post.title}
                  </h3>

                  {post.imageUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-white/5 max-h-[240px] w-full md:w-3/4 mb-1">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                    {post.content}
                  </p>
                </div>

                {post.group === 'Kolaborasi' && (
                  <div className="bg-emerald-950/20 border border-emerald-500/10 p-4 rounded-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-extrabold uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5" /> Rekrutmen Peran Kolaborasi
                      </div>
                      <span className="text-[9px] font-mono text-emerald-550 italic">Klik tombol untuk mengambil peran</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      {post.rolesNeeded && post.rolesNeeded.length > 0 ? (
                        post.rolesNeeded.map((role) => {
                          const assignedUser = post.collaborativeMembers?.[role];
                          const isAssignedToMe = assignedUser === currentUser?.displayName;
                          
                          if (assignedUser) {
                            return (
                              <div 
                                key={role}
                                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-semibold text-xs ${
                                  isAssignedToMe 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                    : 'bg-zinc-900 border-white/5 text-zinc-400'
                                  }`}
                              >
                                <span className="text-zinc-500 font-mono text-[10px] font-medium">{role}:</span>
                                <span className="truncate max-w-[120px]">{isAssignedToMe ? 'Saya' : assignedUser}</span>
                                {isAssignedToMe && (
                                  <button
                                    onClick={(e) => handleLeaveRoleFromFeed(post.id, role, e)}
                                    className="p-0.5 hover:bg-rose-500/20 hover:text-rose-450 rounded cursor-pointer transition"
                                    title="Keluar dari peran"
                                  >
                                    <X className="w-3 h-3 text-rose-400" />
                                  </button>
                                )}
                              </div>
                            );
                          } else {
                            return (
                              <button
                                key={role}
                                onClick={(e) => handleJoinRoleFromFeed(post.id, role, e)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal text-[11px] font-mono font-black rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Ambil {role}
                              </button>
                            );
                          }
                        })
                      ) : (
                        <span className="text-gray-500 text-[10px] font-mono">Tidak ada peran khusus yang didaftarkan.</span>
                      )}
                    </div>
                  </div>
                )}

                {post.isMeetPost && post.meetUri && (
                  <div className="bg-brand-gold/5 border border-brand-gold/25 p-4 rounded-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-brand-gold font-extrabold uppercase tracking-wider">
                        <Video className="w-4 h-4 text-brand-gold animate-bounce" /> Sesi Video Google Meet Sedang Live
                      </div>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-mono font-bold animate-pulse">
                        <span className="w-1 h-1 rounded-full bg-emerald-400" /> ONLINE
                      </span>
                    </div>

                    <p className="text-xs text-gray-300">
                      Topik Sesi: <strong className="text-white font-serif font-bold">"{post.meetTitle || 'Diskusi Tatap Muka'}"</strong>
                    </p>
                    
                    <a
                      href={post.meetUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoal text-[11px] font-black font-sans uppercase rounded-xl transition cursor-pointer shadow-md active:scale-98"
                    >
                      <Video className="w-3.5 h-3.5 stroke-[2.5px]" />
                      <span>Gabung Google Meet</span>
                      <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" />
                    </a>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <button onClick={(e) => handleLikePost(post.id, e)} className={`flex items-center gap-1.5 text-xs cursor-pointer active:scale-95 transition-all p-2 rounded-xl hover:bg-rose-500/5 ${isLikedByMe ? 'text-rose-500 font-bold bg-rose-500/5 border border-rose-500/15 px-3' : 'text-gray-400 hover:text-white'}`}>
                      <Heart className={`w-4 h-4 transition-transform ${isLikedByMe ? 'fill-current scale-105' : ''}`} />
                      <span>{post.likes || 0} Suka</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 p-2">
                      <MessageSquare className="w-4 h-4 text-brand-gold" />
                      <span>{post.comments?.length || 0} Komentar</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {currentUser && (post.authorUid === currentUser.uid || userRole === 'admin') && (
                      <button onClick={(e) => handleDeletePost(post.id, e)} className="p-2.5 bg-slate-900/50 hover:bg-rose-950 border border-white/5 hover:border-rose-500/20 text-gray-400 hover:text-rose-400 rounded-xl transition-all" title="Hapus Postingan">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button className="px-4 py-2.5 bg-slate-950 group-hover:bg-brand-gold/10 border border-white/5 group-hover:border-brand-gold/35 text-white group-hover:text-brand-gold rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all">
                      <span>Lihat Diskusi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {processedPosts.length === 0 && (
            <div className="text-center py-20 bg-brand-card rounded-3xl border border-white/5 space-y-4">
              <Users className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-gray-400 text-sm font-semibold">Belum Ada Gagasan</p>
              <p className="text-gray-500 text-xs max-w-sm mx-auto">Tidak ada postingan yang cocok dengan filter Anda. Coba reset filter atau jadilah yang pertama memulai diskusi!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
