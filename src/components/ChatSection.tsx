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
  Maximize2,
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  Activity
} from 'lucide-react';
import {
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  User as StreamUser
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';

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
  // Global stream props
  globalStreamClient?: StreamVideoClient | null;
  globalActiveCallInstance?: any;
  setGlobalActiveCallInstance?: (val: any) => void;
  globalCallMode?: 'video' | 'audio' | null;
  setGlobalCallMode?: (val: 'video' | 'audio' | null) => void;
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
  onClearInitialTargets,
  // Global stream props
  globalStreamClient,
  globalActiveCallInstance,
  setGlobalActiveCallInstance,
  globalCallMode,
  setGlobalCallMode
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

  // GetStream SDK State & Realtime Call/Typing State dynamically fallback to local states
  const [localStreamClient, setLocalStreamClient] = useState<StreamVideoClient | null>(null);
  const streamClient = globalStreamClient !== undefined ? globalStreamClient : localStreamClient;

  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [streamWsState, setStreamWsState] = useState<string>('disconnected');

  // Sandbox detection for safe-area & WebRTC warning diagnostics
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (!streamClient) {
      setStreamWsState('disconnected');
      return;
    }
    
    setStreamWsState(streamClient.wsConnectionState || 'disconnected');

    let unsub: any = null;
    if (typeof streamClient.on === 'function') {
      try {
        unsub = streamClient.on('connection.changed', (e: any) => {
          setStreamWsState(streamClient.wsConnectionState || 'disconnected');
        });
      } catch (err) {
        console.warn("Could not register live connection listener:", err);
      }
    }

    const backupInterval = setInterval(() => {
      const activeState = streamClient.wsConnectionState || 'disconnected';
      setStreamWsState(activeState);
    }, 2000);

    return () => {
      if (unsub) unsub();
      clearInterval(backupInterval);
    };
  }, [streamClient]);

  const [localActiveCallInstance, setLocalActiveCallInstance] = useState<any>(null);
  const activeCallInstance = globalActiveCallInstance !== undefined ? globalActiveCallInstance : localActiveCallInstance;
  const setActiveCallInstance = setGlobalActiveCallInstance || setLocalActiveCallInstance;

  const [localCallMode, setLocalCallMode] = useState<'video' | 'audio' | null>(null);
  const callMode = globalCallMode !== undefined ? globalCallMode : localCallMode;
  const setCallMode = setGlobalCallMode || setLocalCallMode;
  const [currentRoomDoc, setCurrentRoomDoc] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  // Find if there is any pending incoming call for the current user in any of their message rooms
  const incomingCallingRoom = rooms.find(
    (room) =>
      room.activeCall?.status === 'connecting' &&
      room.activeCall?.callerId !== currentUser?.uid
  );

  // Additional Realtime Features: Fallback, Presence, Call History, and Quick Replies
  const [isSimulatedCallActive, setIsSimulatedCallActive] = useState<boolean>(false);
  const [recipientPresence, setRecipientPresence] = useState<{ isOnline: boolean; lastActive?: string } | null>(null);
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState<boolean>(false);
  const [callHistoryList, setCallHistoryList] = useState<any[]>([]);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callStatusMessage, setCallStatusMessage] = useState<string>("MENGHUBUNGKAN...");
  const [callError, setCallError] = useState<string | null>(null);
  const [hasRemoteCallStream, setHasRemoteCallStream] = useState<boolean>(false);

  const incomingCallPending = Boolean(
    (incomingCallingRoom?.activeCall?.status === 'connecting' && incomingCallingRoom.activeCall.callerId !== currentUser?.uid) ||
    (currentRoomDoc?.activeCall?.status === 'connecting' && currentRoomDoc.activeCall.callerId !== currentUser?.uid)
  );
  
  // Controls inside simulation
  const [simIsMuted, setSimIsMuted] = useState<boolean>(false);
  const [simIsCamOff, setSimIsCamOff] = useState<boolean>(false);

  // Web Audio Context for Ringtone Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalDocRef = useRef<any>(null);
  const signalUnsubscribeRef = useRef<(() => void) | null>(null);
  const callRoleRef = useRef<'caller' | 'callee' | null>(null);
  const pendingRemoteCandidatesRef = useRef<any[]>([]);
  const didCreateInternalOfferRef = useRef(false);

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const startDialTone = () => {
    try {
      stopRingtone();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const playBeep = () => {
        if (!ctx || ctx.state === 'closed') return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.frequency.value = 400; // 400Hz Classic WhatsApp-like Dial tone part 1
        osc2.frequency.value = 450; // Classic Dial tone part 2

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime + 1.25);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.35);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.5);
        osc2.stop(ctx.currentTime + 1.5);
      };

      playBeep();
      ringIntervalRef.current = setInterval(playBeep, 2500);
    } catch (e) {
      console.warn("AudioContext failed or blocked by autoplay rules:", e);
    }
  };

  const startRingTone = () => {
    try {
      stopRingtone();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const notes = [
        { f: 523.25, d: 0.15 }, // C5
        { f: 587.33, d: 0.15 }, // D5
        { f: 659.25, d: 0.15 }, // E5
        { f: 783.99, d: 0.25 }, // G5
        { f: 659.25, d: 0.15 }, // E5
        { f: 783.99, d: 0.35 }  // G5
      ];

      const playMelody = () => {
        if (!ctx || ctx.state === 'closed') return;
        let time = ctx.currentTime;
        notes.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, time + note.d - 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + note.d);
          time += note.d;
        });
      };

      playMelody();
      ringIntervalRef.current = setInterval(playMelody, 2000);
    } catch (e) {
      console.warn("AudioContext failed or blocked by autoplay rules:", e);
    }
  };

  const typingTimeoutRef = useRef<{ [roomId: string]: any }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Stream Video Client (only if not passed globally)
  useEffect(() => {
    if (globalStreamClient !== undefined) return;

    if (!currentUser) {
      setLocalStreamClient(null);
      return;
    }

    const initStream = async () => {
      try {
        const res = await fetch(`/api/stream/token?userId=${currentUser.uid}`);
        if (!res.ok) throw new Error("Gagal mengambil token Stream");
        const { token, apiKey } = await res.json();

        const streamUser: StreamUser = {
          id: currentUser.uid,
          name: currentUser.displayName || 'Anggota Adiksi',
          image: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
        };

        const client = new StreamVideoClient({ 
          apiKey, 
          user: streamUser, 
          token 
        });
        await client.connectUser(streamUser, token);
        setLocalStreamClient(client);
      } catch (err) {
        console.error("Error initializing Stream Video Client locally:", err);
      }
    };

    initStream();
  }, [currentUser, globalStreamClient]);

  // Listen to typing status and active call status of the selected room
  useEffect(() => {
    if (!currentUser || !selectedRoom) {
      setTypingUsers([]);
      setCurrentRoomDoc(null);
      return;
    }

    const roomRef = doc(db, 'chats', selectedRoom.id);
    const unsubscribeRoomDef = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentRoomDoc({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => {
      console.error("Gagal mendengarkan dokumen ruang obrolan:", error);
    });

    const typingColRef = collection(db, 'chats', selectedRoom.id, 'typing');
    const unsubscribeTyping = onSnapshot(typingColRef, (snapshot) => {
      const typingList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(user => user.id !== currentUser.uid && user.isTyping && 
          (Date.now() - new Date(user.lastActive || 0).getTime() < 12000)
        );
      setTypingUsers(typingList);
    }, (error) => {
      console.warn("Gagal mendengarkan status mengetik:", error);
    });

    return () => {
      unsubscribeRoomDef();
      unsubscribeTyping();
      // Reset typing status on exit
      const typingRef = doc(db, 'chats', selectedRoom.id, 'typing', currentUser.uid);
      setDoc(typingRef, { isTyping: false, lastActive: new Date().toISOString() }, { merge: true }).catch(() => {});
    };
  }, [selectedRoom, currentUser]);

  // Sync state with incoming or ending calls globally or in the active room
  useEffect(() => {
    if (!currentUser) {
      stopRingtone();
      return;
    }

    // Prioritize ringing active incoming calls from any chat room first (enables global popups)
    if (incomingCallingRoom?.activeCall) {
      setIsSimulatedCallActive(true);
      setCallMode(incomingCallingRoom.activeCall.type || 'audio');
      setCallStatusMessage("PANGGILAN MASUK...");
      setSelectedRoom(incomingCallingRoom);
      setIsMobilePaneOpen(true);
      startRingTone();
      return;
    }

    // Process current chat room changes
    if (currentRoomDoc?.activeCall) {
      const { status, id, type, callerId } = currentRoomDoc.activeCall;

      if (status === 'hangup') {
        stopRingtone();
        if (activeCallInstance) {
          activeCallInstance.leave().catch(() => {});
          setActiveCallInstance(null);
        }
        setCallMode(null);
        setIsSimulatedCallActive(false);
      } else if (status === 'active') {
        stopRingtone();
        setIsSimulatedCallActive(true);
        setCallStatusMessage("TERHUBUNG");
        setCallMode(type);
      } else if (status === 'connecting') {
        // If caller, proceed with outbox ringing state
        if (callerId === currentUser.uid) {
          setIsSimulatedCallActive(true);
          setCallMode(type);
          setCallStatusMessage("MEMANGGIL...");
          startDialTone();
        }
      }
    } else {
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [incomingCallingRoom?.activeCall, currentRoomDoc?.activeCall, currentUser, activeCallInstance]);

  useEffect(() => {
    if (localVideoRef.current && localMediaStream) {
      localVideoRef.current.srcObject = localMediaStream;
    }
  }, [localMediaStream]);

  // Presence heartbeat for the current user
  useEffect(() => {
    if (!currentUser) return;

    const userPresenceRef = doc(db, 'presence', currentUser.uid);
    const updatePresence = async () => {
      try {
        await setDoc(userPresenceRef, {
          isOnline: true,
          status: 'online',
          lastActive: new Date().toISOString(),
          name: currentUser.displayName || 'Anggota Adiksi',
        }, { merge: true });
      } catch (e) {
        console.warn("Error updating presence heart: ", e);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 12000);

    return () => {
      clearInterval(interval);
      setDoc(userPresenceRef, {
        isOnline: false,
        status: 'offline',
        lastActive: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    };
  }, [currentUser]);

  // Listen to recipient presence in selected chat
  useEffect(() => {
    if (!currentUser || !selectedRoom) {
      setRecipientPresence(null);
      return;
    }

    const otherId = selectedRoom.participants.find(id => id !== currentUser.uid);
    if (!otherId) {
      setRecipientPresence(null);
      return;
    }

    const otherPresenceRef = doc(db, 'presence', otherId);
    const unsubscribe = onSnapshot(otherPresenceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const isOnline = (data.status === 'online' || data.isOnline) && (Date.now() - new Date(data.lastActive || 0).getTime() < 24000);
        setRecipientPresence({
          isOnline,
          status: isOnline ? 'online' : 'offline',
          lastActive: data.lastActive
        });
      } else {
        setRecipientPresence({ isOnline: false, status: 'offline' });
      }
    }, () => {
      setRecipientPresence({ isOnline: false, status: 'offline' });
    });

    return () => unsubscribe();
  }, [selectedRoom, currentUser]);

  // Listen to call logs history
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Sort in-memory safely to protect against missing composite indexes
      logs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setCallHistoryList(logs);
    }, (err) => {
      console.warn("Error listening to call logs history: ", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Seed call history if empty to show rich realistic log entries
  useEffect(() => {
    if (!currentUser || !selectedRoom) return;
    if (callHistoryList.length > 0) return;

    const seedPrepop = async () => {
      try {
        const q = query(collection(db, 'calls'), where('participants', 'array-contains', currentUser.uid));
        const s = await getDocs(q);
        if (s.empty) {
          const recipientTitle = getRecipientInfo(selectedRoom).title;
          const otherId = selectedRoom.participants.find(id => id !== currentUser.uid) || 'mock_user_id';
          
          await addDoc(collection(db, 'calls'), {
            type: 'video',
            participants: [currentUser.uid, otherId],
            callerId: otherId,
            callerName: recipientTitle,
            receiverName: currentUser.displayName || 'Anda',
            status: 'missed',
            duration: 0,
            timestamp: new Date(Date.now() - 4 * 3600000).toISOString()
          });

          await addDoc(collection(db, 'calls'), {
            type: 'audio',
            participants: [currentUser.uid, otherId],
            callerId: currentUser.uid,
            callerName: currentUser.displayName || 'Anda',
            receiverName: recipientTitle,
            status: 'completed',
            duration: 184, // 3 mins 4s
            timestamp: new Date(Date.now() - 24 * 3600000).toISOString()
          });
        }
      } catch (e) {
        console.warn("Gagal seeding riwayat panggilan:", e);
      }
    };
    seedPrepop();
  }, [currentUser, selectedRoom, callHistoryList.length]);

  // Call duration counter
  useEffect(() => {
    let timerInterval: any;
    if (callMode && (activeCallInstance || isSimulatedCallActive)) {
      setCallDuration(0);
      timerInterval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timerInterval);
  }, [callMode, activeCallInstance, isSimulatedCallActive]);

  const cleanupInternalCall = async () => {
    if (signalUnsubscribeRef.current) {
      signalUnsubscribeRef.current();
      signalUnsubscribeRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localMediaStream) {
      localMediaStream.getTracks().forEach((track) => track.stop());
      setLocalMediaStream(null);
    }

    if (signalDocRef.current) {
      try {
        await updateDoc(signalDocRef.current, { status: 'ended' });
      } catch (e) {
        console.warn('Gagal menandai sinyal panggilan selesai:', e);
      }
    }

    signalDocRef.current = null;
    callRoleRef.current = null;
    didCreateInternalOfferRef.current = false;
    pendingRemoteCandidatesRef.current = [];
    setHasRemoteCallStream(false);
    setCallError(null);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const ensureInternalMediaStream = async (type: 'audio' | 'video') => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });

    localStreamRef.current = stream;
    setLocalMediaStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const attachInternalCallHandlers = async (pc: RTCPeerConnection, signalRef: any, type: 'audio' | 'video', role: 'caller' | 'callee') => {
    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setHasRemoteCallStream(true);
      }
    };

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      const candidatePayload = {
        sender: role,
        candidate: event.candidate.toJSON()
      };
      try {
        await updateDoc(signalRef, {
          [role === 'caller' ? 'callerCandidates' : 'calleeCandidates']: arrayUnion(candidatePayload)
        });
      } catch (e) {
        console.warn('Gagal mengirim kandidat ICE internal:', e);
      }
    };

    if (typeof window !== 'undefined' && window.RTCPeerConnection) {
      const localStream = await ensureInternalMediaStream(type);
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      peerConnectionRef.current = pc;
      callRoleRef.current = role;
      signalDocRef.current = signalRef;
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !selectedRoom) {
      alert('Hubungan obrolan belum aktif atau Anda belum masuk.');
      return;
    }

    const safeChannelId = selectedRoom.id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30);
    const callId = `call_${safeChannelId}_${Date.now()}`;
    const otherId = selectedRoom.participants.find((id) => id !== currentUser.uid) || 'target';

    const roomRef = doc(db, 'chats', selectedRoom.id);
    await updateDoc(roomRef, {
      activeCall: {
        id: callId,
        type: type,
        callerId: currentUser.uid,
        callerName: currentUser.displayName || 'Anggota Adiksi',
        status: 'connecting'
      }
    });

    try {
      const otherName = getRecipientInfo(selectedRoom).title;
      await addDoc(collection(db, 'calls'), {
        id: callId,
        type: type,
        participants: [currentUser.uid, otherId],
        callerId: currentUser.uid,
        callerName: currentUser.displayName || 'Anda',
        receiverName: otherName,
        status: 'outgoing',
        duration: 0,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Gagal menambahkan log telepon:', e);
    }

    setCallStatusMessage('MEMANGGIL...');
    setCallMode(type);
    setIsSimulatedCallActive(true);
    startDialTone();
    setCallError(null);

    try {
      if (!window.RTCPeerConnection) {
        throw new Error('WebRTC tidak didukung di browser ini.');
      }

      const signalRef = doc(db, 'callSignals', callId);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });
      await attachInternalCallHandlers(pc, signalRef, type, 'caller');
      didCreateInternalOfferRef.current = true;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(signalRef, {
        roomId: selectedRoom.id,
        type,
        callerId: currentUser.uid,
        calleeId: otherId,
        status: 'connecting',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        callerCandidates: [],
        calleeCandidates: []
      }, { merge: true });

      signalUnsubscribeRef.current = onSnapshot(signalRef, async (snapshot) => {
        const data = snapshot.data() as any;
        if (!data) return;

        if (data.answer && pc.signalingState !== 'closed' && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          pendingRemoteCandidatesRef.current.forEach((candidate) => pc.addIceCandidate(candidate));
          pendingRemoteCandidatesRef.current = [];
          setCallStatusMessage('TERHUBUNG');
          setCallError(null);
        }

        const remoteCandidates = (data.calleeCandidates || []).filter((item: any) => item.sender !== 'caller');
        if (remoteCandidates.length > 0) {
          remoteCandidates.forEach((item: any) => {
            if (pc.remoteDescription) {
              pc.addIceCandidate(new RTCIceCandidate(item.candidate)).catch(() => {});
            } else {
              pendingRemoteCandidatesRef.current.push(new RTCIceCandidate(item.candidate));
            }
          });
        }
      });
    } catch (err: any) {
      console.warn('Gagal memulai panggilan internal:', err);
      setCallError('Browser tidak mengizinkan kamera/mikrofon atau WebRTC tidak tersedia.');
      setCallStatusMessage('TERHUBUNG (SIAP BICARA)');
    }
  };

  const handleAcceptCall = async (roomToUse?: ChatRoom) => {
    const targetRoom = roomToUse || selectedRoom;
    if (!targetRoom) return;

    let activeCallInfo = null;
    if (targetRoom.id === selectedRoom?.id && currentRoomDoc?.activeCall) {
      activeCallInfo = currentRoomDoc.activeCall;
    } else {
      activeCallInfo = targetRoom.activeCall;
    }

    if (!activeCallInfo) return;
    const { id, type } = activeCallInfo;

    if (targetRoom.id !== selectedRoom?.id) {
      setSelectedRoom(targetRoom);
      setIsMobilePaneOpen(true);
    }

    setCallMode(type);
    setCallStatusMessage('MENGHUBUNGKAN...');
    setIsSimulatedCallActive(true);
    startDialTone();
    setCallError(null);

    const roomRef = doc(db, 'chats', targetRoom.id);
    await updateDoc(roomRef, {
      'activeCall.status': 'active'
    });

    try {
      const q = query(collection(db, 'calls'), where('id', '==', id));
      const s = await getDocs(q);
      if (!s.empty) {
        await updateDoc(doc(db, 'calls', s.docs[0].id), {
          status: 'answered'
        });
      }
    } catch (e) {
      console.warn('Gagal update status log ke terjawab:', e);
    }

    try {
      if (!window.RTCPeerConnection) {
        throw new Error('WebRTC tidak didukung di browser ini.');
      }

      const signalRef = doc(db, 'callSignals', id);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });
      await attachInternalCallHandlers(pc, signalRef, type, 'callee');

      signalUnsubscribeRef.current = onSnapshot(signalRef, async (snapshot) => {
        const data = snapshot.data() as any;
        if (!data) return;

        if (data.offer && !didCreateInternalOfferRef.current && pc.signalingState !== 'closed' && !pc.remoteDescription) {
          didCreateInternalOfferRef.current = true;
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateDoc(signalRef, {
            answer: {
              type: answer.type,
              sdp: answer.sdp
            },
            status: 'active'
          });
          setCallStatusMessage('TERHUBUNG');
          setCallError(null);
        }

        const remoteCandidates = (data.callerCandidates || []).filter((item: any) => item.sender !== 'callee');
        if (remoteCandidates.length > 0) {
          remoteCandidates.forEach((item: any) => {
            if (pc.remoteDescription) {
              pc.addIceCandidate(new RTCIceCandidate(item.candidate)).catch(() => {});
            } else {
              pendingRemoteCandidatesRef.current.push(new RTCIceCandidate(item.candidate));
            }
          });
        }
      });
    } catch (err: any) {
      console.warn('Gagal menerima panggilan internal:', err);
      setCallError('Browser tidak mengizinkan kamera/mikrofon atau WebRTC tidak tersedia.');
      setCallStatusMessage('TERHUBUNG (SIAP BICARA)');
    }
  };

  const handleDeclineCall = async (roomToUse?: ChatRoom) => {
    const targetRoom = roomToUse || selectedRoom;
    if (!targetRoom) return;

    const roomRef = doc(db, 'chats', targetRoom.id);
    await updateDoc(roomRef, {
      'activeCall.status': 'hangup'
    });

    let activeCallId = null;
    if (targetRoom.id === selectedRoom?.id && currentRoomDoc?.activeCall?.id) {
      activeCallId = currentRoomDoc.activeCall.id;
    } else {
      activeCallId = targetRoom.activeCall?.id;
    }

    // Log missed call
    try {
      if (activeCallId) {
        const q = query(
          collection(db, 'calls'),
          where('id', '==', activeCallId)
        );
        const s = await getDocs(q);
        if (!s.empty) {
          await updateDoc(doc(db, 'calls', s.docs[0].id), {
            status: 'missed'
          });
        }
      }
    } catch (e) {
      console.warn("Gagal update status log to missed:", e);
    }
  };

  const handleHangupCall = async () => {
    const finalDuration = callDuration;

    await cleanupInternalCall();

    if (activeCallInstance) {
      try {
        await activeCallInstance.leave();
      } catch (e) {
        console.warn(e);
      }
      setActiveCallInstance(null);
    }
    setCallMode(null);
    setIsSimulatedCallActive(false);

    // Save logs duration
    try {
      if (currentRoomDoc?.activeCall?.id) {
        const q = query(
          collection(db, 'calls'),
          where('id', '==', currentRoomDoc.activeCall.id)
        );
        const s = await getDocs(q);
        if (!s.empty) {
          await updateDoc(doc(db, 'calls', s.docs[0].id), {
            status: finalDuration > 0 ? 'completed' : 'missed',
            duration: finalDuration
          });
        }
      }
    } catch (e) {
      console.warn("Gagal menyimpan ringkasan log waktu:", e);
    }

    if (selectedRoom) {
      const roomRef = doc(db, 'chats', selectedRoom.id);
      await updateDoc(roomRef, {
        activeCall: {
          id: '',
          type: 'audio',
          callerId: '',
          callerName: '',
          status: 'hangup'
        }
      });
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!currentUser || !selectedRoom) return;

    // Send typing status to subcollection
    const typingRef = doc(db, 'chats', selectedRoom.id, 'typing', currentUser.uid);
    setDoc(typingRef, {
      isTyping: text.length > 0,
      name: currentUser.displayName || 'Anggota Adiksi',
      lastActive: new Date().toISOString()
    }, { merge: true }).catch(err => console.warn("Error setting typing status:", err));

    // Also update typing status on parent chat document for absolute coverage
    const roomRef = doc(db, 'chats', selectedRoom.id);
    updateDoc(roomRef, {
      [`isTyping.${currentUser.uid}`]: text.length > 0
    }).catch(() => {});

    // Clear previous timeout for this room
    if (typingTimeoutRef.current[selectedRoom.id]) {
      clearTimeout(typingTimeoutRef.current[selectedRoom.id]);
    }

    // Set a timeout to set typing to false after 3 seconds
    typingTimeoutRef.current[selectedRoom.id] = setTimeout(() => {
      setDoc(typingRef, {
        isTyping: false,
        lastActive: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn("Error resetting typing status:", err));

      const parentRef = doc(db, 'chats', selectedRoom.id);
      updateDoc(parentRef, {
        [`isTyping.${currentUser.uid}`]: false
      }).catch(() => {});
    }, 3000);
  };

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

  // Listen to messages of the running selected chat room and reset unread counts
  useEffect(() => {
    if (!selectedRoom || !currentUser) {
      setMessages([]);
      return;
    }

    const markAsRead = async () => {
      try {
        const roomRef = doc(db, 'chats', selectedRoom.id);
        await updateDoc(roomRef, {
          [`readBy.${currentUser.uid}`]: true
        });
        localStorage.setItem(`lastSeen_chat_${selectedRoom.id}`, new Date().toISOString());
        localStorage.setItem('lastSeen_chat', new Date().toISOString());
      } catch (err) {
        console.warn("Gagal menandai kamar sebagai terbaca:", err);
      }
    };
    markAsRead();

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
      
      // Update local storage seen timestamp because we are actively looking at the room
      localStorage.setItem(`lastSeen_chat_${selectedRoom.id}`, new Date().toISOString());
      localStorage.setItem('lastSeen_chat', new Date().toISOString());
    }, (error) => {
      console.error("Error listening messages:", error);
    });

    return () => unsubscribe();
  }, [selectedRoom, currentUser]);

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

      // Find recipient to set unread status
      const otherId = selectedRoom.participants.find((id) => id !== currentUser.uid);
      const readByUpdate: any = {
        lastMessage: docText,
        lastMessageTime: new Date().toISOString(),
        lastMessageSenderId: currentUser.uid,
        [`readBy.${currentUser.uid}`]: true
      };
      if (otherId) {
        readByUpdate[`readBy.${otherId}`] = false;
      }

      // Update room metadata for sidebar sorting and unread badge marking
      const roomRef = doc(db, 'chats', selectedRoom.id);
      await updateDoc(roomRef, readByUpdate);

      // Reset typing status immediately
      const typingRef = doc(db, 'chats', selectedRoom.id, 'typing', currentUser.uid);
      await setDoc(typingRef, { isTyping: false, lastActive: new Date().toISOString() }, { merge: true }).catch(() => {});
      
      const parentRef = doc(db, 'chats', selectedRoom.id);
      await updateDoc(parentRef, {
        [`isTyping.${currentUser.uid}`]: false
      }).catch(() => {});

      if (typingTimeoutRef.current[selectedRoom.id]) {
        clearTimeout(typingTimeoutRef.current[selectedRoom.id]);
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    }
  };

  // Submit quick reply tape
  const handleQuickReplyClick = async (replyText: string) => {
    if (!currentUser || !selectedRoom) return;

    const messagePayload: any = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Anggota Adiksi',
      senderAvatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
      text: replyText,
      timestamp: new Date().toISOString(),
      isSystem: false
    };

    try {
      const messagesColRef = collection(db, 'chats', selectedRoom.id, 'messages');
      await addDoc(messagesColRef, messagePayload);

      const otherId = selectedRoom.participants.find((id) => id !== currentUser.uid);
      const readByUpdate: any = {
        lastMessage: replyText,
        lastMessageTime: new Date().toISOString(),
        lastMessageSenderId: currentUser.uid,
        [`readBy.${currentUser.uid}`]: true
      };
      if (otherId) {
        readByUpdate[`readBy.${otherId}`] = false;
      }

      const roomRef = doc(db, 'chats', selectedRoom.id);
      await updateDoc(roomRef, readByUpdate);
    } catch (err) {
      console.error("Gagal mengirim quick reply:", err);
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
    <div className="w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-0 md:py-3 pb-0 md:pb-6 font-sans">
      {!currentUser ? (
        <div className="py-20 text-center max-w-md mx-auto space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-brand-gold/15 rounded-full flex items-center justify-center mx-auto border border-brand-gold/25 text-brand-gold animate-bounce">
              <MessageCircle className="w-10 h-10" />
            </div>
            <div className="absolute top-0 right-1/3 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
          </div>
          <div className="space-y-2">
            <h3 className="font-sans text-2xl font-black text-brand-green">Hubungan Komunitas Instan</h3>
            <p className="text-gray-650 text-xs sm:text-sm leading-relaxed">
              Masuk atau daftar dengan aman untuk membuka akses ke sistem obrolan real-time Adiksi Messenger. Mengobrol dengan kreator, koordinasi proyek kolaborasi, donasi, dan negosiasi karya orisinal secara privat.
            </p>
          </div>
          <button
            onClick={openAuthModal}
            className="px-6 py-2.5 bg-brand-accent hover:bg-brand-green text-white font-bold rounded-full text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
          >
            Masuk / Hubungi Seniman
          </button>
        </div>
      ) : (
        <div id="adiksi-messenger-frame" className="bg-white rounded-none md:rounded-3xl border-b md:border border-gray-150 overflow-hidden h-[calc(100vh-130px)] md:h-[calc(100vh-190px)] min-h-[500px] flex shadow-sm relative text-gray-900">
          
          {/* SIDEBAR: List Chat rooms (Visible on Desktop always, on Mobile only when no chat is focused) */}
          <div className={`w-full md:w-[320px] lg:w-[360px] border-r border-gray-150 flex-col shrink-0 bg-white ${isMobilePaneOpen ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-150 space-y-4 bg-gray-50/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <h3 className="font-sans text-lg font-black text-brand-green tracking-tight flex items-center gap-1.5">
                    Adiksi Chat <span className="font-mono text-[9px] uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded border border-brand-accent/15">Beta</span>
                  </h3>
                </div>
                
                {/* Plus button to initiate direct chat manually */}
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="p-1.5 bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white rounded-xl transition cursor-pointer select-none animate-pulse"
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
                  className="w-full bg-white border border-gray-200 rounded-full py-2 pl-9 pr-4 text-xs text-gray-950 focus:outline-none focus:border-brand-accent placeholder-gray-400 font-sans"
                />
              </div>

              {/* Sidebar Tabs switcher (WhatsApp style) */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setIsCallHistoryOpen(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-sans text-center transition cursor-pointer ${
                    !isCallHistoryOpen
                      ? 'bg-white text-brand-green shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sembang Obrolan
                </button>
                <button
                  onClick={() => setIsCallHistoryOpen(true)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-sans text-center transition cursor-pointer ${
                    isCallHistoryOpen
                      ? 'bg-white text-brand-green shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Riwayat Telpon ({callHistoryList.length})
                </button>
              </div>
            </div>

            {/* Chats / Call Records List Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5 bg-white">
              {isCallHistoryOpen ? (
                /* CALL HISTORY VIEW PANEL */
                callHistoryList.length > 0 ? (
                  callHistoryList.map((log) => {
                    const isIncoming = log.callerId !== currentUser.uid;
                    const isMissed = log.status === 'missed';
                    
                    let statusLabel = 'Keluar';
                    let statusColor = 'text-blue-600 bg-blue-50/70 border-blue-150';
                    let dotColor = 'bg-blue-500';

                    if (isMissed) {
                      statusLabel = 'Terlewatkan';
                      statusColor = 'text-rose-600 bg-rose-50/70 border-rose-150';
                      dotColor = 'bg-rose-500';
                    } else if (isIncoming) {
                      statusLabel = 'Terjawab';
                      statusColor = 'text-emerald-600 bg-emerald-50/70 border-emerald-150';
                      dotColor = 'bg-emerald-500';
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-gray-50/60 hover:bg-brand-accent/5 hover:border-brand-accent/15 border border-gray-150 rounded-2xl flex items-center justify-between gap-3 text-left font-sans transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-white rounded-xl border border-gray-200 shrink-0 flex items-center justify-center shadow-sm">
                            {log.type === 'video' ? <Video className="w-4 h-4 text-brand-accent" /> : <Phone className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-black text-gray-950 truncate">
                              {isIncoming ? log.callerName : log.receiverName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold border ${statusColor}`}>
                                <span className={`w-1 h-1 rounded-full ${dotColor} inline-block`} />
                                {statusLabel}
                              </span>
                              <span className="text-gray-300 text-[9px]">•</span>
                              <span className="font-mono text-[8px] text-gray-500 font-semibold">
                                {log.duration > 0 ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : '0s'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-400 font-mono self-start mt-1 shrink-0">
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 space-y-2 opacity-80">
                    <Phone className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="text-xs text-gray-400 font-extrabold font-sans">Riwayat Kosong</p>
                    <p className="text-[10px] text-gray-500 px-4 leading-relaxed">
                      Belum ada log rekaman kontak telepon sebelumnya. Telepon dan video call seniman untuk memulai.
                    </p>
                  </div>
                )
              ) : (
                /* STANDARD CONVERSATIONS LIST PANEL */
                filteredRooms.length > 0 ? (
                  filteredRooms.map((room) => {
                    const info = getRecipientInfo(room);
                    const isFocused = selectedRoom?.id === room.id;
                    const isSentByMe = room.lastMessageSenderId === currentUser.uid;
                    
                    const localSeenKey = `lastSeen_chat_${room.id}`;
                    const localSeenRaw = localStorage.getItem(localSeenKey);
                    const localSeenTime = localSeenRaw ? new Date(localSeenRaw).getTime() : 0;
                    
                    const roomMsgTime = room.lastMessageTime 
                      ? (room.lastMessageTime.seconds 
                          ? room.lastMessageTime.seconds * 1000 
                          : new Date(room.lastMessageTime).getTime())
                      : 0;

                    const isUnreadByTimestamp = !isSentByMe && roomMsgTime > localSeenTime;
                    const isUnread = (!isSentByMe && (room as any).readBy?.[currentUser.uid] === false) || isUnreadByTimestamp;

                    return (
                      <div
                        key={room.id}
                        onClick={() => {
                          setSelectedRoom(room);
                          setIsMobilePaneOpen(true);
                        }}
                        className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border group ${
                          isFocused
                            ? 'bg-brand-accent/15 border-brand-accent/25'
                            : 'bg-transparent border-transparent hover:bg-gray-50'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={info.avatar}
                            alt={info.title}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-gray-200 bg-gray-100"
                          />
                          {room.type === 'group' ? (
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full text-white font-black">
                              <Users className="w-2.5 h-2.5" />
                            </div>
                          ) : (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1 text-left">
                          <div className="flex justify-between items-baseline">
                            <h4 className={`text-xs font-bold truncate font-sans ${isUnread ? 'text-brand-accent font-black' : isFocused ? 'text-brand-green' : 'text-gray-900 group-hover:text-brand-accent transition-colors'}`}>
                              {info.title}
                            </h4>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-[9px] font-mono ${isUnread ? 'text-brand-accent font-bold animate-pulse' : 'text-gray-400'} whitespace-nowrap pl-1`}>
                                {formatTime(room.lastMessageTime)}
                              </span>
                              {isUnread && (
                                <span className="bg-brand-accent text-white text-[8px] font-sans px-1.5 py-0.5 rounded-full font-black animate-pulse whitespace-nowrap">
                                  Baru
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`text-[11px] truncate font-sans flex items-center gap-1 ${isUnread ? 'text-gray-950 font-semibold' : 'text-gray-550'}`}>
                            {isSentByMe && <CheckCheck className="w-3.5 h-3.5 text-brand-accent shrink-0" />}
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
                )
              )}
            </div>

            {/* GetStream SDK Diagnostic UI Module (Discreet sidebar footer) */}
            <div className="p-3 bg-gray-50 border-t border-gray-150 text-[10.5px]">
              <div 
                onClick={() => setIsDiagnosticOpen(prev => !prev)}
                className="flex items-center justify-between font-extrabold text-gray-700 cursor-pointer hover:text-gray-950 transition-colors"
                title="Klik untuk info diagnosa WebRTC"
              >
                <span className="flex items-center gap-1.5 font-sans uppercase tracking-wider text-[9px] text-gray-605">
                  <Activity className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                  Koneksi Telepon Live
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px]">
                  <span className={`w-2 h-2 rounded-full ${
                    streamClient && streamWsState === 'connected' ? 'bg-emerald-500 shadow-sm animate-pulse' : 'bg-amber-505 shadow-sm animate-ping'
                  }`} />
                  <span>
                    {streamClient ? (streamWsState === 'connected' ? 'Terhubung' : 'Koneksi...') : 'Terputus'}
                  </span>
                </span>
              </div>
              
              {isDiagnosticOpen && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-200 text-[10px] space-y-1.5 text-left animate-fadeIn">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Otorisasi Akun:</span>
                    <span className={`font-semibold ${streamClient && currentUser && streamClient.userId === currentUser.uid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {streamClient && currentUser && streamClient.userId === currentUser.uid ? 'Sukses' : 'Gagal'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Panggilan Siap:</span>
                    <span className={`font-semibold ${streamClient && streamWsState === 'connected' && currentUser && streamClient.userId === currentUser.uid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {streamClient && streamWsState === 'connected' && currentUser && streamClient.userId === currentUser.uid ? 'Siap' : 'Belum Siap'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frame Sandbox:</span>
                    <span className={`font-semibold ${isInsideIframe ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isInsideIframe ? 'Muted (Sandbox)' : 'Dukungan Penuh'}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-450 mt-1 leading-relaxed">
                    * Dalam mode sandbox iFrame, WebRTC diredam otomatis untuk keamanan. Silakan buka aplikasi di tab baru untuk koneksi panggilan suara & video live!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CHAT WINDOW: Conversations viewport (Visible on desktop always, on mobile toggled based on isMobilePaneOpen) */}
          <div className={`flex-1 flex flex-col bg-gray-50/50 overflow-hidden ${!isMobilePaneOpen ? 'hidden md:flex' : 'flex'}`}>
            {selectedRoom ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-gray-150 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Back Button for mobile */}
                    <button
                      onClick={() => setIsMobilePaneOpen(false)}
                      className="p-1.5 bg-gray-100 text-gray-600 hover:text-gray-950 rounded-lg md:hidden cursor-pointer mr-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <img
                      src={getRecipientInfo(selectedRoom).avatar}
                      alt={getRecipientInfo(selectedRoom).title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-gray-50"
                    />

                    <div>
                      <h4 className="text-sm font-black text-brand-green hover:underline transition-all">
                        {getRecipientInfo(selectedRoom).title}
                      </h4>
                      {typingUsers.length > 0 ? (
                        <p className="text-[10px] text-brand-accent font-sans flex items-center gap-1 font-extrabold animate-pulse">
                          <span>✍️ Sedang mengetik...</span>
                        </p>
                      ) : (
                        <p className={`text-[10px] font-sans flex items-center gap-1 font-semibold ${recipientPresence?.isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${recipientPresence?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                          <span>
                            {selectedRoom.type === 'group'
                              ? 'Grup Kolaboratif'
                              : recipientPresence?.isOnline
                              ? 'Online'
                              : 'Offline'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Top-Right details */}
                  <div className="flex items-center gap-3 relative">
                    {/* Voice/Video Call Buttons */}
                    <div id="calling-operations" className="flex items-center gap-1.5 bg-gray-50 border border-gray-150 rounded-2xl p-1 shadow-inner shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartCall('audio')}
                        className="py-1 px-2 hover:bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 rounded-xl transition duration-200 cursor-pointer active:scale-95 flex items-center gap-1 text-[10px] font-extrabold font-sans"
                        title="Voice Call"
                      >
                        <Phone className="w-3 h-3" />
                        <span className="hidden sm:inline whitespace-nowrap">Voice Call</span>
                      </button>
                      <div className="w-[1px] h-4 bg-gray-200" />
                      <button
                        type="button"
                        onClick={() => handleStartCall('video')}
                        className="py-1 px-2 hover:bg-brand-accent/10 text-brand-accent hover:text-brand-accent/90 rounded-xl transition duration-200 cursor-pointer active:scale-95 flex items-center gap-1 text-[10px] font-extrabold font-sans"
                        title="Video Call"
                      >
                        <Video className="w-3 h-3" />
                        <span className="hidden sm:inline whitespace-nowrap">Video Call</span>
                      </button>
                    </div>

                    {selectedRoom.associatedPostId && (
                      <span className="text-[9px] font-sans font-bold bg-brand-accent/10 text-brand-accent border border-brand-accent/25 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm shrink-0" title="Diskusi terkait proyek kolaborasi aktif">
                        <Sparkles className="w-3 h-3 text-brand-accent" /> PROYEK AKTIF
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/20">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => {
                      const isMe = msg.senderId === currentUser.uid;

                      // Check if it is a system announcement
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id || index} className="flex justify-center py-2 animate-fadeIn">
                            <span className="px-4 py-1.5 bg-brand-accent/10 border border-brand-accent/15 text-brand-accent text-[10px] font-sans font-semibold rounded-full flex items-center gap-1.5 shadow-sm">
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
                              className="w-7 h-7 rounded-full object-cover border border-gray-200 mb-1 shrink-0"
                            />
                          )}

                          <div className="space-y-0.5 max-w-[70%]">
                            {/* In Group chats: display sender's name if not Me */}
                            {selectedRoom.type === 'group' && !isMe && (
                              <span className="text-[9px] font-bold text-brand-green font-sans block px-2">
                                {msg.senderName}
                              </span>
                            )}

                            {msg.imageUrl ? (
                              /* LUXURY PRESS IMAGE BUBBLE */
                              <div
                                className={`overflow-hidden rounded-2xl shadow-sm transition-all duration-300 border select-none group max-w-xs sm:max-w-sm md:max-w-md ${
                                  isMe
                                    ? 'bg-[#EAF5F0] border-brand-accent/20 rounded-br-none'
                                    : 'bg-[#F9FAF9] border-gray-200 rounded-bl-none'
                                }`}
                              >
                                <div 
                                  onClick={() => setLightboxUrl(msg.imageUrl || null)}
                                  className="relative overflow-hidden cursor-pointer"
                                >
                                  {/* Golden Reflection Sheet */}
                                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent z-10" />
                                  <img
                                    src={msg.imageUrl}
                                    alt="Shared Masterpiece"
                                    className="max-h-64 sm:max-h-80 w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5 transition-opacity" />
                                  
                                  {/* "Zoom" trigger button on image hover */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[1.5px]">
                                    <span className="p-2.5 bg-brand-accent text-white rounded-full shadow-md transform scale-90 group-hover:scale-100 transition-all duration-300 flex items-center gap-1.5 text-[9px] font-sans font-black uppercase tracking-wider">
                                      <Maximize2 className="w-3.5 h-3.5 stroke-[3px]" /> PERBESAR KARYA
                                    </span>
                                  </div>
                                  
                                  {/* Golden Sparkle badge */}
                                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-brand-green/90 border border-brand-accent/25 rounded text-[8px] font-sans font-black tracking-widest text-white uppercase backdrop-blur-sm z-10 flex items-center gap-1 scale-90">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" /> KARYA
                                  </span>
                                </div>

                                {/* Text & Meta Section for Image */}
                                <div className="p-3 bg-white border-t border-gray-150">
                                  {msg.text && (
                                    <p className="text-[12px] font-sans text-gray-800 mb-2 leading-relaxed whitespace-pre-wrap font-medium">
                                      {msg.text}
                                    </p>
                                  )}
                                  <div className="flex justify-between items-center gap-3">
                                    <span className="text-[8px] font-sans text-brand-accent/70 uppercase tracking-widest font-black">
                                      Koneksi Adiksi
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-sans text-gray-500">
                                        {formatTime(msg.timestamp)}
                                      </span>
                                      {isMe && (
                                        <CheckCheck className="w-3.5 h-3.5 text-brand-accent" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* LUXURY STANDALONE TEXT BUBBLE */
                              <div
                                className={`p-3 rounded-2xl text-[12px] font-sans leading-relaxed shadow-sm whitespace-pre-wrap transition-all duration-300 ${
                                  isMe
                                    ? 'bg-brand-accent text-white font-semibold rounded-br-none hover:bg-brand-green shadow-sm'
                                    : 'bg-white text-gray-800 border border-gray-150 rounded-bl-none hover:bg-gray-50/55'
                                }`}
                              >
                                <p>{msg.text}</p>
                                
                                <div className="flex justify-end items-center gap-1 mt-1.5 opacity-80">
                                  <span className={`text-[9px] font-sans ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {isMe && (
                                    <CheckCheck className={`w-3.5 h-3.5 ${isMe ? 'text-white/95' : 'text-gray-400'}`} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-2 opacity-80 py-16">
                      <MessageCircle className="w-8 h-8 text-brand-accent" />
                      <p className="text-sm font-extrabold text-brand-green">Tidak Ada Pesan</p>
                      <p className="text-[10px] text-gray-500">Kirim teks perkenalan atau pertanyaan pertama untuk memulai dialog hangat!</p>
                    </div>
                  )}
                  {/* Real-time Typing Indicator Status */}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2.5 px-4 py-2 text-gray-600 text-[11px] font-sans animate-fadeIn">
                      <div className="bg-[#E2F7F0] border border-[#C6ECD2] ml-11 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 max-w-[280px]">
                        <span className="font-bold text-brand-green truncate max-w-[120px]">
                          {typingUsers.map(user => user.name.split(' ')[0]).join(', ')}
                        </span>
                        <span className="text-gray-500 font-normal">sedang mengetik</span>
                        <div className="flex gap-1 items-center shrink-0 ml-1">
                          <span className="w-1 h-1 bg-brand-green rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1 h-1 bg-brand-green rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1 h-1 bg-brand-green rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
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
                      className="px-4 py-3 bg-[#F1F8F6] border-t border-brand-accent/20 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                          <img src={photoUrl} alt="Upload preview thumbnail" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-[10px] font-sans font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-accent animate-pulse" /> Karya Siap Dikirim
                          </p>
                          <p className="text-[9px] text-gray-500 font-sans truncate max-w-[200px] sm:max-w-xs">{photoUrl}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="p-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-gray-200 text-gray-500 rounded-lg transition cursor-pointer"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Real-time Quick Replies pills shortcuts row */}
                <div className="px-4 py-2 bg-white/90 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none">
                  <span className="text-[9px] font-sans text-gray-400 font-extrabold uppercase shrink-0 mr-1">Pesan Cepat:</span>
                  {[
                    "Halo seniman! 👋",
                    "Karya ini sangat memukau! ✨",
                    "Apakah karya ini masih ready?",
                    "Setuju dengan kesepakatan kolaborasi 👍",
                    "Boleh nego tipis? 🤝",
                    "Terima kasih banyak atas infonya!"
                  ].map((reply, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleQuickReplyClick(reply)}
                      className="px-3 py-1 bg-gray-50 hover:bg-brand-accent hover:text-white border border-gray-200 hover:border-brand-accent text-[10px] font-sans font-semibold rounded-full transition cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                {/* Submit Input bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-gray-150 bg-white flex items-center gap-3 relative"
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
                      className={`p-2.5 bg-gray-100 hover:bg-brand-accent/10 border border-gray-200 hover:border-brand-accent/20 text-gray-500 hover:text-brand-accent rounded-xl transition-all cursor-pointer relative flex items-center justify-center active:scale-95 ${isUploadingPhoto ? 'animate-pulse' : ''}`}
                      title="Kirim Gambar Mahakarya"
                    >
                      {isUploadingPhoto ? (
                        <Loader className="w-4 h-4 animate-spin text-brand-accent" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </label>
                  </div>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={isUploadingPhoto ? "Sedang memproses foto..." : "Ketik pesan apresiasi, diskusi, atau kolaborasi Anda..."}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl py-2.5 px-4 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-accent font-sans"
                    maxLength={1000}
                    disabled={isUploadingPhoto}
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !photoUrl) || isUploadingPhoto}
                    className="p-2.5 bg-brand-accent hover:bg-brand-green text-white disabled:opacity-40 rounded-xl transition cursor-pointer shrink-0 scroll-smooth active:scale-95 flex items-center justify-center"
                    title="Kirim pesan"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                  {/* Clean placeholder alignment */}
                  <div className="hidden" />

                {/* ACTIVE CALL VIEWPORT OVERLAY (HYBRID: STANDARD STEAM + FAIL-SAFE SIMULATOR with WhatsApp theme) */}
                {callMode && (
                  <div 
                    className="fixed inset-x-3 bottom-4 top-4 md:absolute md:inset-auto md:right-6 md:bottom-6 md:w-[380px] md:h-[530px] bg-[#0b141a]/95 backdrop-blur-md z-[75] flex flex-col justify-between overflow-hidden animate-fadeIn text-white rounded-3xl border border-white/10 shadow-2xl ring-1 ring-black/40"
                    style={{
                      paddingTop: 'calc(env(safe-area-inset-top, 0.5rem) + 1rem)',
                      paddingBottom: 'calc(env(safe-area-inset-bottom, 0.5rem) + 1rem)',
                      paddingLeft: '1.25rem',
                      paddingRight: '1.25rem'
                    }}
                  >
                    {/* Elegant WhatsApp-like Top Encryption Bar */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 uppercase tracking-widest font-sans font-extrabold select-none">
                        <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WhatsApp Call • E2EE</span>
                      </div>
                      
                      {/* Dynamic status badge / Timer */}
                      <div className="flex items-center gap-1.5">
                        {typeof window !== 'undefined' && window.self !== window.top && (
                          <span className="text-[7.5px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Sandbox
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tracking-wider">
                          {Math.floor(callDuration / 60)}:{(callDuration % 60) < 10 ? '0' : ''}{callDuration % 60}
                        </span>
                      </div>
                    </div>

                    {/* Active call body viewport (Audio vs Video) */}
                    <div className="flex-1 flex flex-col items-center justify-center relative py-3">
                      {callMode === 'video' ? (
                        /* VIDEO CALL VIEWPORT */
                        <div className="w-full h-full max-h-[380px] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative flex items-center justify-center group select-none">
                          
                          {/* REMOTE STREAM OR SIMULATION VIEW */}
                          {hasRemoteCallStream ? (
                            <div className="w-full h-full relative">
                              <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                            </div>
                          ) : (
                            /* SIMULATION / FAILSAFE: Remote participant image */
                            <div className="w-full h-full relative">
                              <img
                                src={getRecipientInfo(selectedRoom).avatar}
                                alt="Remote feed mock"
                                className="w-full h-full object-cover opacity-90 transition duration-500 group-hover:scale-102"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                            </div>
                          )}

                          {/* Floating user local picture-in-picture (PiP) feed */}
                          <div className="absolute top-3 right-3 w-20 h-28 bg-slate-950 border border-white/20 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center transition-all duration-300 z-10">
                            {simIsCamOff ? (
                              <div className="flex flex-col items-center gap-1 p-2 text-center">
                                <VideoOff className="w-4 h-4 text-gray-500 animate-pulse" />
                                <span className="text-[7px] text-gray-500 uppercase tracking-widest font-sans font-bold">Cam Off</span>
                              </div>
                            ) : (
                              <div className="w-full h-full relative">
                                <video
                                  ref={localVideoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover scale-x-[-1]"
                                />
                                <div className="absolute bottom-1 left-1 bg-emerald-500/90 text-white text-[7px] px-1.5 py-0.5 rounded font-extrabold font-sans tracking-wide uppercase">
                                  Anda
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Float Name/Status banner at bottom of video card */}
                          <div className="absolute bottom-3 left-3 text-left pointer-events-none drop-shadow-md">
                            <p className="text-xs font-bold font-sans text-white flex items-center gap-1">
                              {getRecipientInfo(selectedRoom).title}
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            </p>
                            <p className="text-[9px] text-gray-300 font-sans tracking-wide">
                              {callStatusMessage}
                            </p>
                            {callError && (
                              <p className="text-[9px] text-rose-300 font-sans tracking-wide mt-1">
                                {callError}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* AUDIO CALL VIEWPORT */
                        <div className="text-center space-y-4 select-none">
                          <div className="relative mx-auto w-24 h-24">
                            {/* Double glowing waves */}
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping border border-emerald-500/40 [animation-duration:2.5s]" />
                            <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse [animation-duration:2s]" />
                            <img
                              src={getRecipientInfo(selectedRoom).avatar}
                              alt="Active Voice Call recipient"
                              className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/50 shadow-2xl relative z-10"
                            />
                          </div>
                          
                          <div className="space-y-0.5">
                            <h4 className="text-lg font-bold font-sans text-white">{getRecipientInfo(selectedRoom).title}</h4>
                            <p className="text-[9px] text-emerald-400 font-semibold uppercase tracking-widest font-sans flex items-center justify-center gap-1.5">
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                              {callStatusMessage}
                            </p>
                            {callError && (
                              <p className="text-[9px] text-rose-300 font-sans mt-1">
                                {callError}
                              </p>
                            )}
                          </div>

                          {/* Moving voice equalizer bar */}
                          {!simIsMuted ? (
                            <div className="flex justify-center gap-0.5 h-6 items-end py-1">
                              {[1, 2, 3, 4, 3, 2, 4, 1, 3, 2, 4, 2].map((val, idx) => (
                                <span
                                  key={idx}
                                  className="w-[3px] bg-emerald-400 rounded-full animate-pulse"
                                  style={{
                                    height: `${val * 4}px`,
                                    animationDuration: `${450 + (idx % 4) * 120}ms`
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-[9px] text-rose-400 font-sans italic flex items-center justify-center gap-1 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 w-fit mx-auto">
                              <MicOff className="w-2.5 h-2.5" /> Mikrofon dibisukan
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Controls Docking Bar (WhatsApp Style Dark horizontal glass bar) */}
                    <div className="flex justify-center items-center pt-2 pb-1">
                      {incomingCallPending ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleAcceptCall(incomingCallingRoom || selectedRoom || undefined)}
                            className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-sans font-black text-[11px] shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                          >
                            Terima
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineCall(incomingCallingRoom || selectedRoom || undefined)}
                            className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-sans font-black text-[11px] shadow-lg shadow-rose-600/25 transition cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <div className="bg-[#233138]/95 border border-white/10 ring-1 ring-black/50 backdrop-blur rounded-full px-5 py-2.5 flex items-center gap-4 shadow-2xl">
                          {/* Camera Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeCallInstance) {
                                activeCallInstance.camera.toggle();
                              }
                              setSimIsCamOff(prev => !prev);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer select-none active:scale-95 shadow ${
                              simIsCamOff 
                                ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50 hover:bg-rose-600/40' 
                                : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
                            }`}
                            title="Nyalakan/Matikan Kamera"
                          >
                            {simIsCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                          </button>

                          {/* Mic/Mute Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeCallInstance) {
                                activeCallInstance.microphone.toggle();
                              }
                              setSimIsMuted(prev => !prev);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer select-none active:scale-95 shadow ${
                              simIsMuted 
                                ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50 hover:bg-rose-600/40' 
                                : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
                            }`}
                            title="Nyalakan/Matikan Suara"
                          >
                            {simIsMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>

                          {/* Classic solid crimson Red Hangup Button */}
                          <button
                            type="button"
                            onClick={handleHangupCall}
                            className="w-12 h-12 bg-red-650 hover:bg-red-550 text-white rounded-full flex items-center justify-center transition cursor-pointer select-none shadow-lg shadow-red-650/40 active:scale-95 duration-200"
                            title="Akhiri Panggilan"
                          >
                            <Phone className="w-5 h-5 rotate-[135deg]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Empty selection screen
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4 bg-white">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl border border-gray-200 flex items-center justify-center text-brand-accent/40 shadow-inner">
                  <MessageSquare className="w-8 h-8 text-brand-accent animate-pulse" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="text-sm font-extrabold text-brand-green uppercase tracking-wider">Silakan Pilih Percakapan</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 p-6 rounded-3xl w-full max-w-md space-y-4 shadow-xl text-gray-950"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-150">
                <h3 className="font-sans text-lg font-extrabold flex items-center gap-2 text-brand-green">
                  <Briefcase className="w-5 h-5 text-brand-accent" /> Hubungi Kreator Lokal
                </h3>
                <button
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-gray-500 font-sans">
                Pilih salah satu kreator berbakat Pelabuhan Ratu di bawah ini untuk memulai obrolan langsung secara pribadi:
              </p>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {creatorsList.length > 0 ? (
                  creatorsList.map((creator) => (
                    <div
                      key={creator.id}
                      onClick={() => handleInitiateChatWithCreator(creator)}
                      className="p-3 bg-white hover:bg-brand-accent/5 hover:border-brand-accent/30 border border-gray-200 rounded-2xl flex items-center gap-3 transition cursor-pointer"
                    >
                      <img
                        src={creator.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'}
                        alt={creator.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                      />
                      <div className="text-left font-sans">
                        <span className="text-xs font-bold text-gray-950 block">{creator.name}</span>
                        <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">{creator.field || 'Seni Kreatif'}</span>
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
            <div className="absolute inset-0 cursor-zoom-out" onClick={() => setLightboxUrl(null)} />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            >
              <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-1 z-10">
                <span className="text-xs font-sans font-bold tracking-widest uppercase flex items-center gap-1 bg-brand-accent/10 border border-brand-accent/25 px-3 py-1 rounded-full text-brand-accent shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-brand-accent" /> MAHASENI ADIKSI
                </span>
                
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="p-2 bg-white/5 hover:bg-rose-500 hover:text-white text-gray-300 border border-white/10 hover:border-transparent rounded-full shadow-lg transition duration-300 transform hover:rotate-90 cursor-pointer"
                  title="Tutup Detil"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative p-1 bg-gradient-to-r from-brand-accent via-emerald-600 to-teal-500 rounded-3xl shadow-[0_0_50px_rgba(4,120,87,0.35)] group overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-700/50 rounded-3xl blur opacity-35 group-hover:opacity-60 transition duration-1000" />
                <motion.img
                  layoutId="spectacle-shared-image"
                  src={lightboxUrl}
                  alt="Shared Artwork Spectacular"
                  className="max-h-[75vh] max-w-full object-contain rounded-2xl relative z-10 border border-white/5"
                />
              </div>

              <p className="text-[10px] text-gray-400 font-sans mt-4 text-center tracking-wide uppercase">
                Ketuk di luar gambar untuk menutup • Karya seni ini mengalir dalam detak Komunitas Adiksi
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
