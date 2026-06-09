import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Film, Upload, CheckCircle, AlertTriangle, Loader, FileVideo, X, 
  Play, Info, ThumbsUp, Eye, Calendar, Clock, Sparkles, Plus, 
  Share2, ArrowLeft, Maximize2, Search, Film as MovieIcon, Heart, ChevronRight, User, Tv, Lock,
  Bookmark, RotateCcw, RotateCw, Volume2, VolumeX, Sliders, Sun, Check, Settings
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { upload } from '@imagekit/react';
import { collection, getDocs, addDoc, doc, updateDoc, increment, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { VeloraFilm } from '../types';

interface Props {
  addNotification: (message: string) => void;
  initialVideoId?: string | null;
}

// ==============
// IMAGEKIT CONFIG
// ==============
const authenticator = async () => {
    try {
        const response = await fetch('/api/imagekit-auth');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[ImageKit Auth] Failed to fetch auth params: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();
        const { signature, token, expire } = data;
        return { signature, token, expire };
    } catch (error: any) {
        console.error("[ImageKit Auth] Error:", error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
};

const meta = import.meta as any;
const IMAGEKIT_PUBLIC_KEY = meta.env?.VITE_IMAGEKIT_PUBLIC_KEY || "public_MEe5oaZyE+U9OClfeDX6JU/n1kw=";
const IMAGEKIT_URL_ENDPOINT = meta.env?.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/xyfyscipf";

export default function VeloraAdiksi({ addNotification, initialVideoId = null }: Props) {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [showAuthRequiredLock, setShowAuthRequiredLock] = useState(false);
  const [initialProcessed, setInitialProcessed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Navigation State
  const [currentView, setCurrentView] = useState<'catalog' | 'upload'>('catalog');
  
  // Movie List States
  const [films, setFilms] = useState<VeloraFilm[]>([]);
  
  // Load liked films from LocalStorage
  const [likedFilmIds, setLikedFilmIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('velora_liked_films');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save liked films whenever it changes
  useEffect(() => {
    localStorage.setItem('velora_liked_films', JSON.stringify(likedFilmIds));
  }, [likedFilmIds]);

  // Load saved films in My List from LocalStorage
  const [myListIds, setMyListIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('velora_my_list_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('velora_my_list_ids', JSON.stringify(myListIds));
  }, [myListIds]);

  const toggleMyList = (filmId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const alreadyIn = myListIds.includes(filmId);
    if (alreadyIn) {
      setMyListIds(prev => prev.filter(id => id !== filmId));
      addNotification("Maju Sineas! Film dihapus dari Daftar Saya.");
    } else {
      setMyListIds(prev => [...prev, filmId]);
      addNotification("Sinema berhasil disimpan ke Daftar Saya!");
    }
  };

  // Load and update active watch progress (Lanjutkan Menonton)
  const [watchHistory, setWatchHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('velora_watch_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateWatchHistory = (film: VeloraFilm, progress: number) => {
    setWatchHistory(prev => {
      const filtered = prev.filter(item => item.filmId !== film.id);
      const updated = [
        {
          filmId: film.id,
          title: film.title,
          coverUrl: film.coverUrl,
          genre: film.genre,
          duration: film.duration,
          timestamp: new Date().toISOString(),
          progressPercent: Math.max(1, Math.min(100, progress))
        },
        ...filtered
      ].slice(0, 10);
      localStorage.setItem('velora_watch_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Premium Custom Hotkey & Comfort States
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [cinemaVolume, setCinemaVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cinemaAmbient, setCinemaAmbient] = useState<number>(0.95); // Ambient screen backdrop brightness (opacity)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [durationTime, setDurationTime] = useState<number>(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('Off');
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showGearSettings, setShowGearSettings] = useState<boolean>(false);

  // Comment & Rating Input States
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setReviewerName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
    } else {
      setReviewerName('');
    }
  }, [currentUser]);
  const [loadingFilms, setLoadingFilms] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Movie Modal
  const [selectedFilm, setSelectedFilm] = useState<VeloraFilm | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (selectedFilm) {
      setShowAuthRequiredLock(false);
    }
  }, [selectedFilm]);

  // Handle URL deep linking for playing videos
  useEffect(() => {
    if (initialVideoId && films.length > 0 && !initialProcessed) {
      const matched = films.find(f => f.id === initialVideoId);
      if (matched) {
        setInitialProcessed(true);
        setSelectedFilm(matched);
        incrementViewCount(matched);
        if (currentUser) {
          setIsPlaying(true);
        } else {
          setShowAuthRequiredLock(true);
          addNotification("Silakan masuk menggunakan menu Profil terlebih dahulu untuk menonton film.");
        }
      }
    }
  }, [initialVideoId, films, initialProcessed, currentUser, addNotification]);

  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId: any;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    };
    window.addEventListener('mousemove', handleMouseMove);
    setShowControls(true);
    timeoutId = setTimeout(() => {
      setShowControls(false);
    }, 3500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isPlaying]);
  
  // Form Upload States
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [logline, setLogline] = useState('');
  const [genre, setGenre] = useState('Drama');
  const [director, setDirector] = useState('');
  const [releaseYear, setReleaseYear] = useState('2026');
  const [duration, setDuration] = useState('');
  const [castInput, setCastInput] = useState('');

  // Dual-file submission tracks (ImageKit uploads OR URLs)
  const [coverOption, setCoverOption] = useState<'upload' | 'url'>('upload');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState('');
  
  const [videoOption, setVideoOption] = useState<'upload' | 'url'>('upload');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');

  // Dropzone specifics
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingTarget, setUploadingTarget] = useState<'cover' | 'video' | null>(null);

  const heroScrollRef = useRef<HTMLDivElement>(null);

  // Fetch films from Firestore
  const fetchAllFilms = useCallback(async () => {
    setLoadingFilms(true);
    try {
      const q = query(collection(db, 'velora_films'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const userFilms: VeloraFilm[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userFilms.push({
          id: doc.id,
          title: data.title || '',
          synopsis: data.synopsis || '',
          logline: data.logline || '',
          genre: data.genre || '',
          coverUrl: data.coverUrl || '',
          videoUrl: data.videoUrl || '',
          director: data.director || '',
          releaseYear: data.releaseYear || '',
          duration: data.duration || '',
          cast: data.cast || [],
          uploadedBy: data.uploadedBy || '',
          uploaderName: data.uploaderName || '',
          createdAt: data.createdAt || '',
          likes: data.likes || 0,
          views: data.views || 0,
          reviews: data.reviews || [],
        });
      });

      setFilms(userFilms);
    } catch (err) {
      console.error("Gagal memuat film dari basis data:", err);
      setFilms([]);
    } finally {
      setLoadingFilms(false);
    }
  }, []);

  useEffect(() => {
    fetchAllFilms();
  }, [fetchAllFilms]);

  // Handle Dropzone for Poster/Cover
  const handleCoverDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsUploadingFile(true);
    setUploadProgress(0);
    setUploadingTarget('cover');
    try {
      const authData = await authenticator();
      const result = await upload({
        file: file,
        fileName: `cover-${Date.now()}-${file.name}`,
        publicKey: IMAGEKIT_PUBLIC_KEY,
        signature: authData.signature,
        token: authData.token,
        expire: authData.expire,
        folder: "/velora/covers",
        onProgress: (event: ProgressEvent) => {
          if (event.total) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        }
      });
      setUploadedCoverUrl(result.url);
      addNotification("Poster film diunggah dengan sukses!");
    } catch (err: any) {
      console.error(err);
      addNotification(`Gagal mengunggah poster: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
      setUploadingTarget(null);
    }
  }, [addNotification]);

  // Handle Dropzone for Video
  const handleVideoDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsUploadingFile(true);
    setUploadProgress(0);
    setUploadingTarget('video');
    try {
      const authData = await authenticator();
      const result = await upload({
        file: file,
        fileName: `video-${Date.now()}-${file.name}`,
        publicKey: IMAGEKIT_PUBLIC_KEY,
        signature: authData.signature,
        token: authData.token,
        expire: authData.expire,
        folder: "/velora/videos",
        onProgress: (event: ProgressEvent) => {
          if (event.total) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        }
      });
      setUploadedVideoUrl(result.url);
      addNotification("File film video berhasil diunggah!");
    } catch (err: any) {
      console.error(err);
      addNotification(`Gagal mengunggah video: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
      setUploadingTarget(null);
    }
  }, [addNotification]);

  const { getRootProps: getCoverProps, getInputProps: getCoverInputProps } = useDropzone({
    onDrop: handleCoverDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const { getRootProps: getVideoProps, getInputProps: getVideoInputProps } = useDropzone({
    onDrop: handleVideoDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov', '.qt'],
      'video/webm': ['.webm'],
      'video/x-matroska': ['.mkv'],
      'video/avi': ['.avi', '.divx'],
      'video/mpeg': ['.mpeg', '.mpg']
    },
    multiple: false
  } as any);

  // Increment view count dynamically
  const incrementViewCount = async (film: VeloraFilm) => {
    if (film.id.startsWith('seed-')) {
      // Direct local state increment for mockup seeds
      setFilms(prev => prev.map(f => f.id === film.id ? { ...f, views: f.views + 1 } : f));
      return;
    }
    try {
      const filmDoc = doc(db, 'velora_films', film.id);
      await updateDoc(filmDoc, { views: increment(1) });
      setFilms(prev => prev.map(f => f.id === film.id ? { ...f, views: f.views + 1 } : f));
    } catch (e) {
      console.error("View increment error:", e);
    }
  };

  // Upvote/Like film
  const handleLikeFilm = async (film: VeloraFilm, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAlreadyLiked = likedFilmIds.includes(film.id);

    if (isAlreadyLiked) {
      // Toggle unlike
      if (film.id.startsWith('seed-')) {
        setFilms(prev => prev.map(f => f.id === film.id ? { ...f, likes: Math.max(0, f.likes - 1) } : f));
        if (selectedFilm?.id === film.id) {
          setSelectedFilm(prev => prev ? { ...prev, likes: Math.max(0, prev.likes - 1) } : null);
        }
        setLikedFilmIds(prev => prev.filter(id => id !== film.id));
        addNotification(`Batal menyukai film "${film.title}".`);
        return;
      }
      try {
        const filmDoc = doc(db, 'velora_films', film.id);
        await updateDoc(filmDoc, { likes: increment(-1) });
        setFilms(prev => prev.map(f => f.id === film.id ? { ...f, likes: Math.max(0, f.likes - 1) } : f));
        if (selectedFilm?.id === film.id) {
          setSelectedFilm(prev => prev ? { ...prev, likes: Math.max(0, prev.likes - 1) } : null);
        }
        setLikedFilmIds(prev => prev.filter(id => id !== film.id));
        addNotification(`Batal menyukai film "${film.title}".`);
      } catch (err) {
        console.error("Unlike failure:", err);
        addNotification("Gagal membatalkan suka.");
      }
    } else {
      // Toggle like
      if (film.id.startsWith('seed-')) {
        setFilms(prev => prev.map(f => f.id === film.id ? { ...f, likes: f.likes + 1 } : f));
        if (selectedFilm?.id === film.id) {
          setSelectedFilm(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
        }
        setLikedFilmIds(prev => [...prev, film.id]);
        addNotification(`Kamu menyukai film "${film.title}"!`);
        return;
      }
      try {
        const filmDoc = doc(db, 'velora_films', film.id);
        await updateDoc(filmDoc, { likes: increment(1) });
        setFilms(prev => prev.map(f => f.id === film.id ? { ...f, likes: f.likes + 1 } : f));
        if (selectedFilm?.id === film.id) {
          setSelectedFilm(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
        }
        setLikedFilmIds(prev => [...prev, film.id]);
        addNotification(`Kamu menyukai film "${film.title}"!`);
      } catch (err) {
        console.error("Like increment failure:", err);
        addNotification("Gagal menyematkan suka pada film.");
      }
    }
  };

  // Submit comment and rating
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilm) return;

    if (!reviewerName.trim()) {
      addNotification("Harap masukkan nama Anda!");
      return;
    }
    if (!reviewComment.trim()) {
      addNotification("Harap masukkan ulasan atau komentar Anda!");
      return;
    }

    setIsSubmittingReview(true);
    const newReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      authorName: reviewerName.trim(),
      authorUid: currentUser?.uid || 'guest',
      rating: reviewRating,
      comment: reviewComment.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedReviews = [...(selectedFilm.reviews || []), newReview];

    if (selectedFilm.id.startsWith('seed-')) {
      setFilms(prev => prev.map(f => f.id === selectedFilm.id ? { ...f, reviews: updatedReviews } : f));
      setSelectedFilm(prev => prev ? { ...prev, reviews: updatedReviews } : null);
      setReviewComment('');
      setReviewRating(5);
      addNotification("Rating dan komentar Anda dikirim secara lokal!");
      setIsSubmittingReview(false);
      return;
    }

    try {
      const filmDoc = doc(db, 'velora_films', selectedFilm.id);
      await updateDoc(filmDoc, { reviews: updatedReviews });
      
      setFilms(prev => prev.map(f => f.id === selectedFilm.id ? { ...f, reviews: updatedReviews } : f));
      setSelectedFilm(prev => prev ? { ...prev, reviews: updatedReviews } : null);
      
      setReviewComment('');
      setReviewRating(5);
      addNotification("Ulasan & rating sineas Anda sukses dipublikasikan!");
    } catch (err: any) {
      console.error("Gagal mengirim ulasan:", err);
      addNotification(`Gagal mempublikasikan ulasan: ${err.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Open movie viewer
  const handleOpenFilm = (film: VeloraFilm) => {
    setSelectedFilm(film);
    setIsPlaying(false);
    incrementViewCount(film);
  };

  // Submitting detailed film form
  const handleSubmitFilm = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      addNotification("Silakan masuk menggunakan menu Profil untuk mengunggah film.");
      return;
    }

    const finalCoverUrl = coverOption === 'upload' ? uploadedCoverUrl : coverUrlInput;
    const finalVideoUrl = videoOption === 'upload' ? uploadedVideoUrl : videoUrlInput;

    if (!title.trim() || !synopsis.trim() || !director.trim() || !finalCoverUrl || !finalVideoUrl) {
      addNotification("Harap lengkapi semua data wajib: Judul, Sinopsis, Sutradara, Poster, dan Link Video!");
      return;
    }

    const newFilmData = {
      title: title.trim(),
      synopsis: synopsis.trim(),
      logline: logline.trim() || synopsis.slice(0, 100) + '...',
      genre: genre,
      director: director.trim(),
      releaseYear: releaseYear || '2026',
      duration: duration.trim() || '15 Menit',
      cast: castInput.split(',').map(s => s.trim()).filter(Boolean),
      coverUrl: finalCoverUrl,
      videoUrl: finalVideoUrl,
      uploadedBy: currentUser.uid,
      uploaderName: currentUser.displayName || currentUser.email || 'Sineas Adiksi',
      createdAt: new Date().toISOString(),
      likes: 0,
      views: 0
    };

    try {
      await addDoc(collection(db, 'velora_films'), newFilmData);
      addNotification("Film Anda telah resmi rilis dan terpampang di Beranda Velora!");
      // Reset form variables
      setTitle('');
      setSynopsis('');
      setLogline('');
      setDirector('');
      setDuration('');
      setCastInput('');
      setUploadedCoverUrl('');
      setUploadedVideoUrl('');
      setCoverUrlInput('');
      setVideoUrlInput('');
      setCurrentView('catalog');
      fetchAllFilms();
    } catch (err: any) {
      console.error("Failed to add film metadata:", err);
      addNotification(`Gagal mempublikasikan film: ${err.message}`);
    }
  };

  // Custom integrated video references and hooks
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : cinemaVolume;
    }
  }, [cinemaVolume, isMuted, isPlaying]);

  // Master Hotkeys for Immersive Viewing Experience
  useEffect(() => {
    if (!isPlaying || !selectedFilm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in comments or rating inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            setCurrentTime(videoRef.current.currentTime);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || 9999, videoRef.current.currentTime + 10);
            setCurrentTime(videoRef.current.currentTime);
          }
          break;
        case 'f':
          e.preventDefault();
          if (videoRef.current) {
            if (!document.fullscreenElement) {
              videoRef.current.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedFilm]);

  const handleSkipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration || 9999, 45);
      setCurrentTime(45);
      addNotification("Intro dilewati! Menuju adegan utama.");
    }
  };

  const formatPlayerTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
    const hr = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = Math.floor(seconds % 60);

    const minStr = min < 10 ? `0${min}` : min;
    const secStr = sec < 10 ? `0${sec}` : sec;

    if (hr > 0) {
      return `${hr}:${minStr}:${secStr}`;
    }
    return `${minStr}:${secStr}`;
  };

  const getSubtitlesText = (time: number, genre: string) => {
    if (activeSubtitle === 'Off') return null;
    const t = Math.floor(time);
    
    const subtitleTracks: Record<string, Record<number, string>> = {
      Id: {
        2: "[ Musik pembuka cinematic mengalun lembut ]",
        5: "Rumah Adiksi Kreatif mempersembahkan sebuah mahakarya...",
        10: "Disutradarai dengan ketulusan seni tingkat tinggi.",
        15: "Setiap adegan dirancang khusus untuk kenyamanan menonton Anda.",
        20: "Sineas: \"Pertunjukan sesungguhnya baru saja dimulai...\"",
        25: "Sineas: \"Apakah kamu percaya pada kekuatan seni sinematik?\"",
        30: "Sineas: \"Karena setiap cerita berhak didengar, dan setiap visual berhak dirasakan.\"",
        35: "[ Kamera perlahan bergerak mendekat - Suara angin berhembus ]",
        40: "Sineas: \"Terima kasih telah mendukung sineas indie Indonesia.\"",
        45: "Sineas: \"Silakan saksikan hingga akhir kredit...\"",
        60: "[ Musik instrumen sendu mengalun lembut ]",
        75: "[ Dialog berlanjut dengan kedalaman karakter ]",
        90: "Karakter: \"Kita akan pulang, cepat atau lambat.\"",
        120: "[ Ketegangan meningkat - suara detak jantung ]",
        150: "Karakter utama berbisik: \"Keindahan ada di sekeliling kita...\"",
        180: "[ Kredit akhir mulai berjalan perlahan ]",
      },
      En: {
        2: "[ Cinematic instrumental intro playing ]",
        5: "Rumah Adiksi Kreatif proudly presents a cinematic masterpiece...",
        10: "Directed with pure artistic dedication and passion.",
        15: "Every scene is tailored to maximize your premium viewing comfort.",
        20: "Director: \"The actual story is only just beginning...\"",
        25: "Director: \"Do you believe in the raw power of moving pictures?\"",
        30: "Director: \"Because every voice deserves to be heard, every frame witnessed.\"",
        35: "[ Camera pans in slowly - Wind howling softly in background ]",
        40: "Director: \"Thank you for championing Indonesian independent cinema.\"",
        45: "Director: \"Please enjoy the film until the final credits...\"",
        65: "[ Soft instrumental chords resonance ]",
        75: "[ Character development deepens with emotional dialogue ]",
        90: "Character: \"We will find our way back, sooner or later.\"",
        120: "[ Suspense rises - muffled heartbeat sound effects ]",
        150: "Protagonist whispers: \"Beauty was always surrounding us...\"",
        180: "[ End credits roll smoothly ]",
      }
    };

    const trackKey = activeSubtitle === 'Indonesian' ? 'Id' : 'En';
    const track = subtitleTracks[trackKey];
    
    for (let s = t; s > t - 4; s--) {
      if (track && track[s]) {
        return track[s];
      }
    }
    return null;
  };

  // Elegant intelligent Media Parser to render direct streams OR YouTube embeds
  const parseVideoEmbed = (url: string) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) {
        return (
          <iframe 
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            className="w-full h-full aspect-video rounded-xl shadow-2xl border border-white/10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        );
      }
    }
    if (url.includes('vimeo.com')) {
      const regExp = /vimeo\.com\/([0-9]+)/;
      const match = url.match(regExp);
      if (match) {
        return (
          <iframe 
            src={`https://player.vimeo.com/video/${match[1]}?autoplay=1&color=d4af37`}
            className="w-full h-full aspect-video rounded-xl shadow-2xl border border-white/10"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          ></iframe>
        );
      }
    }
    
    // Default to clean native HTML5 video player
    return (
      <video 
        src={url}
        controls 
        autoPlay
        className="w-full h-full max-h-[70vh] rounded-xl bg-black shadow-2xl border border-white/10 object-contain"
        referrerPolicy="no-referrer"
      />
    );
  };

  // Filters movies by active search queries
  const filteredFilms = films.filter(film => 
    film.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    film.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
    film.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    film.synopsis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const heroFilm = films[0] || null;

  const renderShareBlock = (film: VeloraFilm) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?tab=velora&video=${film.id}`;
    const shareText = `Tonton Film Pendek Eksklusif "${film.title}" hanya di Rumah Adiksi Kreatif - Bioskop Virtual Velora!\nBuka tautan ini: ${shareUrl}`;

    const copyToClipboard = () => {
      try {
        navigator.clipboard.writeText(shareUrl);
        addNotification(`Tautan film "${film.title}" telah disalin ke papan klip!`);
      } catch (e) {
        console.error("Clipboard copy failed", e);
        addNotification("Gagal menyalin tautan secara otomatis.");
      }
    };

    const copyForInstagram = () => {
      try {
        navigator.clipboard.writeText(shareText);
        addNotification("Caption film disalin! Silakan tempelkan di Insta-story atau DM Instagram.");
      } catch (e) {
        console.error("Clipboard copy failed", e);
        addNotification("Gagal menyalin caption.");
      }
    };

    const shareWA = () => {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    };

    const shareFB = () => {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      window.open(fbUrl, '_blank');
    };

    return (
      <div className="bg-slate-950/80 border border-white/5 p-3 rounded-xl space-y-2 mt-2 w-full shadow-inner">
        <div className="text-[9px] font-mono uppercase font-black text-brand-gold tracking-widest flex items-center gap-1.5 justify-between">
          <span className="flex items-center gap-1"><Share2 size={10} /> BAGIKAN FILM</span>
          <span className="text-gray-500 font-sans capitalize font-semibold text-[8px]">Tautan Resmi Rumah Adiksi</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 xs:flex xs:flex-wrap">
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white/5 border border-white/10 hover:border-brand-gold/40 hover:bg-white/10 text-gray-200 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex-1 xs:flex-initial"
            title="Salin Tautan Website"
          >
            <Share2 size={10} className="text-brand-gold shrink-0" />
            <span className="truncate">Salin Link</span>
          </button>
          
          <button
            type="button"
            onClick={shareWA}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-950/60 border border-emerald-500/20 text-emerald-300 hover:text-white rounded-lg text-[10px] font-mono font-bold hover:bg-emerald-900/60 transition-all cursor-pointer flex-1 xs:flex-initial"
            title="Bagikan ke WhatsApp"
          >
            <span className="text-emerald-500 font-extrabold text-[9px] shrink-0">WA</span>
            <span className="truncate">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={copyForInstagram}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-pink-950/60 border border-pink-500/20 text-pink-300 hover:text-white rounded-lg text-[10px] font-mono font-bold hover:bg-pink-900/60 transition-all cursor-pointer flex-1 xs:flex-initial"
            title="Salin untuk Instagram"
          >
            <span className="text-pink-400 font-extrabold text-[9px] shrink-0">IG</span>
            <span className="truncate">Instagram</span>
          </button>

          <button
            type="button"
            onClick={shareFB}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-950/60 border border-blue-500/20 text-blue-300 hover:text-white rounded-lg text-[10px] font-mono font-bold hover:bg-blue-900/60 transition-all cursor-pointer flex-1 xs:flex-initial"
            title="Bagikan ke Facebook"
          >
            <span className="text-blue-500 font-extrabold text-[9px] shrink-0">FB</span>
            <span className="truncate">Facebook</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-gray-900 font-sans selection:bg-brand-accent selection:text-white">
      {/* Cinematic Banner Header */}
      <div className="border-b border-gray-150 bg-white/95 sticky top-0 lg:top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-accent rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm">
                <Tv className="text-white animate-pulse" size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-black tracking-widest text-brand-green font-sans">VELORA</span>
                  <span className="text-[9px] sm:text-xs uppercase bg-[#FFF6E6] border border-amber-200 px-1.5 py-0.5 rounded text-amber-700 font-sans font-bold">ADIKSI</span>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-500 tracking-wider font-medium">Cinematic Virtual Theatre & Sineas Hub</p>
              </div>
            </div>

            {/* Mobile submission/view switch directly on the right of logo */}
            <div className="flex items-center gap-2 sm:hidden">
              {currentView === 'catalog' ? (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      addNotification("Silakan masuk lewat halaman Profil terlebih dahulu untuk mengunggah film.");
                    } else {
                      setCurrentView('upload');
                    }
                  }}
                  className="p-2 bg-brand-accent hover:bg-brand-green text-white rounded-lg active:scale-95 transition-all text-center shadow-sm flex items-center justify-center cursor-pointer"
                  title="Unggah Karya"
                >
                  <Plus size={15} className="stroke-[3]" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="p-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {currentView === 'catalog' && (
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Cari film, genre, sutradara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-250 hover:border-brand-accent focus:border-brand-accent rounded-full pl-9 pr-4 py-1.5 sm:py-2 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                />
              </div>
            )}

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {currentView === 'catalog' ? (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      addNotification("Silakan masuk lewat halaman Profil terlebih dahulu untuk mengunggah film.");
                    } else {
                      setCurrentView('upload');
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-brand-accent hover:bg-brand-green text-white rounded-lg shadow-sm active:scale-95 transition-all text-center whitespace-nowrap font-sans cursor-pointer"
                >
                  <Plus size={14} className="stroke-[3]" /> Unggah Karya
                </button>
              ) : (
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg active:scale-95 transition-all font-sans cursor-pointer animate-fadeIn"
                >
                  <ArrowLeft size={14} /> Beranda Velora
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {currentView === 'catalog' ? (
        <div className="space-y-12 pb-24">
          {/* NETFLIX-STYLE HERO FEATURE BLOCK */}
          {!searchQuery && heroFilm && (
            <div className="relative w-full h-[60vh] sm:h-[68vh] md:h-[75vh] flex items-end overflow-hidden group">
              {/* Back Drop Illustration */}
              <div className="absolute inset-0">
                <img 
                  src={heroFilm.coverUrl} 
                  alt={heroFilm.title} 
                  className="w-full h-full object-cover animate-ken-burns"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FCFAF7] via-[#FCFAF7]/55 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#FCFAF7]/90 via-transparent to-transparent"></div>
              </div>

              {/* Front Info Content */}
              <div className="relative max-w-7xl mx-auto w-full px-4 pb-8 sm:pb-12 z-10">
                <div className="max-w-2xl space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase py-0.5 px-2 bg-brand-accent text-white rounded-sm tracking-widest font-sans">FEATURED SCREENING</span>
                    <span className="text-[9px] sm:text-[10px] bg-brand-green/10 border border-brand-green/20 py-0.5 px-2 rounded-full text-brand-green font-sans font-bold">{heroFilm.genre}</span>
                  </div>

                  <h2 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-brand-green uppercase leading-none font-sans">
                    {heroFilm.title}
                  </h2>

                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 font-sans tracking-wider italic font-semibold line-clamp-1">
                    &ldquo;{heroFilm.logline || heroFilm.synopsis}&rdquo;
                  </p>

                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-700 line-clamp-2 sm:line-clamp-3">
                    {heroFilm.synopsis}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-gray-600 font-sans border-l-4 border-brand-accent pl-2.5">
                    <span className="flex items-center gap-1"><User size={10} className="text-brand-accent" /> {heroFilm.director}</span>
                    <span className="text-gray-400 hidden xs:inline">&bull;</span>
                    <span className="flex items-center gap-1"><Clock size={10} className="text-brand-accent" /> {heroFilm.duration}</span>
                    <span className="text-gray-400 hidden xs:inline">&bull;</span>
                    <span className="flex items-center gap-1"><Calendar size={10} className="text-brand-accent" /> {heroFilm.releaseYear}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-4">
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          addNotification("Silakan masuk menggunakan menu Profil terlebih dahulu untuk menonton film.");
                        } else {
                          setSelectedFilm(heroFilm);
                          setIsPlaying(true);
                          incrementViewCount(heroFilm);
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 sm:py-3 bg-brand-accent text-white font-bold uppercase tracking-wider rounded-lg text-[11px] sm:text-xs hover:bg-[#154637] transition-all shadow-md active:scale-95 font-sans cursor-pointer"
                    >
                      <Play size={14} className="fill-current text-white mr-0.5" /> Tonton Sekarang
                    </button>
                    <button
                      onClick={() => handleOpenFilm(heroFilm)}
                      className="flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-3 bg-white border border-gray-200 text-gray-700 font-bold uppercase tracking-wider rounded-lg text-[11px] sm:text-xs hover:bg-gray-50 transition-all active:scale-95 font-sans cursor-pointer shadow-sm"
                    >
                      <Info size={14} /> Detail
                    </button>
                    <button
                      onClick={(e) => toggleMyList(heroFilm.id, e)}
                      className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-3 border font-bold uppercase tracking-wider rounded-lg text-[11px] sm:text-xs transition-all active:scale-95 font-sans cursor-pointer ${
                        myListIds.includes(heroFilm.id)
                          ? 'border-brand-accent bg-[#F1F8F6] text-brand-accent'
                          : 'bg-white border-gray-200 hover:border-brand-accent/30 text-gray-700 hover:bg-gray-50'
                      }`}
                      title={myListIds.includes(heroFilm.id) ? "Keluarkan dari Daftar Saya" : "Simpan ke Daftar Saya"}
                    >
                      {myListIds.includes(heroFilm.id) ? (
                        <>
                          <Check size={14} className="text-brand-accent" /> Terdaftar
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> Daftar saya
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleLikeFilm(heroFilm, e)}
                      className={`p-2 sm:p-3 border rounded-lg transition-all group/btn cursor-pointer ${
                        likedFilmIds.includes(heroFilm.id)
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'bg-white border-gray-200 hover:border-brand-accent hover:text-brand-accent text-gray-400'
                      }`}
                      title={likedFilmIds.includes(heroFilm.id) ? "Batal Sukai" : "Sukai Film"}
                    >
                      <ThumbsUp size={14} className={`group-hover/btn:scale-125 transition-transform ${likedFilmIds.includes(heroFilm.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CATALOG MAIN SLIDERS & GRIDS */}
          <div className="max-w-7xl mx-auto px-4 space-y-12">
            
            {loadingFilms ? (
              <div className="space-y-12 animate-fade-in">
                {/* Simulated Shimmer Hero Banner (if on initial load) */}
                <div className="w-full h-[280px] sm:h-[420px] rounded-2xl skeleton-shimmer border border-white/5 flex flex-col justify-end p-6 sm:p-10 space-y-3.5 shadow-2xl">
                  <div className="w-28 h-5 bg-white/10 rounded-full"></div>
                  <div className="w-2/3 md:w-1/2 h-8 sm:h-12 bg-white/25 rounded-xl"></div>
                  <div className="w-11/12 md:w-3/4 h-4 bg-white/10 rounded-md"></div>
                  <div className="w-1/2 h-3 bg-white/5 rounded-md"></div>
                  <div className="flex gap-3 pt-3">
                    <div className="w-32 h-10 bg-white/20 rounded-xl"></div>
                    <div className="w-24 h-10 bg-white/10 rounded-xl"></div>
                  </div>
                </div>

                {/* Shimmer Rows */}
                {[1, 2].map((rowIdx) => (
                  <div key={rowIdx} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-48 h-6 bg-white/20 rounded-md border-l-4 border-brand-gold pl-3"></div>
                      <div className="w-12 h-3 bg-white/10 rounded"></div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
                      {[1, 2, 3, 4].map((cardIdx) => (
                        <div 
                          key={cardIdx} 
                          className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-[#0f1013] border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-lg"
                        >
                          <div className="aspect-[16/10] skeleton-shimmer w-full"></div>
                          <div className="p-3 sm:p-4 space-y-3 flex-1 relative animate-pulse">
                            <div className="w-1/4 h-3 bg-brand-gold/20 rounded inline-block"></div>
                            <div className="w-11/12 h-4 bg-white/25 rounded-md"></div>
                            <div className="w-5/6 h-2.5 bg-white/10 rounded"></div>
                            <div className="flex justify-between items-center pt-2.5 border-t border-white/5 mt-auto">
                              <div className="w-10 h-3 bg-white/15 rounded"></div>
                              <div className="w-12 h-3 bg-white/10 rounded"></div>
                              <div className="w-8 h-3 bg-white/15 rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : films.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-12 text-center rounded-2xl max-w-xl mx-auto">
                <MovieIcon size={48} className="text-brand-gold mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Katalog Film Kosong</h3>
                <p className="text-xs text-gray-400 mb-6 font-mono">Belum ada sinea kreatif yang merilis karyanya di sini. Jadilah sineas pertama!</p>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="px-5 py-2 text-xs bg-brand-gold text-black uppercase tracking-wider font-bold rounded-lg font-mono"
                >
                  Rilis Film Pertama Anda
                </button>
              </div>
            ) : (
              <>
                {/* Search Results Display */}
                {searchQuery && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold border-l-4 border-brand-gold pl-3 font-mono">
                      HASIL PENCARIAN &ldquo;{searchQuery}&rdquo; ({filteredFilms.length})
                    </h3>
                    {filteredFilms.length === 0 ? (
                      <p className="text-xs text-gray-500 font-mono">Tidak ada film yang cocok dengan pencarian Anda.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {filteredFilms.map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="bg-[#0f1013] border border-white/5 hover:border-brand-gold/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-black flex items-center justify-center">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-10 w-10 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                                  <Play size={16} className="fill-current text-black ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1 justify-between">
                              <div>
                                <div className="text-[9px] font-mono uppercase bg-white/5 border border-white/5 text-gray-400 font-black px-2 py-0.5 rounded inline-block mb-2">
                                  {film.genre}
                                </div>
                                <h4 className="font-bold text-sm text-gray-200 uppercase line-clamp-1 group-hover:text-brand-gold transition-colors">
                                  {film.title}
                                </h4>
                                <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 mb-2 leading-relaxed">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono border-t border-white/5 pt-2">
                                <span className="flex items-center gap-0.5 text-brand-gold">
                                  <Heart size={10} className={likedFilmIds.includes(film.id) ? "fill-red-500 text-red-500 animate-pulse" : "fill-current"} /> {film.likes}
                                </span>
                                <span className="flex items-center gap-0.5"><Eye size={10} /> {film.views}</span>
                                <span>{film.duration}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!searchQuery && (
                  <div className="space-y-12">
                    {/* ROW 0: LANJUTKAN MENONTON (WATCH HISTORY WITH PROGRESS BAR) */}
                    {watchHistory.length > 0 && (
                      <div className="space-y-3 sm:space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase text-brand-green tracking-wider sm:tracking-widest border-l-4 border-brand-accent pl-2.5 sm:pl-3 flex items-center gap-2 font-sans">
                            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
                            Lanjutkan Menonton
                          </h3>
                          <span className="text-[9px] font-sans text-gray-500 tracking-wider font-semibold">Terakhir ditonton &rarr;</span>
                        </div>
                        <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                          {watchHistory.map((item) => {
                            const actualFilm = films.find(f => f.id === item.filmId);
                            if (!actualFilm) return null;
                            return (
                              <div 
                                key={item.filmId}
                                onClick={() => {
                                  setSelectedFilm(actualFilm);
                                  setIsPlaying(true);
                                  incrementViewCount(actualFilm);
                                }}
                                className="w-[145px] xs:w-[175px] sm:w-[240px] shrink-0 bg-white border border-gray-200 hover:border-brand-accent/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-sm snap-start"
                              >
                                <div className="relative aspect-[16/10] overflow-hidden bg-gray-55">
                                  <img src={actualFilm.coverUrl} alt={actualFilm.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                  <span className="absolute top-2 left-2 text-[7px] sm:text-[8px] font-sans uppercase py-0.5 px-1.5 bg-white/95 text-brand-accent border border-gray-200 rounded font-bold">
                                    {actualFilm.genre}
                                  </span>
                                  {/* Red YouTube style progress overlay */}
                                  <div className="absolute bottom-0 inset-x-0 h-1 bg-gray-200">
                                    <div 
                                      className="h-full bg-brand-accent rounded-r-sm"
                                      style={{ width: `${item.progressPercent}%` }}
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="h-8 w-8 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-md transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                      <Play size={12} className="fill-current text-white ml-0.5" />
                                    </span>
                                  </div>
                                </div>
                                <div className="p-2 sm:p-3 flex flex-col justify-between flex-1 bg-white">
                                  <div>
                                    <h4 className="font-bold text-[11px] sm:text-xs tracking-tight text-brand-green uppercase line-clamp-1 group-hover:text-brand-accent transition-colors font-sans">
                                      {actualFilm.title}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[8px] font-sans text-gray-500">{actualFilm.duration}</span>
                                      <span className="text-gray-300 font-sans text-[8px]">&bull;</span>
                                      <span className="text-[8.5px] font-sans text-brand-accent font-bold">{item.progressPercent}% ditonton</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ROW 0.5: DAFTAR SAYA (MY LIST ROW) */}
                    {myListIds.length > 0 && films.filter(f => myListIds.includes(f.id)).length > 0 && (
                      <div className="space-y-3 sm:space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase text-brand-green tracking-wider sm:tracking-widest border-l-4 border-brand-accent pl-2.5 sm:pl-3 flex items-center gap-2 font-sans">
                            <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
                            Daftar Saya
                          </h3>
                          <span className="text-[9px] font-sans text-gray-500 tracking-wider font-semibold">Koleksi kesukaan Anda &rarr;</span>
                        </div>
                        <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                          {films.filter(f => myListIds.includes(f.id)).map((film) => (
                            <div 
                              key={film.id}
                              onClick={() => handleOpenFilm(film)}
                              className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-white border border-gray-200 hover:border-brand-accent/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-sm snap-start animate-fadeIn"
                            >
                              <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                                <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-sans font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-white/95 border border-gray-200 text-brand-accent rounded-full shadow-sm">
                                  {film.genre}
                                </span>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                    <Play size={14} className="fill-current text-white ml-0.5" />
                                  </span>
                                </div>
                              </div>
                              <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 bg-white">
                                <div>
                                  <h4 className="font-bold text-xs sm:text-sm tracking-tight text-brand-green uppercase line-clamp-1 group-hover:text-brand-accent transition-colors font-sans">
                                    {film.title}
                                  </h4>
                                  <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed font-sans">
                                    {film.logline || film.synopsis}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-sans border-t border-gray-150 pt-1.5 sm:pt-2 mt-auto">
                                  <span className="flex items-center gap-0.5 text-brand-accent font-bold"><Heart size={8} sm:size={10} className="fill-current text-brand-accent" /> {film.likes}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMyList(film.id);
                                    }}
                                    className="text-[8px] sm:text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded px-2 py-0.5 transition-colors"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CATEGORY 1: TRENDING & POPULER */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase text-brand-green tracking-wider sm:tracking-widest border-l-4 border-brand-accent pl-2.5 sm:pl-3 font-sans">
                          Trending & Populer
                        </h3>
                        <span className="text-[9px] font-sans text-gray-500 tracking-wider font-semibold">Geser &rarr;</span>
                      </div>
                      <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[...films].sort((a,b) => b.views - a.views).slice(0, 5).map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-white border border-gray-200 hover:border-brand-accent/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-sm snap-start"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-sans font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-white/95 border border-gray-200 text-brand-accent rounded-full shadow-sm">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-white ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 bg-white">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-brand-green uppercase line-clamp-1 group-hover:text-brand-accent transition-colors font-sans">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed font-sans">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-sans border-t border-gray-150 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-accent font-bold"><Heart size={8} sm:size={10} className="fill-current" /> {film.likes}</span>
                                <span className="flex items-center gap-0.5"><Eye size={8} sm:size={10} /> {film.views}</span>
                                <span>{film.duration}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CATEGORY 2: DRAMALOGUE (Genre: Drama or Romantis) */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase text-brand-green tracking-wider sm:tracking-widest border-l-4 border-brand-accent pl-2.5 sm:pl-3 font-sans">
                          Drama & Kisah Hangat
                        </h3>
                        <span className="text-[9px] font-sans text-gray-500 tracking-wider font-semibold">Geser &rarr;</span>
                      </div>
                      <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                        {films.filter(f => f.genre === 'Drama' || f.genre === 'Romantis').map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-white border border-gray-200 hover:border-brand-accent/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-sm snap-start"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-sans font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-white/95 border border-gray-200 text-brand-accent rounded-full shadow-sm">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-white ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 bg-white">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-brand-green uppercase line-clamp-1 group-hover:text-brand-accent transition-colors font-sans">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed font-sans">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-sans border-t border-gray-150 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-accent font-bold"><Heart size={8} sm:size={10} className="fill-current" /> {film.likes}</span>
                                <span className="flex items-center gap-0.5"><Eye size={8} sm:size={10} /> {film.views}</span>
                                <span>{film.duration}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CATEGORY 3: FIKSI ILMIAH & AKSI */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase text-brand-green tracking-wider sm:tracking-widest border-l-4 border-brand-accent pl-2.5 sm:pl-3 font-sans">
                          Fiksi Ilmiah, Aksi & Horor
                        </h3>
                        <span className="text-[9px] font-sans text-gray-500 tracking-wider font-semibold">Geser &rarr;</span>
                      </div>
                      <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                        {films.filter(f => ['Fiksi Ilmiah', 'Aksi', 'Horor'].includes(f.genre)).map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-white border border-gray-200 hover:border-brand-accent/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-sm snap-start"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-sans font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-white/95 border border-gray-200 text-brand-accent rounded-full shadow-sm">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-white ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 bg-white">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-brand-green uppercase line-clamp-1 group-hover:text-brand-accent transition-colors font-sans">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed font-sans">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-sans border-t border-gray-150 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-accent font-bold"><Heart size={8} sm:size={10} className="fill-current" /> {film.likes}</span>
                                <span className="flex items-center gap-0.5"><Eye size={8} sm:size={10} /> {film.views}</span>
                                <span>{film.duration}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CATEGORY 4: SEMUA KARYA SINEAS (Full Grid list of films) */}
                    <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                      <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase text-brand-green tracking-wider sm:tracking-widest border-l-4 border-brand-accent pl-2.5 sm:pl-3 font-sans">
                        Koleksi Eksklusif Bioskop Velora
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
                        {films.map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="bg-white border border-gray-200 hover:border-brand-accent/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col h-full hover:-translate-y-1 shadow-sm"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <span className="absolute top-2 left-2 text-[7.5px] sm:text-[8px] font-sans font-extrabold uppercase py-0.5 px-1.5 bg-white/95 border border-gray-200 text-brand-accent rounded">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-white ml-0.5" />
                                </span>
                              </div>
                            </div>
                             <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between bg-white">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-brand-green uppercase line-clamp-1 group-hover:text-brand-accent transition-colors font-sans">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed font-sans">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-gray-400 font-sans border-t border-gray-150 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-accent font-bold">
                                  <Heart size={8} className={likedFilmIds.includes(film.id) ? "fill-current text-brand-accent animate-pulse" : "fill-current"} /> {film.likes}
                                </span>
                                <span className="flex items-center gap-0.5"><Eye size={8} /> {film.views}</span>
                                <span>{film.duration}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}

          </div>

        </div>
      ) : (
        /* NETFLIX SCREENING SUBMISSION STUDIO */
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-gray-150 shadow-lg space-y-8">
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#F1F8F6] border border-brand-accent/20 rounded-xl shadow-sm">
                <MovieIcon size={24} className="text-brand-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-brand-green uppercase tracking-wider font-sans">REGISTRASI SELEKSI KARYA</h1>
                <p className="text-xs text-brand-accent font-sans font-semibold tracking-wide">Publikasikan karya film pendek Anda di etalase bioskop virtual Velora</p>
              </div>
            </div>

            <form onSubmit={handleSubmitFilm} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section A: Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Judul Film *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Senandung Senja di Kedai Kopi"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                  />
                </div>

                {/* Section B: Genre */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Genre Film *</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 font-sans"
                  >
                    <option value="Drama">Drama</option>
                    <option value="Aksi">Aksi</option>
                    <option value="Komedi">Komedi</option>
                    <option value="Fiksi Ilmiah">Fiksi Ilmiah</option>
                    <option value="Horor">Horor</option>
                    <option value="Romantis">Romantis</option>
                    <option value="Dokumenter">Dokumenter</option>
                    <option value="Animasi">Animasi</option>
                  </select>
                </div>
              </div>

              {/* Logline */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Logline Singkat (Menarik perhatian)</label>
                  <span className="text-[10px] text-gray-400 font-semibold font-sans">Maks. 120 Karakter</span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={logline}
                  onChange={(e) => setLogline(e.target.value)}
                  placeholder="Contoh: Kisah hangat pertemuan kembali dua sahabat lama di kedai kopi hangat saat senja."
                  className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                />
              </div>

              {/* Synopsis */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Sinopsis Lengkap *</label>
                <textarea
                  required
                  rows={4}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Jelaskan alur narasi pendek film Anda secara lengkap dan menggugah emosi penonton..."
                  className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Director */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Sutradara / Director *</label>
                  <input
                    type="text"
                    required
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="Sutradara utama"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Durasi Film (Menit) *</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Contoh: 15 Menit"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                  />
                </div>

                {/* Release Year */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Tahun Produksi</label>
                  <input
                    type="text"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    placeholder="Contoh: 2026"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                  />
                </div>
              </div>

              {/* Cast Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700 font-sans">Pemeran Utama (Pisahkan dengan Koma)</label>
                <input
                  type="text"
                  value={castInput}
                  onChange={(e) => setCastInput(e.target.value)}
                  placeholder="Contoh: Nicholas Saputra, Dian Sastrowardoyo, Joe Taslim"
                  className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                />
              </div>

              {/* LAND OF POSTER/COVER SUBMISSION */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-brand-green tracking-wide font-sans">Poster / Cover Film *</span>
                  <div className="flex bg-gray-200 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setCoverOption('upload')}
                      className={`px-3 py-1 text-[10px] font-sans font-bold rounded cursor-pointer ${coverOption === 'upload' ? 'bg-brand-accent text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Unggah File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverOption('url')}
                      className={`px-3 py-1 text-[10px] font-sans font-bold rounded cursor-pointer ${coverOption === 'url' ? 'bg-brand-accent text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Tautan URL
                    </button>
                  </div>
                </div>

                {coverOption === 'upload' ? (
                  <div className="space-y-3">
                    {uploadedCoverUrl ? (
                      <div className="flex items-center gap-4 bg-[#F1F8F6] border border-brand-accent/25 p-3 rounded-xl">
                        <img src={uploadedCoverUrl} alt="Cover Preview" className="w-16 h-[90px] object-cover rounded-lg border border-gray-200" />
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-sans text-brand-accent">Poster Berhasil Terunggah!</span>
                          <p className="text-[10px] text-gray-500 truncate max-w-[280px]">{uploadedCoverUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedCoverUrl('')}
                          className="ml-auto text-xs font-bold text-rose-500 hover:text-rose-600 font-sans"
                        >
                          Ubah
                        </button>
                      </div>
                    ) : (
                      <div 
                        {...getCoverProps()} 
                        className="border-2 border-dashed border-gray-300 hover:border-brand-accent p-6 rounded-2xl text-center cursor-pointer hover:bg-white transition-all text-gray-500"
                      >
                        <input {...getCoverInputProps()} />
                        <Upload size={24} className="mx-auto text-brand-accent mb-2" />
                        <span className="text-xs font-bold block text-gray-700">Seret & lepas pamflet poster di sini</span>
                        <span className="text-[10px] text-gray-400">Maksimal 10MB (JPG, PNG)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={coverUrlInput}
                    onChange={(e) => setCoverUrlInput(e.target.value)}
                    placeholder="https://contoh.com/gambarku.png"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                  />
                )}
              </div>

              {/* LAND OF VIDEO SUBMISSION */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-brand-green tracking-wide font-sans">File Film / Sumber Video *</span>
                    <p className="text-[9px] text-gray-400 font-semibold">Video player sangat ramah dengan tautan YouTube, Vimeo, maupun berkas langsung (.mp4)</p>
                  </div>
                  <div className="flex bg-gray-200 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setVideoOption('upload')}
                      className={`px-3 py-1 text-[10px] font-sans font-bold rounded cursor-pointer ${videoOption === 'upload' ? 'bg-brand-accent text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Unggah File
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoOption('url')}
                      className={`px-3 py-1 text-[10px] font-sans font-bold rounded cursor-pointer ${videoOption === 'url' ? 'bg-brand-accent text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Tautan URL
                    </button>
                  </div>
                </div>

                {videoOption === 'upload' ? (
                  <div className="space-y-3">
                    {uploadedVideoUrl ? (
                      <div className="flex items-center gap-4 bg-[#F1F8F6] border border-brand-accent/25 p-4 rounded-xl">
                        <FileVideo className="text-brand-accent" size={24} />
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-sans text-brand-accent">Film Berhasil Terunggah!</span>
                          <p className="text-[10px] text-gray-500 truncate max-w-[280px]">{uploadedVideoUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedVideoUrl('')}
                          className="ml-auto text-xs font-bold text-rose-500 hover:text-rose-600 font-sans"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      <div 
                        {...getVideoProps()} 
                        className="border-2 border-dashed border-gray-300 hover:border-brand-accent p-8 rounded-2xl text-center cursor-pointer hover:bg-white transition-all text-gray-500"
                      >
                        <input {...getVideoInputProps()} />
                        <Film size={28} className="mx-auto text-brand-accent mb-2" />
                        <span className="text-xs font-bold block text-gray-750">Silakan seret & lepas klip video movie di sini</span>
                        <span className="text-[10px] text-gray-400">Maksimal 500MB (MP4, WEBM, MOV)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ (bisa link Youtube / Vimeo / Direktori .mp4)"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-brand-accent focus:border-brand-accent rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent/20 transition-all text-gray-950 placeholder:text-gray-400 font-sans"
                  />
                )}
              </div>

              {/* Progress Bar of active files uploading */}
              {isUploadingFile && (
                <div className="p-4 bg-[#F1F8F6] border border-brand-accent/20 rounded-xl space-y-2 animate-pulse">
                  <div className="flex justify-between items-center text-xs font-sans font-bold">
                    <span className="text-brand-accent flex items-center gap-1.5 font-bold">
                      <Loader className="animate-spin text-brand-accent" size={12} />
                      Sedang memproses unggahan {uploadingTarget === 'cover' ? 'pamflet poster' : 'film pendek'} Anda...
                    </span>
                    <span className="text-brand-accent">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Submit */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setCurrentView('catalog')}
                  className="px-5 py-3 text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-sans font-bold uppercase transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFile}
                  className="px-6 py-3 text-xs bg-brand-accent hover:bg-brand-green text-white font-sans font-bold uppercase tracking-widest rounded-xl shadow-sm active:scale-95 disabled:scale-100 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
                >
                  Tayangkan Film Sekarang
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DETAILED CINEMATIC MODAL PLAYER OVERLAY */}
      {selectedFilm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-start md:items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white border border-gray-200 w-full max-w-4xl md:max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row md:h-[85vh] md:max-h-[750px] my-auto animate-fade-in z-50">
            
            {/* Modal Header Cover / Film Screening (Left Pane on Desktop) */}
            <div className="relative bg-gray-50 flex flex-col md:w-[58%] md:h-full md:border-r md:border-gray-200 shrink-0 select-none overflow-hidden">
              {showAuthRequiredLock ? (
                /* Gembok Bioskop Terkunci Screen */
                <div className="relative w-full aspect-video md:aspect-auto md:h-full bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                  <div className="absolute inset-0">
                    <img src={selectedFilm.coverUrl} className="w-full h-full object-cover opacity-15 blur-sm" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/80 to-gray-50"></div>
                  </div>
                  
                  {/* Backdrop Close Action */}
                  <button
                    onClick={() => setSelectedFilm(null)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-brand-accent text-white hover:bg-brand-green rounded-full border border-transparent transition-all cursor-pointer shadow-md z-20"
                  >
                    <X size={16} />
                  </button>

                  <div className="relative z-10 space-y-3 sm:space-y-4 max-w-md flex flex-col items-center my-auto px-4">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-[#F1F8F6] text-brand-accent rounded-full flex items-center justify-center border border-brand-accent/30 ring-4 sm:ring-8 ring-brand-accent/5">
                      <Lock size={20} sm:size={28} className="text-brand-accent" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-brand-green uppercase tracking-wider font-sans">Bioskop Velora Terkunci</h4>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1 leading-relaxed font-sans">
                        Fitur penayangan seluruh mahakarya sineas Rumah Adiksi Kreatif hanya dapat diakses oleh anggota resmi yang sudah masuk log (Sign In) di halaman Profil.
                      </p>
                    </div>
                    <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setShowAuthRequiredLock(false);
                          addNotification("Silakan klik tombol 'Masuk' di sudut kanan atas menu utama.");
                        }}
                        className="px-4 py-2 text-[9px] sm:text-[10px] font-sans font-bold uppercase bg-brand-accent text-white rounded-lg hover:bg-brand-green active:scale-95 transition-all text-center cursor-pointer shadow-sm"
                      >
                        Cara Log In
                      </button>
                      <button
                        onClick={() => {
                          setShowAuthRequiredLock(false);
                        }}
                        className="px-4 py-2 text-[9px] sm:text-[10px] font-sans font-bold uppercase bg-gray-100 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-200 active:scale-95 transition-all text-center cursor-pointer"
                      >
                        Kembali ke Info
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-video md:aspect-auto md:h-full md:flex-1">
                  <img src={selectedFilm.coverUrl} alt={selectedFilm.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Backdrop Close Action */}
                  <button
                    onClick={() => setSelectedFilm(null)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-brand-accent text-white hover:bg-brand-green rounded-full border border-transparent transition-all cursor-pointer shadow-lg z-10"
                  >
                    <X size={16} />
                  </button>

                  {/* Centered Big Play Action */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setShowAuthRequiredLock(true);
                          addNotification("Silakan masuk menggunakan menu Profil terlebih dahulu untuk menonton film.");
                        } else {
                          setIsPlaying(true);
                        }
                      }}
                      className="h-12 w-12 sm:h-16 sm:w-16 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:shadow-brand-accent/30 active:scale-95 transition-all text-center cursor-pointer border-2 sm:border-4 border-white group/plat"
                    >
                      <Play size={18} className="fill-current text-white ml-1 transform group-hover/plat:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Informative Grid Context (Right Pane on Desktop) */}
            <div className="md:w-[42%] md:h-full md:overflow-y-auto bg-white flex flex-col scrollbar-none relative shrink-0">
              {/* Desktop Close Button in Right Panel for convenience */}
              <button
                onClick={() => setSelectedFilm(null)}
                className="hidden md:flex absolute top-5 right-5 p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-brand-accent rounded-full border border-gray-200 transition-all cursor-pointer z-35"
                title="Tutup Detil"
              >
                <X size={14} />
              </button>

              <div className="p-5 sm:p-7 md:p-8 space-y-6">
                
                <div className="flex flex-col gap-6">
                  
                  {/* Film Core Text */}
                  <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] bg-brand-accent text-white font-sans font-bold uppercase px-2 py-0.5 rounded">
                      {selectedFilm.genre}
                    </span>
                    <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 font-sans font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} className="text-brand-accent" /> {selectedFilm.duration}
                    </span>
                    <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 font-sans font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar size={10} className="text-brand-accent" /> {selectedFilm.releaseYear}
                    </span>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-extrabold text-brand-green uppercase tracking-tight font-sans">
                    {selectedFilm.title}
                  </h3>

                  {/* Mobil Share Block (Disimpan di bagian paling atas pada mode mobile) */}
                  <div className="md:hidden">
                    {renderShareBlock(selectedFilm)}
                  </div>

                  <p className="text-xs text-brand-accent font-sans font-bold uppercase tracking-wider italic">
                    &ldquo;{selectedFilm.logline || selectedFilm.title}&rdquo;
                  </p>

                  <p className="text-sm text-gray-600 leading-relaxed font-sans pt-1">
                    {selectedFilm.synopsis}
                  </p>
                </div>

                {/* Right Metadata Side */}
                <div className="w-full flex flex-col gap-4">
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 space-y-4 font-sans text-xs w-full">
                    <div className="space-y-1">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Sutradara:</span>
                      <span className="text-brand-green text-xs font-bold">{selectedFilm.director}</span>
                    </div>

                    {selectedFilm.cast && selectedFilm.cast.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Pemeran Utama:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedFilm.cast.map((actor, idx) => (
                            <span key={idx} className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-[10px] text-gray-600 inline-block font-sans font-medium">
                              {actor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Sumber Unggahan:</span>
                      <span className="text-brand-accent text-[10px] font-bold">oleh {selectedFilm.uploaderName}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-gray-500">
                        <span className="flex items-center gap-1 text-[10px]"><Eye size={11} /> {selectedFilm.views + (isPlaying ? 1 : 0)} views</span>
                        <button
                          onClick={(e) => handleLikeFilm(selectedFilm, e)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 border font-bold uppercase tracking-wider text-[9.5px] rounded-lg transition-all active:scale-95 cursor-pointer ${
                            likedFilmIds.includes(selectedFilm.id)
                              ? 'bg-brand-accent text-white border-brand-accent hover:bg-brand-green outline-none'
                              : 'bg-[#F1F8F6] hover:bg-brand-accent/20 border-brand-accent/20 hover:border-brand-accent/40 text-brand-accent'
                          }`}
                        >
                          <ThumbsUp size={10} className={likedFilmIds.includes(selectedFilm.id) ? "fill-current" : ""} /> {likedFilmIds.includes(selectedFilm.id) ? "Disukai" : "Suka"} ({selectedFilm.likes})
                        </button>
                      </div>

                      <button
                        onClick={(e) => toggleMyList(selectedFilm.id, e)}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 border font-bold uppercase tracking-widest text-[9.5px] rounded-lg transition-all active:scale-95 cursor-pointer ${
                          myListIds.includes(selectedFilm.id)
                            ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/40'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {myListIds.includes(selectedFilm.id) ? (
                          <>
                            <Check size={11} className="text-brand-accent" /> ✓ Di Daftar Saya
                          </>
                        ) : (
                          <>
                            <Plus size={11} /> + Daftar Saya
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Desktop Share Block (hanya ditampilkan pada mode desktop) */}
                  <div className="hidden md:block w-full">
                    {renderShareBlock(selectedFilm)}
                  </div>
                </div>

              </div>

              {/* Review & Comment Section */}
              <div className="pt-6 border-t border-gray-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold uppercase text-brand-green tracking-wider border-l-4 border-brand-accent pl-2.5 font-sans">
                      Ulasan & Rating Sineas
                    </h4>
                    <p className="text-[10px] text-gray-500 font-sans font-semibold mt-0.5">
                      Ekspresi penonton untuk karya Rumah Adiksi Kreatif
                    </p>
                  </div>

                  {/* Summary Rating Badge */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-150 px-3 py-1.5 rounded-lg text-xs font-sans text-gray-700 font-semibold">
                    <span className="text-gray-500">Rerata Rating:</span>
                    {selectedFilm.reviews && selectedFilm.reviews.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-brand-gold text-sm">
                          {(selectedFilm.reviews.reduce((sum, r) => sum + r.rating, 0) / selectedFilm.reviews.length).toFixed(1)}
                        </span>
                        <div className="flex text-brand-gold text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>
                              {i < Math.round(selectedFilm.reviews!.reduce((sum, r) => sum + r.rating, 0) / selectedFilm.reviews!.length) ? "★" : "☆"}
                            </span>
                          ))}
                        </div>
                        <span className="text-gray-500">({selectedFilm.reviews.length})</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">Belum ada rating</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Left Column: Form to Write a Review */}
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
                    <h5 className="text-xs font-extrabold uppercase text-brand-green tracking-widest font-sans">
                      Tulis Ulasan Anda
                    </h5>

                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      {/* Name input */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wider mb-1">
                          Nama Anda
                        </label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="Masukkan nama asli atau samaran"
                          required
                          className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-950 focus:outline-none focus:border-brand-accent transition-colors font-sans"
                        />
                      </div>

                      {/* Stars Rating Selector */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wider mb-1">
                          Berikan Rating: <span className="text-brand-accent font-bold">{reviewRating} Bintang</span>
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="text-2xl hover:scale-125 transition-transform duration-100 focus:outline-none cursor-pointer"
                            >
                              <span className={star <= reviewRating ? "text-brand-accent" : "text-gray-300"}>
                                ★
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wider mb-1">
                          Kolom Ulasan
                        </label>
                        <textarea
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Opini sinematis, pujian, atau kritik membangun..."
                          required
                          className="w-full text-xs bg-white border border-gray-200 rounded-xl p-3 text-gray-950 placeholder-gray-400 focus:outline-none focus:border-brand-accent transition-colors font-sans leading-relaxed"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full py-2.5 bg-brand-accent hover:bg-brand-green text-white rounded-xl text-xs font-bold uppercase active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingReview ? (
                          <>
                            <Loader size={12} className="animate-spin" /> Mengirim...
                          </>
                        ) : (
                          "Kirim Ulasan"
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Reviews List Feed */}
                  <div className="w-full flex flex-col justify-stretch">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-extrabold uppercase text-brand-green tracking-widest font-sans">
                        Daftar Komentar Penonton ({selectedFilm.reviews ? selectedFilm.reviews.length : 0})
                      </h5>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-1 space-y-4 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
                      {selectedFilm.reviews && selectedFilm.reviews.length > 0 ? (
                        [...selectedFilm.reviews]
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((rev) => (
                            <div 
                              key={rev.id} 
                              className="border-b border-white/5 last:border-0 pb-3 last:pb-0 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-800 font-sans">
                                  {rev.authorName}
                                </span>
                                <div className="text-[10px] text-gray-400 font-sans">
                                  {new Date(rev.timestamp).toLocaleDateString("id-ID", {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>

                              {/* Rating display */}
                              <div className="flex items-center gap-1.5">
                                <div className="flex text-brand-accent text-xs">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <span key={idx} className="leading-none text-[11px]">
                                      {idx < rev.rating ? "★" : "☆"}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-brand-accent font-sans font-bold">({rev.rating}/5)</span>
                              </div>

                              <p className="text-xs text-gray-600 font-sans leading-relaxed pt-1 whitespace-pre-wrap">
                                {rev.comment}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-10 text-center space-y-2">
                          <MovieIcon className="text-brand-accent/55 animate-pulse" size={24} />
                          <div className="text-xs text-gray-500 font-sans font-bold">Belum ada tanggapan untuk film ini.</div>
                          <p className="text-[10px] text-gray-400 max-w-xs font-sans">
                            Jadilah kritikus sinema pertama yang memberikan nilai terbaik!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="pt-5 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}${window.location.pathname}?tab=velora&video=${selectedFilm.id}`;
                      navigator.clipboard.writeText(shareUrl);
                      addNotification("Tautan film Rumah Adiksi telah disalin ke papan klip!");
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase transition-all font-sans hover:text-brand-accent hover:border-brand-accent cursor-pointer"
                  >
                    <Share2 size={12} /> Salin Tautan Rumah Adiksi
                  </button>
                </div>

                <button
                  onClick={() => setSelectedFilm(null)}
                  className="px-5 py-2.5 bg-brand-accent hover:bg-brand-green active:scale-95 text-white rounded-xl text-xs font-bold uppercase transition-colors font-sans cursor-pointer"
                >
                  Tutup Layar
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>
      )}

      {/* NETFLIX-STYLE FULLSCREEN IMMERSIVE CINEMA PLAYER */}
      {selectedFilm && isPlaying && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in select-none">
          {/* Black Screen Backdrop */}
          <div className="absolute inset-0 bg-[#020202] z-0"></div>

          {/* Immersive Video Stage */}
          <div className="relative w-full h-full z-10 flex items-center justify-center">
            
            <div className="w-full h-full relative flex items-center justify-center">
              {selectedFilm.videoUrl.includes('youtube.com') || selectedFilm.videoUrl.includes('youtu.be') ? (
                (() => {
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                  const match = selectedFilm.videoUrl.match(regExp);
                  const videoId = (match && match[2].length === 11) ? match[2] : null;
                  if (videoId) {
                    return (
                      <iframe 
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&hd=1`}
                        className="w-full h-full absolute inset-0 border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    );
                  }
                  return <div className="text-gray-400 font-mono text-xs">Video YouTube tidak dapat dimuat.</div>;
                })()
              ) : selectedFilm.videoUrl.includes('vimeo.com') ? (
                (() => {
                  const regExp = /vimeo\.com\/([0-9]+)/;
                  const match = selectedFilm.videoUrl.match(regExp);
                  if (match) {
                    return (
                      <iframe 
                        src={`https://player.vimeo.com/video/${match[1]}?autoplay=1&color=d4af37&api=1&title=0&byline=0&portrait=0`}
                        className="w-full h-full absolute inset-0 border-0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    );
                  }
                  return <div className="text-gray-400 font-mono text-xs">Video Vimeo tidak dapat dimuat.</div>;
                })()
              ) : (
                <div 
                  className="w-full h-full relative group/player flex items-center justify-center cursor-pointer"
                  onTouchStart={(e) => {
                    const now = Date.now();
                    const timeDiff = now - lastTouchTimeRef.current;
                    if (timeDiff < 300) {
                      const touchX = e.touches[0].clientX;
                      const screenWidth = window.innerWidth;
                      if (videoRef.current) {
                        if (touchX < screenWidth / 2) {
                          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                          setCurrentTime(videoRef.current.currentTime);
                          addNotification("⏮️ Mundur 10 Detik");
                        } else {
                          videoRef.current.currentTime = Math.min((videoRef.current.duration || 9999), videoRef.current.currentTime + 10);
                          setCurrentTime(videoRef.current.currentTime);
                          addNotification("⏭️ Maju 10 Detik");
                        }
                      }
                    }
                    lastTouchTimeRef.current = now;
                  }}
                >
                  <video 
                    ref={videoRef}
                    src={selectedFilm.videoUrl}
                    autoPlay
                    className="w-full h-full bg-black object-contain transition-all duration-300"
                    referrerPolicy="no-referrer"
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      setCurrentTime(video.currentTime);
                      setDurationTime(video.duration || 0);
                      
                      // Accurate watch progress simulation every 2 seconds for micro-precision (Comfort Assist)
                      if (Math.abs(video.currentTime - lastSavedTimeRef.current) >= 2) {
                        lastSavedTimeRef.current = video.currentTime;
                        const progress = Math.min(99, Math.round((video.currentTime / (video.duration || 1)) * 100));
                        updateWatchHistory(selectedFilm, progress);
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const dur = video.duration || 0;
                      setDurationTime(dur);
                      
                      // Seamless seek-resume matching history
                      const historyItem = watchHistory.find(h => h.filmId === selectedFilm.id);
                      if (historyItem && historyItem.progressPercent > 1 && historyItem.progressPercent < 95) {
                        const targetTime = (historyItem.progressPercent / 100) * dur;
                        video.currentTime = targetTime;
                        lastSavedTimeRef.current = targetTime;
                        addNotification(`Melanjutkan pemutaran dari ${formatPlayerTime(targetTime)} (${historyItem.progressPercent}%)`);
                      } else {
                        lastSavedTimeRef.current = 0;
                      }
                    }}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onCanPlay={() => setIsBuffering(false)}
                    onSeeked={() => setIsBuffering(false)}
                    style={{ filter: `brightness(${cinemaAmbient})` }}
                  />

                  {/* PREMIUM CINEMA BUFFERING INDICATOR INTERCEPT */}
                  {isBuffering && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-none animate-fade-in">
                      <div className="relative flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full border-4 border-white/10 border-t-brand-gold animate-spin"></div>
                        <Tv className="absolute text-brand-gold animate-pulse" size={18} />
                      </div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-[#f59e0b] uppercase mt-4">Memutar Pita Seluloid...</span>
                    </div>
                  )}

                  {/* CUSTOM INTEGRATED SUBTITLE RENDERER (NETFLIX STYLE) */}
                  {getSubtitlesText(currentTime, selectedFilm.genre) && (
                    <div className="absolute bottom-20 sm:bottom-28 md:bottom-36 left-1/2 -translate-x-1/2 z-35 max-w-xl text-center px-4 py-1.5 sm:py-2 bg-black/75 rounded-md border border-white/5 animate-fade-in pointer-events-none shadow-2xl">
                      <p className="text-xs sm:text-sm md:text-base font-medium tracking-wide text-yellow-300 font-sans select-none drop-shadow-lg text-center leading-relaxed">
                        {getSubtitlesText(currentTime, selectedFilm.genre)}
                      </p>
                    </div>
                  )}

                  {/* SKIP INTRO FLOATING ACTION (Active from 4s to 30s of elapsed video) */}
                  {currentTime > 4 && currentTime < 30 && (
                    <button
                      onClick={handleSkipIntro}
                      className="absolute right-6 sm:right-12 bottom-24 sm:bottom-32 z-35 flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 bg-black/80 hover:bg-brand-gold hover:text-black hover:border-brand-gold text-white border border-white/20 rounded font-mono font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-2xl active:scale-95 cursor-pointer"
                    >
                      <RotateCw size={12} className="animate-spin-slow" /> Lewati Intro
                    </button>
                  )}

                  {/* PLAYBACK INTERACTIVE OVERLAYS */}
                  <div className={`absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-t from-black/60 via-transparent to-black/60 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* Floating Center Playback Gesture Assist */}
                    <div className="flex items-center justify-center my-auto gap-8">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                            setCurrentTime(videoRef.current.currentTime);
                          }
                        }}
                        className="p-3 bg-black/40 hover:bg-black/80 hover:scale-110 active:scale-90 text-white rounded-full transition-all border border-white/10 cursor-pointer"
                        title="Mundur 10 Detik"
                      >
                        <RotateCcw size={20} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                            if (videoRef.current.paused) {
                              videoRef.current.play();
                            } else {
                              videoRef.current.pause();
                            }
                          }
                        }}
                        className="p-5 bg-brand-gold hover:bg-brand-gold/90 hover:scale-110 active:scale-90 text-black rounded-full transition-all border border-black/40 shadow-xl shadow-brand-gold/15 cursor-pointer"
                        title="Putar / Jeda"
                      >
                        {videoRef.current?.paused ? (
                          <Play size={24} className="fill-current text-black ml-0.5" />
                        ) : (
                          <span className="text-black font-extrabold text-sm font-mono">II</span>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.min((videoRef.current.duration || 9999), videoRef.current.currentTime + 10);
                            setCurrentTime(videoRef.current.currentTime);
                          }
                        }}
                        className="p-3 bg-black/40 hover:bg-black/80 hover:scale-110 active:scale-90 text-white rounded-full transition-all border border-white/10 cursor-pointer"
                        title="Maju 10 Detik"
                      >
                        <RotateCw size={20} />
                      </button>
                    </div>

                    {/* NETFLIX-STYLE STREAMLINED CINEMATICS CONTROL PANEL */}
                    <div className="space-y-4 w-full max-w-5xl mx-auto bg-black/75 border border-white/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xl mt-auto relative">
                      
                      {/* Floating Settings Tooltip Popover Panel */}
                      {showGearSettings && (
                        <div className="absolute right-4 bottom-24 z-40 bg-[#0c0d12]/95 border border-white/10 backdrop-blur-lg p-5 rounded-xl w-64 sm:w-72 shadow-2xl space-y-4 text-[11px] font-mono animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                            <span className="text-brand-gold font-extrabold uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                              <Settings size={12} className="animate-spin-slow" /> PENGATURAN BIOSKOP
                            </span>
                            <button 
                              onClick={() => setShowGearSettings(false)}
                              className="text-gray-400 hover:text-white transition-colors text-xs font-sans"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Subtitles Option Selection */}
                          <div className="space-y-1.5">
                            <span className="text-gray-400 uppercase text-[9px] font-bold block mb-1 font-sans">Teks Terjemahan (Subtitles)</span>
                            <div className="grid grid-cols-3 gap-1">
                              {['Off', 'Indonesian', 'English'].map((sub) => (
                                <button
                                  key={sub}
                                  onClick={() => {
                                    setActiveSubtitle(sub);
                                    addNotification(`Teks terjemahan disetel ke: ${sub}`);
                                  }}
                                  className={`py-1 text-[9px] font-bold rounded text-center transition-all cursor-pointer ${
                                    activeSubtitle === sub 
                                      ? 'bg-brand-gold text-black border border-brand-gold font-black' 
                                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                                  }`}
                                >
                                  {sub === 'Indonesian' ? 'Indo' : sub}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Playback speed Selection */}
                          <div className="space-y-1.5">
                            <span className="text-gray-400 uppercase text-[9px] font-bold block mb-1 font-sans">Kecepatan Putar (Speed)</span>
                            <div className="grid grid-cols-5 gap-1">
                              {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => {
                                    setPlaybackSpeed(speed);
                                    addNotification(`Kecepatan putar disetel ke: ${speed}x`);
                                  }}
                                  className={`py-1 text-[9px] font-bold rounded text-center transition-all cursor-pointer ${
                                    playbackSpeed === speed 
                                      ? 'bg-brand-gold text-black border border-brand-gold font-black' 
                                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                                  }`}
                                >
                                  {speed === 1.0 ? '1x' : `${speed}x`}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cinema Ambient Screen Brightness Dimmer */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-gray-400 text-[10px] font-sans">
                              <span className="font-bold flex items-center gap-1 uppercase text-[8px]"><Sun size={10} className="text-brand-gold" /> Dimmer Lampu Ambient</span>
                              <span className="font-mono text-[9px]">{Math.round(cinemaAmbient * 100)}%</span>
                            </div>
                            <input 
                              type="range"
                              min={0.15}
                              max={1.0}
                              step={0.05}
                              value={cinemaAmbient}
                              onChange={(e) => setCinemaAmbient(Number(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-gold"
                            />
                          </div>
                        </div>
                      )}

                      {/* Accurate Progress Scrubber Bar */}
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group/bar">
                          <div 
                            className="bg-brand-gold h-full rounded-full relative transition-all duration-75"
                            style={{ width: `${(currentTime / (durationTime || 1)) * 100}%` }}
                          />
                          <input 
                            type="range"
                            min={0}
                            max={durationTime || 100}
                            value={currentTime}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (videoRef.current) {
                                videoRef.current.currentTime = value;
                                setCurrentTime(value);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-gray-400">
                          <span>{formatPlayerTime(currentTime)}</span>
                          <span>{formatPlayerTime(durationTime)}</span>
                        </div>
                      </div>

                      {/* Decentered Controls Buttons Dock */}
                      <div className="flex flex-wrap items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-4 sm:gap-6">
                          
                          {/* Play/Pause Button inside bottom bar */}
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                if (videoRef.current.paused) {
                                  videoRef.current.play();
                                } else {
                                  videoRef.current.pause();
                                }
                              }
                            }}
                            className="text-white hover:text-brand-gold transition-colors p-1 flex items-center justify-center cursor-pointer"
                            title="Putar / Jeda"
                          >
                            {videoRef.current?.paused ? (
                              <Play size={15} className="fill-current text-white" />
                            ) : (
                              <span className="font-extrabold font-mono text-sm tracking-tighter">II</span>
                            )}
                          </button>

                          {/* Quick skip buttons back/forward */}
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                                setCurrentTime(videoRef.current.currentTime);
                              }
                            }}
                            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Mundur 10s"
                          >
                            <RotateCcw size={15} />
                          </button>

                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = Math.min((videoRef.current.duration || 9999), videoRef.current.currentTime + 10);
                                setCurrentTime(videoRef.current.currentTime);
                              }
                            }}
                            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Maju 10s"
                          >
                            <RotateCw size={15} />
                          </button>

                          {/* Volume controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsMuted(prev => !prev)}
                              className="text-gray-300 hover:text-brand-gold p-1 transition-colors cursor-pointer"
                              title={isMuted ? "Suara Nyala" : "Bisukan"}
                            >
                              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                            <input 
                              type="range"
                              min={0}
                              max={1}
                              step={0.1}
                              value={cinemaVolume}
                              onChange={(e) => setCinemaVolume(Number(e.target.value))}
                              className="w-16 sm:w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-gold"
                            />
                          </div>
                        </div>

                        {/* Right side controls: Settings gear, and layout tools */}
                        <div className="flex items-center gap-3">
                          
                          {/* Gear Menu Toggle */}
                          <button
                            onClick={() => setShowGearSettings(prev => !prev)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                              showGearSettings ? 'text-brand-gold border-brand-gold/40 bg-brand-gold/10' : 'text-gray-300 border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                            title="Pengaturan Bioskop"
                          >
                            <Settings size={15} className={showGearSettings ? "animate-spin-slow text-brand-gold" : "text-gray-300"} />
                          </button>

                          {/* Fullscreen layout trigger */}
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                if (!document.fullscreenElement) {
                                  videoRef.current.requestFullscreen().catch(() => {});
                                } else {
                                  document.exitFullscreen().catch(() => {});
                                }
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-brand-gold/50 text-gray-300 hover:text-brand-gold rounded font-mono font-bold transition-all text-[10.5px] cursor-pointer"
                          >
                            <Maximize2 size={11} /> LAYAR LEBAR
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Cinematic Vignette Shadows overlay - pointer-events-none so users can play iframe underneath */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none z-15" />

            {/* NETFLIX-STYLE TOP PLAYER CONTROL BAR */}
            <div 
              className={`absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/95 via-black/60 to-transparent px-4 py-4 sm:px-6 sm:py-6 md:px-16 md:py-10 flex items-center gap-3.5 sm:gap-5 transition-all duration-500 ease-in-out transform ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
              }`}
            >
              {/* Cinematic Back Button */}
              <button
                onClick={() => setIsPlaying(false)}
                className="p-2.5 sm:p-4 bg-white/15 hover:bg-brand-gold text-white hover:text-black rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center cursor-pointer shadow-black hover:shadow-brand-gold/20 shadow-xl border border-white/10"
              >
                <ArrowLeft size={18} sm:size={24} className="stroke-[2.5]" />
              </button>

              {/* Film Title and Meta metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mb-0.5 sm:mb-1">
                  <span className="text-[7.5px] sm:text-[9px] font-black uppercase text-brand-gold font-mono tracking-widest bg-brand-gold/15 px-1.5 py-0.5 rounded border border-brand-gold/20">
                    SINEAS VELORA
                  </span>
                  <span className="text-[8px] sm:text-[10px] bg-red-600/10 border border-red-500/25 px-1.5 py-0.5 font-mono text-red-400 font-bold rounded uppercase tracking-wider scale-95 origin-left">
                    {selectedFilm.genre}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-gray-405 font-bold text-gray-450">
                    &bull; {selectedFilm.duration} &bull; {selectedFilm.releaseYear}
                  </span>
                </div>
                <h1 className="text-sm sm:text-xl md:text-3.5xl font-black text-white uppercase tracking-tight truncate drop-shadow-md leading-tight">
                  {selectedFilm.title}
                </h1>
                <p className="text-[9.5px] sm:text-[11px] md:text-xs text-gray-400 font-mono truncate">
                  Disutradarai oleh <span className="text-white font-bold text-gray-300">{selectedFilm.director}</span>
                  {selectedFilm.cast && selectedFilm.cast.length > 0 && (
                    <span className="text-gray-500 hidden xs:inline"> &bull; Pemeran: <span className="text-gray-300 font-sans">{selectedFilm.cast.join(', ')}</span></span>
                  )}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="hidden xs:flex items-center gap-2 sm:gap-3 text-[9px] sm:text-xs font-mono text-gray-400 bg-black/40 border border-white/5 py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg backdrop-blur">
                <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-brand-gold"></span>
                </span>
                <span className="text-brand-gold font-bold tracking-wider sm:tracking-widest scale-95 sm:scale-100 origin-right">BIOSKOP ULTRA-HD</span>
              </div>
            </div>

            {/* NETFLIX-STYLE BOTTOM STREAM STATISTICS HUD */}
            <div 
              className={`absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 py-6 sm:px-6 sm:py-8 md:px-16 md:py-12 flex flex-col gap-2.5 sm:gap-4 transition-all duration-500 ease-in-out transform ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-[10px] sm:text-xs text-gray-450 font-mono">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-400">
                  <span className="text-brand-gold font-bold bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/15">Velora Player</span>
                  <span className="h-2.5 w-px bg-white/10 hidden sm:inline"></span>
                  <span className="text-gray-350 hidden sm:inline text-gray-400">Kurasi Resmi oleh Rumah Adiksi Kreatif</span>
                  <span className="h-2.5 w-px bg-white/10 hidden sm:inline"></span>
                  <span className="text-gray-350 text-gray-400">Pengunggah: {selectedFilm.uploaderName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[8.5px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest text-emerald-400 font-mono">Penayangan Resmi Aktif</span>
                </div>
              </div>

              {/* Dynamic Synopsis / Logline quote display */}
              <div className="border-l-2 sm:border-l-4 border-brand-gold pl-3 sm:pl-4 max-w-3xl py-0.5 transform translate-x-1">
                <p className="text-[11px] sm:text-xs md:text-sm text-gray-200 font-sans leading-relaxed italic line-clamp-2 sm:line-clamp-none">
                  &ldquo;{selectedFilm.logline || selectedFilm.synopsis}&rdquo;
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
