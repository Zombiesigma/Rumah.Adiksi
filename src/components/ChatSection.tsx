/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { upload } from '@imagekit/react';
import {
  Send,
  MessageCircle,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  MoreVertical,
  User,
  Users,
  Clock,
  Sparkles,
  Lock,
  Plus,
  Trash2,
  X,
  ExternalLink,
  MessageSquare,
  Shield,
  Palette,
  Briefcase,
  Camera,
  Loader,
  Maximize2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  getDocs,
  getDoc
} from 'firebase/firestore';

interface ChatSectionProps {
  currentUser: FirebaseUser | null;
  openAuthModal: () => void;
  initialTargetUserId?: string | null; // UID of user to start chat with
  initialTargetUserName?: string | null; // Name of user to start chat with
  initialTargetUserAvatar?: string | null; // Avatar of user to start chat with
  initialTargetRoomId?: string | null; // ID of room to open
  onClose?: () => void;
  onClearInitialTargets?: () => void;
}

interface ChatRoom {
  id: string; // "dm_uid1_uid2" or "group_postId"
  type: 'dm' | 'group';
  title: string;
  avatarUrl?: string;
  participants: string[];
  participantNames: { [uid: string]: string };
  participantAvatars?: { [uid: string]: string };
  lastMessage: string;
  lastMessageTime: any;
  lastMessageSenderId?: string;
  createdAt: any;
  associatedPostId?: string;
  status?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: any;
  isSystem?: boolean;
  imageUrl?: string;
}

export default function ChatSection({
  currentUser,
  openAuthModal,
  initialTargetUserId,
  initialTargetUserName,
  initialTargetUserAvatar,
  initialTargetRoomId,
  onClose,
  onClearInitialTargets
}: ChatSectionProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [creatorsList, setCreatorsList] = useState<any[]>([]);
  const [isMobilePaneOpen, setIsMobilePaneOpen] = useState(false); // Controls view toggle on mobile

  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load all available talents/creators to start new conversations with
  useEffect(() => {
    if (!currentUser) return;
    const loadCreators = async () => {
      try {
        const snap = await getDocs(collection(db, 'talents'));
        const list = snap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((item: any) => item.id !== currentUser.uid); // Exclude self
        setCreatorsList(list);
      } catch (err) {
        console.warn("Failed loading talents list for chat start:", err);
      }
    };
    loadCreators();
  }, [currentUser]);

  // Listen to the user's active Chat Rooms
  useEffect(() => {
    if (!currentUser) return;

    // Fetch lists of rooms where participants array contains the current user's UID
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ChatRoom[];

      // Sort chats by lastMessageTime descending
      roomsData.sort((a, b) => {
        const timeA = a.lastMessageTime?.seconds || new Date(a.lastMessageTime || 0).getTime() || 0;
        const timeB = b.lastMessageTime?.seconds || new Date(b.lastMessageTime || 0).getTime() || 0;
        return timeB - timeA;
      });

      setRooms(roomsData);

      // Handle query-parameter triggers from other pages
      if (initialTargetRoomId) {
        const found = roomsData.find((r) => r.id === initialTargetRoomId);
        if (found) {
          setSelectedRoom(found);
          setIsMobilePaneOpen(true);
        }
        if (onClearInitialTargets) {
          onClearInitialTargets();
        }
      }
    }, (error) => {
      console.error("Firestore listening rooms fail:", error);
    });

    return () => unsubscribe();
  }, [currentUser, initialTargetRoomId]);

  // Trigger starting a chat with specific user passed from props (e.g. Talent contact)
  useEffect(() => {
    if (!currentUser || !initialTargetUserId) return;

    const startDirectChat = async () => {
      const sortedUids = [currentUser.uid, initialTargetUserId].sort();
      const roomId = `dm_${sortedUids[0]}_${sortedUids[1]}`;

      // Check if room already exists
      const roomRef = doc(db, 'chats', roomId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        setSelectedRoom({ id: roomId, ...roomSnap.data() } as ChatRoom);
        setIsMobilePaneOpen(true);
      } else {
        // Create new DM chat room
        const newRoomPayload: ChatRoom = {
          id: roomId,
          type: 'dm',
          title: initialTargetUserName || 'Sobat Adiksi',
          avatarUrl: initialTargetUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
          participants: [currentUser.uid, initialTargetUserId],
          participantNames: {
            [currentUser.uid]: currentUser.displayName || 'Anda',
            [initialTargetUserId]: initialTargetUserName || 'Artist'
          },
          participantAvatars: {
            [currentUser.uid]: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
            [initialTargetUserId]: initialTargetUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
          },
          lastMessage: 'Memulai koneksi ruang pesan baru...',
          lastMessageTime: new Date().toISOString(),
          lastMessageSenderId: currentUser.uid,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(roomRef, newRoomPayload);
          setSelectedRoom(newRoomPayload);
          setIsMobilePaneOpen(true);
        } catch (err) {
          console.error("Error creating DM room:", err);
        }
      }
    };

    startDirectChat();
    if (onClearInitialTargets) {
      onClearInitialTargets();
    }
  }, [currentUser, initialTargetUserId, initialTargetUserName, initialTargetUserAvatar]);

  // Listen to messages of the running selected chat room
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', selectedRoom.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(messagesData);
    }, (error) => {
      console.error("Error listening messages:", error);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  // Trigger creating/selecting DM with another user manually selected from Modal list
  const handleInitiateChatWithCreator = async (creator: any) => {
    if (!currentUser) return;
    setIsNewChatModalOpen(false);

    const sortedUids = [currentUser.uid, creator.id].sort();
    const roomId = `dm_${sortedUids[0]}_${sortedUids[1]}`;

    const roomRef = doc(db, 'chats', roomId);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      setSelectedRoom({ id: roomId, ...roomSnap.data() } as ChatRoom);
      setIsMobilePaneOpen(true);
    } else {
      const newRoomPayload: ChatRoom = {
        id: roomId,
        type: 'dm',
        title: creator.name || 'Sobat Adiksi',
        avatarUrl: creator.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
        participants: [currentUser.uid, creator.id],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Kreator',
          [creator.id]: creator.name || 'Artist'
        },
        participantAvatars: {
          [currentUser.uid]: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
          [creator.id]: creator.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
        },
        lastMessage: 'Percakapan baru di Rumah Adiksi...',
        lastMessageTime: new Date().toISOString(),
        lastMessageSenderId: currentUser.uid,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(roomRef, newRoomPayload);
        setSelectedRoom(newRoomPayload);
        setIsMobilePaneOpen(true);
      } catch (err) {
        console.error("Gagal memulai chat dengan kreator:", err);
      }
    }
  };

  // Upload Chat Photo
  const handleUploadChatPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran gambar melebihi 10MB. Silakan pilih berkas yang lebih kecil.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const response = await fetch('/api/imagekit-auth');
      if (!response.ok) {
        throw new Error(`Authentication request failed with status ${response.status}`);
      }
      const authData = await response.json();
      
      const meta = import.meta as any;
      const publicKey = meta.env?.VITE_IMAGEKIT_PUBLIC_KEY || "public_MEe5oaZyE+U9OClfeDX6JU/n1kw=";
      
      const result = await upload({
        file: file,
        fileName: file.name,
        publicKey: publicKey,
        signature: authData.signature,
        token: authData.token,
        expire: authData.expire,
        folder: "chat_photos",
      });

      setPhotoUrl(result.url);
    } catch (err: any) {
      console.error("Gagal mengunggah foto:", err);
      alert("Gagal mengunggah foto: " + (err.message || "Terdapat kendala koneksi atau otorisasi ImageKit"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Submit text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedRoom) return;
    if (!inputText.trim() && !photoUrl) return;

    const currentText = inputText.trim();
    const currentPhotoUrl = photoUrl;

    setInputText('');
    setPhotoUrl('');

    const messagePayload: any = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Anggota Adiksi',
      senderAvatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
      text: currentText,
      timestamp: new Date().toISOString(),
      isSystem: false
    };

    if (currentPhotoUrl) {
      messagePayload.imageUrl = currentPhotoUrl;
    }

    try {
      // Add message to room subcollection
      const messagesColRef = collection(db, 'chats', selectedRoom.id, 'messages');
      await addDoc(messagesColRef, messagePayload);

      let docText = currentText;
      if (currentPhotoUrl) {
        docText = currentText ? `📷 ${currentText}` : '📷 Membagikan Foto/Karya';
      }

      // Update room metadata for sidebar sorting
      const roomRef = doc(db, 'chats', selectedRoom.id);
      await updateDoc(roomRef, {
        lastMessage: docText,
        lastMessageTime: new Date().toISOString(),
        lastMessageSenderId: currentUser.uid
      });
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    }
  };

  // Helper date formatter
  const formatTime = (isoString?: string | any) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime()) && isoString.seconds) {
        const d = new Date(isoString.seconds * 1000);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getRecipientInfo = (room: ChatRoom) => {
    if (room.type === 'group') {
      return {
        title: room.title || 'Studio Kolaborasi',
        avatar: room.avatarUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=150'
      };
    }
    const otherId = room.participants.find((id) => id !== currentUser?.uid);
    return {
      title: otherId ? (room.participantNames[otherId] || 'Sobat Adiksi') : 'Kamar Simpan',
      avatar: (otherId && room.participantAvatars?.[otherId]) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
    };
  };

  // Filter conversations
  const filteredRooms = rooms.filter((room) => {
    const info = getRecipientInfo(room);
    return info.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           room.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-2 md:px-6 py-4 pb-28 md:pb-6 font-sans">
      {!currentUser ? (
        <div className="py-20 text-center max-w-md mx-auto space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-brand-gold/15 rounded-full flex items-center justify-center mx-auto border border-brand-gold/25 text-brand-gold animate-bounce">
              <MessageCircle className="w-10 h-10" />
            </div>
            <div className="absolute top-0 right-1/3 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl font-bold text-white">Hubungan Komunitas Instan</h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Masuk atau daftar dengan aman untuk membuka akses ke sistem obrolan real-time Adiksi Messenger. Mengobrol dengan kreator, koordinasi proyek kolaborasi, donasi, dan negosiasi karya orisinal secara privat.
            </p>
          </div>
          <button
            onClick={openAuthModal}
            className="px-6 py-2.5 bg-brand-gold hover:bg-white text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-brand-gold/20 cursor-pointer"
          >
            Masuk / Hubungi Seniman
          </button>
        </div>
      ) : (
        <div id="adiksi-messenger-frame" className="bg-slate-950/60 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden h-[calc(100vh-210px)] md:h-[calc(100vh-190px)] min-h-[500px] max-h-[820px] flex shadow-2xl relative">
          
          {/* SIDEBAR: List Chat rooms (Visible on Desktop always, on Mobile only when no chat is focused) */}
          <div className={`w-full md:w-[320px] lg:w-[360px] border-r border-white/5 flex flex-col shrink-0 ${isMobilePaneOpen ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                  <h3 className="font-serif text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                    Adiksi Chat <span className="font-mono text-[9px] uppercase tracking-widest text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/15">Beta</span>
                  </h3>
                </div>
                
                {/* Plus button to initiate direct chat manually */}
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="p-1.5 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-brand-charcoal rounded-xl transition cursor-pointer select-none"
                  title="Mulai Percakapan Baru"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari chat atau teman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-brand-gold/50 placeholder-gray-500 font-sans"
                />
              </div>
            </div>

            {/* Chats List Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => {
                  const info = getRecipientInfo(room);
                  const isFocused = selectedRoom?.id === room.id;
                  const isSentByMe = room.lastMessageSenderId === currentUser.uid;

                  return (
                    <div
                      key={room.id}
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsMobilePaneOpen(true);
                      }}
                      className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                        isFocused
                          ? 'bg-brand-gold/15 border-brand-gold/25'
                          : 'bg-transparent border-transparent hover:bg-white/5'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={info.avatar}
                          alt={info.title}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-white/10 bg-slate-900"
                        />
                        {room.type === 'group' ? (
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full text-white font-black">
                            <Users className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-950" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-bold text-white truncate font-sans">
                            {info.title}
                          </h4>
                          <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
                            {formatTime(room.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate font-sans flex items-center gap-1">
                          {isSentByMe && <CheckCheck className="w-3 h-3 text-brand-gold shrink-0" />}
                          <span>{room.lastMessage}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 space-y-2">
                  <MessageCircle className="w-7 h-7 mx-auto text-gray-600 mb-1" />
                  <p className="text-xs text-gray-400 font-semibold">Percakapan Kosong</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed px-4">
                    Belum ada obrolan aktif. Ketuk tombol '+' di kanan atas untuk memulai obrolan dengan kreator berbakat Pelabuhan Ratu!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CHAT WINDOW: Conversations viewport (Visible on desktop always, on mobile toggled based on isMobilePaneOpen) */}
          <div className={`flex-1 flex flex-col bg-slate-950/30 overflow-hidden ${!isMobilePaneOpen ? 'hidden md:flex' : 'flex'}`}>
            {selectedRoom ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-white/5 bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Back Button for mobile */}
                    <button
                      onClick={() => setIsMobilePaneOpen(false)}
                      className="p-1.5 bg-white/5 text-gray-300 hover:text-white rounded-lg md:hidden cursor-pointer mr-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <img
                      src={getRecipientInfo(selectedRoom).avatar}
                      alt={getRecipientInfo(selectedRoom).title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    />

                    <div>
                      <h4 className="text-xs font-black text-white hover:underline transition-all">
                        {getRecipientInfo(selectedRoom).title}
                      </h4>
                      <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                        {selectedRoom.type === 'group' ? 'Grup Kolaboratif Seniman' : 'Konsultasi Seni Privat'}
                      </p>
                    </div>
                  </div>

                  {/* Top-Right details */}
                  {selectedRoom.associatedPostId && (
                    <span className="text-[9px] font-mono font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/25 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md shrink-0">
                      <Sparkles className="w-3 h-3 text-brand-gold" /> PROYEK GAS
                    </span>
                  )}
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-950/10">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => {
                      const isMe = msg.senderId === currentUser.uid;

                      // Check if it is a system announcement
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id || index} className="flex justify-center py-2 animate-fadeIn">
                            <span className="px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 text-brand-gold text-[10px] font-serif font-semibold rounded-full shadow flex items-center gap-1.5">
                              🚀 {msg.text}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id || index}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                        >
                          {/* Senders Avatar if not Me */}
                          {!isMe && (
                            <img
                              src={msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'}
                              alt={msg.senderName}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-lg object-cover border border-white/5 mb-1 shrink-0"
                            />
                          )}

                          <div className="space-y-0.5 max-w-[70%]">
                            {/* In Group chats: display sender's name if not Me */}
                            {selectedRoom.type === 'group' && !isMe && (
                              <span className="text-[9px] font-bold text-brand-gold font-mono block px-2">
                                {msg.senderName}
                              </span>
                            )}

                            {msg.imageUrl ? (
                              /* LUXURY PRESS IMAGE BUBBLE */
                              <div
                                className={`overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(217,119,6,0.12)] border select-none group max-w-xs sm:max-w-sm md:max-w-md ${
                                  isMe
                                    ? 'bg-slate-950/80 border-brand-gold/30 hover:border-brand-gold/50 rounded-br-none'
                                    : 'bg-slate-950/80 border-white/10 hover:border-brand-gold/30 rounded-bl-none'
                                }`}
                              >
                                <div 
                                  onClick={() => setLightboxUrl(msg.imageUrl || null)}
                                  className="relative overflow-hidden cursor-pointer bg-black/40"
                                >
                                  {/* Golden Reflection Sheet */}
                                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent z-10" />
                                  <img
                                    src={msg.imageUrl}
                                    alt="Shared Masterpiece"
                                    className="max-h-64 sm:max-h-80 w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/10 transition-opacity" />
                                  
                                  {/* "Zoom" trigger button on image hover */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[1.5px]">
                                    <span className="p-2.5 bg-brand-gold text-brand-charcoal rounded-full shadow-2xl transform scale-90 group-hover:scale-100 transition-all duration-300 flex items-center gap-1.5 text-[9px] font-mono font-black uppercase tracking-wider">
                                      <Maximize2 className="w-3.5 h-3.5 stroke-[3px]" /> PERBESAR KARYA
                                    </span>
                                  </div>
                                  
                                  {/* Golden Sparkle badge */}
                                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/75 border border-brand-gold/30 rounded text-[8px] font-mono font-black tracking-widest text-brand-gold uppercase backdrop-blur-sm z-10 flex items-center gap-1 scale-90">
                                    <span className="w-1 h-1 rounded-full bg-brand-gold animate-ping" /> KARYA
                                  </span>
                                </div>

                                {/* Text & Meta Section for Image */}
                                <div className="p-3 bg-slate-950/50 border-t border-white/5">
                                  {msg.text && (
                                    <p className="text-[12px] font-sans text-gray-200 mb-2 leading-relaxed whitespace-pre-wrap font-medium">
                                      {msg.text}
                                    </p>
                                  )}
                                  <div className="flex justify-between items-center gap-3">
                                    <span className="text-[8px] font-mono text-brand-gold/60 uppercase tracking-widest font-black">
                                      Koneksi Adiksi
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-mono text-gray-500">
                                        {formatTime(msg.timestamp)}
                                      </span>
                                      {isMe && (
                                        <CheckCheck className="w-3.5 h-3.5 text-brand-gold/85" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* LUXURY STANDALONE TEXT BUBBLE */
                              <div
                                className={`p-3 rounded-2xl text-[12px] font-sans leading-relaxed shadow-md whitespace-pre-wrap transition-all duration-300 ${
                                  isMe
                                    ? 'bg-gradient-to-br from-brand-gold to-amber-500 text-brand-charcoal font-semibold rounded-br-none shadow-brand-gold/10 hover:brightness-105'
                                    : 'bg-gradient-to-br from-slate-900 to-brand-card text-gray-200 border border-white/5 rounded-bl-none hover:border-white/10'
                                }`}
                              >
                                <p>{msg.text}</p>
                                
                                <div className="flex justify-end items-center gap-1 mt-1.5 opacity-80">
                                  <span className={`text-[9px] font-mono ${isMe ? 'text-brand-charcoal/70' : 'text-gray-500'}`}>
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {isMe && (
                                    <CheckCheck className="w-3.5 h-3.5 text-brand-charcoal/80" />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-2 opacity-50">
                      <MessageCircle className="w-8 h-8 text-brand-gold" />
                      <p className="text-xs font-semibold text-white">Tidak Ada Pesan</p>
                      <p className="text-[10px] text-gray-400">Kirim teks perkenalan atau pertanyaan pertama untuk memulai dialog hangat!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Preview for Uploaded Photo inside active chat */}
                <AnimatePresence>
                  {photoUrl && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 py-3 bg-slate-950/90 border-t border-brand-gold/30 flex items-center justify-between gap-3 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-brand-gold/50 bg-black shadow-lg">
                          <img src={photoUrl} alt="Upload preview thumbnail" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-brand-gold/10 mix-blend-color-dodge" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono font-bold text-brand-gold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-gold animate-pulse" /> Karya Siap Dikirim
                          </p>
                          <p className="text-[9px] text-gray-500 font-sans truncate max-w-[200px] sm:max-w-xs">{photoUrl}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="p-1.5 bg-white/5 hover:bg-rose-500 hover:text-white border border-white/10 hover:border-transparent text-gray-400 rounded-lg transition cursor-pointer"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Input bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-white/5 bg-slate-950 flex items-center gap-3 relative"
                >
                  {/* Image Attachment Trigger */}
                  <div className="relative shrink-0 flex items-center">
                    <input
                      type="file"
                      id="chat-photo-input"
                      accept="image/*"
                      onChange={handleUploadChatPhoto}
                      className="hidden"
                      disabled={isUploadingPhoto}
                    />
                    <label
                      htmlFor="chat-photo-input"
                      className={`p-2.5 bg-white/5 hover:bg-brand-gold/25 border border-white/5 hover:border-brand-gold/30 text-gray-400 hover:text-brand-gold rounded-xl transition-all cursor-pointer relative flex items-center justify-center active:scale-95 ${isUploadingPhoto ? 'animate-pulse' : ''}`}
                      title="Kirim Gambar Mahakarya"
                    >
                      {isUploadingPhoto ? (
                        <Loader className="w-4 h-4 animate-spin text-brand-gold" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </label>
                  </div>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isUploadingPhoto ? "Sedang memproses foto..." : "Ketik pesan apresiasi, diskusi, atau kolaborasi Anda..."}
                    className="flex-1 bg-slate-900 border border-white/5 rounded-2xl py-2.5 px-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/60 font-sans"
                    maxLength={1000}
                    disabled={isUploadingPhoto}
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !photoUrl) || isUploadingPhoto}
                    className="p-2.5 bg-brand-gold hover:bg-amber-500 text-brand-charcoal disabled:opacity-40 disabled:hover:bg-brand-gold rounded-xl transition cursor-pointer shrink-0 scroll-smooth active:scale-95 flex items-center justify-center"
                    title="Kirim pesan"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              // Empty selection screen
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-slate-905 rounded-3xl border border-white/5 flex items-center justify-center text-brand-gold/50 shadow-inner">
                  <MessageSquare className="w-8 h-8 text-brand-gold animate-pulse" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Silakan Pilih Percakapan</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Ketuk pada salah satu teman atau grup komunal yang berada di bilah kiri untuk membuka jembatan komunikasi artistik Anda.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* START CHAT MODAL: List of authors/creators */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-card border border-white/10 p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl text-white"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-gold" /> Hubungi Kreator Lokal
                </h3>
                <button
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-gray-400 font-sans">
                Pilih salah satu kreator berbakat Pelabuhan Ratu di bawah ini untuk memulai obrolan langsung secara pribadi:
              </p>

              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {creatorsList.length > 0 ? (
                  creatorsList.map((creator) => (
                    <div
                      key={creator.id}
                      onClick={() => handleInitiateChatWithCreator(creator)}
                      className="p-3 bg-slate-950/40 hover:bg-brand-gold/10 hover:border-brand-gold/20 border border-white/5 rounded-2xl flex items-center gap-3 transition cursor-pointer"
                    >
                      <img
                        src={creator.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'}
                        alt={creator.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-xl object-cover border border-white/10"
                      />
                      <div className="text-left font-sans">
                        <span className="text-xs font-bold text-white block">{creator.name}</span>
                        <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider">{creator.field || 'Seni Kreatif'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center text-gray-500 py-6">Kreator lain sedang mempersiapkan diri. Silakan coba sesaat lagi.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LUXURIOUS LIGHTBOX SPECTACLE FOR SHARED MASTERPIECES */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl no-print"
          >
            <div className="absolute inset-0 cursor-gradient-out cursor-zoom-out" onClick={() => setLightboxUrl(null)} />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            >
              <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-1 z-10">
                <span className="text-white text-xs font-mono font-bold tracking-widest uppercase flex items-center gap-1 bg-brand-gold/10 border border-brand-gold/20 px-3 py-1 rounded-full text-brand-gold shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-brand-gold" /> MAHASENI ADIKSI
                </span>
                
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="p-2 bg-white/5 hover:bg-rose-500 hover:text-white text-gray-300 border border-white/10 hover:border-transparent rounded-full shadow-lg transition duration-300 transform hover:rotate-90 cursor-pointer"
                  title="Tutup Detil"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative p-1 bg-gradient-to-r from-brand-gold via-amber-500 to-yellow-500 rounded-3xl shadow-[0_0_50px_rgba(217,119,6,0.35)] group overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-gold/50 via-amber-500/50 to-yellow-500/50 rounded-3xl blur opacity-35 group-hover:opacity-60 transition duration-1000" />
                <motion.img
                  layoutId="spectacle-shared-image"
                  src={lightboxUrl}
                  alt="Shared Artwork Spectacular"
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl relative z-10 border border-white/5"
                />
              </div>

              <p className="text-[10px] text-gray-400 font-mono mt-4 text-center tracking-wide uppercase">
                Ketuk di luar gambar untuk menutup • Karya seni ini mengalir dalam detak Komunitas Adiksi
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
