import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Film, Upload, CheckCircle, AlertTriangle, Loader, FileVideo, X, 
  Play, Info, ThumbsUp, Eye, Calendar, Clock, Sparkles, Plus, 
  Share2, ArrowLeft, Maximize2, Search, Film as MovieIcon, Heart, ChevronRight, User, Tv, Lock
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { upload } from '@imagekit/react';
import { collection, getDocs, addDoc, doc, updateDoc, increment, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { VeloraFilm } from '../types';

interface Props {
  addNotification: (message: string) => void;
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

export default function VeloraAdiksi({ addNotification }: Props) {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [showAuthRequiredLock, setShowAuthRequiredLock] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#07080a] text-white font-sans selection:bg-brand-gold selection:text-black">
      {/* Cinematic Banner Header */}
      <div className="border-b border-white/5 bg-black/80 sm:bg-black/40 backdrop-blur-md sticky top-0 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-tr from-brand-gold to-yellow-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-brand-gold/10 ring-1 ring-brand-gold/45">
                <Tv className="text-black" size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-xl font-black tracking-widest text-brand-gold font-mono">VELORA</span>
                  <span className="text-[9px] sm:text-xs uppercase bg-white/10 px-1.5 py-0.5 rounded text-gray-300 font-mono font-bold">ADIKSI</span>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-400 tracking-wider">Cinematic Virtual Theatre & Sineas Hub</p>
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
                  className="p-2 bg-gradient-to-r from-brand-gold to-yellow-600 text-black rounded-lg active:scale-95 transition-all text-center whitespace-nowrap shadow-sm flex items-center justify-center"
                  title="Unggah Karya"
                >
                  <Plus size={15} className="stroke-[3]" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="p-2 bg-white/5 border border-white/10 text-white rounded-lg active:scale-95 transition-all flex items-center justify-center"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {currentView === 'catalog' && (
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2 sm:top-2.5 text-gray-500" size={13} />
                <input
                  type="text"
                  placeholder="Cari film, genre, sutradara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg pl-8 pr-4 py-1.5 sm:py-2 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-500 font-mono"
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
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-brand-gold to-yellow-600 text-black rounded-lg hover:shadow-lg hover:shadow-brand-gold/20 hover:brightness-110 active:scale-95 transition-all text-center whitespace-nowrap font-mono"
                >
                  <Plus size={14} className="stroke-[3]" /> Unggah Karya
                </button>
              ) : (
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg active:scale-95 transition-all font-mono"
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
                  className="w-full h-full object-cover transform scale-102 group-hover:scale-105 transition-transform duration-10000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#07080a] via-transparent to-transparent"></div>
              </div>

              {/* Front Info Content */}
              <div className="relative max-w-7xl mx-auto w-full px-4 pb-8 sm:pb-12 z-10">
                <div className="max-w-2xl space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase py-0.5 px-2 bg-brand-gold text-black rounded-sm tracking-widest font-mono">FEATURED SCREENING</span>
                    <span className="text-[9px] sm:text-[10px] bg-white/10 border border-white/20 py-0.5 px-2 rounded-full text-white font-mono font-medium">{heroFilm.genre}</span>
                  </div>

                  <h2 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase drop-shadow-md leading-none">
                    {heroFilm.title}
                  </h2>

                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-mono tracking-wider italic font-medium line-clamp-1">
                    &ldquo;{heroFilm.logline || heroFilm.synopsis}&rdquo;
                  </p>

                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3">
                    {heroFilm.synopsis}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-gray-400 font-mono border-l-2 border-brand-gold/40 pl-2.5">
                    <span className="flex items-center gap-1"><User size={10} className="text-brand-gold" /> {heroFilm.director}</span>
                    <span className="text-gray-600 hidden xs:inline">&bull;</span>
                    <span className="flex items-center gap-1"><Clock size={10} className="text-brand-gold" /> {heroFilm.duration}</span>
                    <span className="text-gray-600 hidden xs:inline">&bull;</span>
                    <span className="flex items-center gap-1"><Calendar size={10} className="text-brand-gold" /> {heroFilm.releaseYear}</span>
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
                      className="flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 sm:py-3 bg-white text-black font-bold uppercase tracking-wider rounded-lg text-[11px] sm:text-xs hover:bg-brand-gold transition-colors shadow-lg active:scale-95 font-mono cursor-pointer"
                    >
                      <Play size={14} className="fill-current text-black" /> Tonton Sekarang
                    </button>
                    <button
                      onClick={() => handleOpenFilm(heroFilm)}
                      className="flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-3 bg-white/10 border border-white/10 text-white font-bold uppercase tracking-wider rounded-lg text-[11px] sm:text-xs hover:bg-white/20 transition-all active:scale-95 font-mono cursor-pointer"
                    >
                      <Info size={14} /> Detail
                    </button>
                    <button
                      onClick={(e) => handleLikeFilm(heroFilm, e)}
                      className={`p-2 sm:p-3 border rounded-lg transition-all group/btn cursor-pointer ${
                        likedFilmIds.includes(heroFilm.id)
                          ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                          : 'bg-white/5 border-white/10 hover:border-brand-gold hover:bg-brand-gold/10 hover:text-brand-gold text-gray-400'
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
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader className="animate-spin text-brand-gold" size={32} />
                <p className="text-xs text-mono text-gray-400">Menghidupkan Proyektor Velora...</p>
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
                    {/* CATEGORY 1: TRENDING & POPULER */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-lg md:text-xl font-black uppercase text-white tracking-wider sm:tracking-widest border-l-4 border-brand-gold pl-2.5 sm:pl-3">
                          Trending & Populer
                        </h3>
                        <span className="text-[9px] font-mono text-gray-500 tracking-wider">Geser &rarr;</span>
                      </div>
                      <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[...films].sort((a,b) => b.views - a.views).slice(0, 5).map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-[#0f1013] border border-white/5 hover:border-brand-gold/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-xl snap-start"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-black">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-mono font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-black/70 border border-white/10 text-brand-gold rounded-full">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-black ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white uppercase line-clamp-1 group-hover:text-brand-gold transition-colors">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-400 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-mono border-t border-white/5 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-gold"><Heart size={8} sm:size={10} className="fill-current" /> {film.likes}</span>
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
                        <h3 className="text-sm sm:text-lg md:text-xl font-black uppercase text-white tracking-wider sm:tracking-widest border-l-4 border-brand-gold pl-2.5 sm:pl-3">
                          Drama & Kisah Hangat
                        </h3>
                        <span className="text-[9px] font-mono text-gray-500 tracking-wider">Geser &rarr;</span>
                      </div>
                      <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                        {films.filter(f => f.genre === 'Drama' || f.genre === 'Romantis').map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-[#0f1013] border border-white/5 hover:border-brand-gold/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-xl snap-start"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-black">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-mono font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-black/70 border border-white/10 text-white rounded-full">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-black ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white uppercase line-clamp-1 group-hover:text-brand-gold transition-colors">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-400 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-mono border-t border-white/5 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-gold"><Heart size={8} sm:size={10} className="fill-current" /> {film.likes}</span>
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
                        <h3 className="text-sm sm:text-lg md:text-xl font-black uppercase text-white tracking-wider sm:tracking-widest border-l-4 border-brand-gold pl-2.5 sm:pl-3">
                          Fiksi Ilmiah, Aksi & Horor
                        </h3>
                        <span className="text-[9px] font-mono text-gray-500 tracking-wider">Geser &rarr;</span>
                      </div>
                      <div className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]">
                        {films.filter(f => ['Fiksi Ilmiah', 'Aksi', 'Horor'].includes(f.genre)).map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="w-[155px] xs:w-[195px] sm:w-[280px] shrink-0 bg-[#0f1013] border border-white/5 hover:border-brand-gold/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-xl snap-start"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-black">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[7.5px] sm:text-[9.5px] font-mono font-bold uppercase py-0.5 px-1.5 sm:px-2 bg-black/70 border border-white/10 text-white rounded-full">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-black ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white uppercase line-clamp-1 group-hover:text-brand-gold transition-colors">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-400 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-mono border-t border-white/5 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-gold"><Heart size={8} sm:size={10} className="fill-current" /> {film.likes}</span>
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
                      <h3 className="text-sm sm:text-lg md:text-xl font-black uppercase text-white tracking-wider sm:tracking-widest border-l-4 border-brand-gold pl-2.5 sm:pl-3">
                        Koleksi Eksklusif Bioskop Velora
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
                        {films.map((film) => (
                          <div 
                            key={film.id}
                            onClick={() => handleOpenFilm(film)}
                            className="bg-[#0f1013] border border-white/5 hover:border-brand-gold/40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col h-full hover:-translate-y-1 shadow-lg"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-black">
                              <img src={film.coverUrl} alt={film.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                              <span className="absolute top-2 left-2 text-[7.5px] sm:text-[8px] font-mono font-extrabold uppercase py-0.5 px-1.5 bg-black/70 border border-white/10 text-brand-gold rounded">
                                {film.genre}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 sm:scale-100 group-hover:scale-100 transition-all duration-300">
                                  <Play size={14} className="fill-current text-black ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white uppercase line-clamp-1 group-hover:text-brand-gold transition-colors">
                                  {film.title}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 sm:line-clamp-2 mt-0.5 mb-1.5 leading-relaxed">
                                  {film.logline || film.synopsis}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-gray-400 font-mono border-t border-white/5 pt-1.5 sm:pt-2 mt-auto">
                                <span className="flex items-center gap-0.5 text-brand-gold">
                                  <Heart size={8} className={likedFilmIds.includes(film.id) ? "fill-red-500 text-red-500 animate-pulse" : "fill-current"} /> {film.likes}
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
          <div className="bg-slate-900/40 p-6 sm:p-10 rounded-2xl border border-white/10 shadow-2xl space-y-8 backdrop-blur-md">
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-xl shadow-lg shadow-brand-gold/10 ring-1 ring-brand-gold/30">
                <MovieIcon size={24} className="text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-wider">REGISTRASI SELEKSI KARYA</h1>
                <p className="text-xs text-brand-gold font-mono tracking-wider">Publikasikan karya film pendek Anda di etalase bioskop virtual netflix Velora</p>
              </div>
            </div>

            <form onSubmit={handleSubmitFilm} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section A: Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Judul Film *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Senandung Senja di Bandung"
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                  />
                </div>

                {/* Section B: Genre */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Genre Film *</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white font-mono"
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
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Logline Singkat (Menarik perhatian)</label>
                  <span className="text-[10px] text-gray-500">Maks. 120 Karakter</span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={logline}
                  onChange={(e) => setLogline(e.target.value)}
                  placeholder="Contoh: Cinta lama bersemi kembali di kedai kopi sunyi bawah guyuran hujan badai."
                  className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                />
              </div>

              {/* Synopsis */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Sinopsis Lengkap *</label>
                <textarea
                  required
                  rows={4}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Jelaskan alur narasi pendek film Anda secara lengkap dan menggugah emosi penonton..."
                  className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Director */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Sutradara / Director *</label>
                  <input
                    type="text"
                    required
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="Sutradara utama"
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Durasi Film (Menit) *</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Contoh: 15 Menit"
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                  />
                </div>

                {/* Release Year */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Tahun Produksi</label>
                  <input
                    type="text"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    placeholder="Contoh: 2026"
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                  />
                </div>
              </div>

              {/* Cast Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-300 font-mono">Pemeran Utama (Pisahkan dengan Koma)</label>
                <input
                  type="text"
                  value={castInput}
                  onChange={(e) => setCastInput(e.target.value)}
                  placeholder="Contoh: Nicholas Saputra, Dian Sastrowardoyo, Joe Taslim"
                  className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                />
              </div>

              {/* LAND OF POSTER/COVER SUBMISSION */}
              <div className="bg-black/30 p-5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-brand-gold tracking-wide font-mono">Poster / Cover Film *</span>
                  <div className="flex bg-white/5 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setCoverOption('upload')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded ${coverOption === 'upload' ? 'bg-brand-gold text-black' : 'text-gray-400'}`}
                    >
                      Unggah File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverOption('url')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded ${coverOption === 'url' ? 'bg-brand-gold text-black' : 'text-gray-400'}`}
                    >
                      Tautan URL
                    </button>
                  </div>
                </div>

                {coverOption === 'upload' ? (
                  <div className="space-y-3">
                    {uploadedCoverUrl ? (
                      <div className="flex items-center gap-4 bg-lime-950/20 border border-lime-500/20 p-3 rounded-lg">
                        <img src={uploadedCoverUrl} alt="Cover Preview" className="w-16 h-[90px] object-cover rounded border border-white/10" />
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-mono text-lime-400">Poster Berhasil Terunggah!</span>
                          <p className="text-[10px] text-gray-500 truncate max-w-[280px]">{uploadedCoverUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedCoverUrl('')}
                          className="ml-auto text-xs font-bold text-red-400 hover:text-red-300 font-mono"
                        >
                          Ubah
                        </button>
                      </div>
                    ) : (
                      <div 
                        {...getCoverProps()} 
                        className="border-2 border-dashed border-white/10 hover:border-brand-gold/50 p-6 rounded-xl text-center cursor-pointer hover:bg-white/5 transition-all text-gray-400"
                      >
                        <input {...getCoverInputProps()} />
                        <Upload size={24} className="mx-auto text-brand-gold mb-2" />
                        <span className="text-xs font-bold block">Seret & lepas pamflet poster di sini</span>
                        <span className="text-[10px] text-gray-500">Maksimal 10MB (JPG, PNG)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={coverUrlInput}
                    onChange={(e) => setCoverUrlInput(e.target.value)}
                    placeholder="https://contoh.com/gambarku.png"
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                  />
                )}
              </div>

              {/* LAND OF VIDEO SUBMISSION */}
              <div className="bg-black/30 p-5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-brand-gold tracking-wide font-mono">File Film / Sumber Video *</span>
                    <p className="text-[9px] text-gray-500">Video player sangat ramah dengan tautan YouTube, Vimeo, maupun berkas langsung (.mp4)</p>
                  </div>
                  <div className="flex bg-white/5 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setVideoOption('upload')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded ${videoOption === 'upload' ? 'bg-brand-gold text-black' : 'text-gray-400'}`}
                    >
                      Unggah File (Max 500MB)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoOption('url')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded ${videoOption === 'url' ? 'bg-brand-gold text-black' : 'text-gray-400'}`}
                    >
                      Tautan URL / Youtube
                    </button>
                  </div>
                </div>

                {videoOption === 'upload' ? (
                  <div className="space-y-3">
                    {uploadedVideoUrl ? (
                      <div className="flex items-center gap-4 bg-lime-950/20 border border-lime-500/20 p-4 rounded-lg">
                        <FileVideo className="text-brand-gold" size={24} />
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-mono text-lime-400">Film Berhasil Terunggah!</span>
                          <p className="text-[10px] text-gray-500 truncate max-w-[280px]">{uploadedVideoUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedVideoUrl('')}
                          className="ml-auto text-xs font-bold text-red-400 hover:text-red-300 font-mono"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      <div 
                        {...getVideoProps()} 
                        className="border-2 border-dashed border-white/10 hover:border-brand-gold/50 p-8 rounded-xl text-center cursor-pointer hover:bg-white/5 transition-all text-gray-400"
                      >
                        <input {...getVideoInputProps()} />
                        <Film size={28} className="mx-auto text-brand-gold mb-2" />
                        <span className="text-xs font-bold block">Silakan seret & lepas klip video movie di sini</span>
                        <span className="text-[10px] text-gray-500">Maksimal 500MB (MP4, WEBM, MOV)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ (bisa link Youtube / Vimeo / Direktori .mp4)"
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-brand-gold/50 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/20 transition-all text-white placeholder:text-gray-600 font-mono"
                  />
                )}
              </div>

              {/* Progress Bar of active files uploading */}
              {isUploadingFile && (
                <div className="p-4 bg-black/60 border border-white/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-brand-gold flex items-center gap-1.5 animate-pulse">
                      <Loader className="animate-spin text-brand-gold" size={12} />
                      Sedang memproses unggahan {uploadingTarget === 'cover' ? 'pamflet poster' : 'film pendek'} Anda...
                    </span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-brand-gold h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Submit */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentView('catalog')}
                  className="px-5 py-3 text-xs bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg font-mono font-bold uppercase transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFile}
                  className="px-6 py-3 text-xs bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-mono font-black uppercase tracking-widest rounded-lg shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 hover:brightness-110 transition-all active:scale-95 disabled:scale-100 disabled:opacity-55 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md flex items-start justify-center p-2.5 sm:p-4">
          <div className="bg-[#0b0c0f] border border-white/15 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto animate-fade-in z-50">
            
            {/* Modal Header Cover / Film Screening */}
            <div className="relative bg-black flex flex-col">
              {showAuthRequiredLock ? (
                /* Gembok Bioskop Terkunci Screen */
                <div className="relative w-full aspect-video bg-[#07080a] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                  <div className="absolute inset-0">
                    <img src={selectedFilm.coverUrl} className="w-full h-full object-cover opacity-20 blur-sm animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f] via-black/80 to-[#0b0c0f]"></div>
                  </div>
                  
                  {/* Backdrop Close Action */}
                  <button
                    onClick={() => setSelectedFilm(null)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-black/60 text-white hover:bg-black hover:text-brand-gold rounded-full border border-white/10 hover:border-brand-gold/30 transition-all cursor-pointer shadow-lg z-20"
                  >
                    <X size={16} />
                  </button>

                  <div className="relative z-10 space-y-3 sm:space-y-4 max-w-md flex flex-col items-center my-auto px-4">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-tr from-brand-gold/20 to-yellow-600/20 text-brand-gold rounded-full flex items-center justify-center border border-brand-gold/30 ring-4 sm:ring-8 ring-brand-gold/5">
                      <Lock size={20} sm:size={28} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">Bioskop Velora Terkunci</h4>
                      <p className="text-[10px] sm:text-[11px] text-gray-405 mt-1 leading-relaxed font-sans text-gray-400">
                        Fitur penayangan seluruh mahakarya sineas Rumah Adiksi Kreatif hanya dapat diakses oleh anggota resmi yang sudah masuk log (Sign In) di halaman Profil.
                      </p>
                    </div>
                    <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setShowAuthRequiredLock(false);
                          addNotification("Silakan klik tombol 'Masuk' di sudut kanan atas menu utama.");
                        }}
                        className="px-4 py-2 text-[9px] sm:text-[10px] font-mono font-bold uppercase bg-brand-gold text-black rounded-lg hover:brightness-110 active:scale-95 transition-all animate-pulse text-center"
                      >
                        Cara Log In
                      </button>
                      <button
                        onClick={() => {
                          setShowAuthRequiredLock(false);
                        }}
                        className="px-4 py-2 text-[9px] sm:text-[10px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 active:scale-95 transition-all text-center"
                      >
                        Kembali ke Info
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-video">
                  <img src={selectedFilm.coverUrl} alt={selectedFilm.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f] via-black/20 to-transparent"></div>
                  
                  {/* Backdrop Close Action */}
                  <button
                    onClick={() => setSelectedFilm(null)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-black/60 text-white hover:bg-black hover:text-brand-gold rounded-full border border-white/10 hover:border-brand-gold/30 transition-all cursor-pointer shadow-lg z-10"
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
                      className="h-12 w-12 sm:h-16 sm:w-16 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:shadow-brand-gold/30 active:scale-95 transition-all text-center cursor-pointer border-2 sm:border-4 border-black group/plat"
                    >
                      <Play size={18} className="fill-current text-black ml-1 transform group-hover/plat:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Informative Grid Context */}
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                
                {/* Film Core Text */}
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] bg-brand-gold text-black font-mono font-black uppercase px-2 py-0.5 rounded">
                      {selectedFilm.genre}
                    </span>
                    <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} className="text-brand-gold" /> {selectedFilm.duration}
                    </span>
                    <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar size={10} className="text-brand-gold" /> {selectedFilm.releaseYear}
                    </span>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                    {selectedFilm.title}
                  </h3>

                  <p className="text-xs text-brand-gold font-mono font-bold uppercase tracking-wider italic">
                    &ldquo;{selectedFilm.logline || selectedFilm.title}&rdquo;
                  </p>

                  <p className="text-sm text-gray-300 leading-relaxed font-sans pt-1">
                    {selectedFilm.synopsis}
                  </p>
                </div>

                {/* Right Metadata Side */}
                <div className="w-full md:w-64 bg-white/5 border border-white/5 rounded-xl p-5 space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Sutradara:</span>
                    <span className="text-white text-xs font-bold">{selectedFilm.director}</span>
                  </div>

                  {selectedFilm.cast && selectedFilm.cast.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Pemeran Utama:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFilm.cast.map((actor, idx) => (
                          <span key={idx} className="bg-white/5 border border-white/5 rounded px-2 py-0.5 text-[10px] text-gray-300 inline-block font-sans font-medium">
                            {actor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Sumber Unggahan:</span>
                    <span className="text-brand-gold text-[10px] font-bold">oleh {selectedFilm.uploaderName}</span>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-gray-400">
                    <span className="flex items-center gap-1"><Eye size={12} /> {selectedFilm.views + (isPlaying ? 1 : 0)} views</span>
                    <button
                      onClick={(e) => handleLikeFilm(selectedFilm, e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border font-bold uppercase tracking-wider text-[10px] rounded transition-all active:scale-95 cursor-pointer ${
                        likedFilmIds.includes(selectedFilm.id)
                          ? 'bg-brand-gold text-black border-brand-gold hover:brightness-110'
                          : 'bg-brand-gold/10 hover:bg-brand-gold/25 border-brand-gold/30 hover:border-brand-gold/70 text-brand-gold'
                      }`}
                    >
                      <ThumbsUp size={11} className={likedFilmIds.includes(selectedFilm.id) ? "fill-current" : ""} /> {likedFilmIds.includes(selectedFilm.id) ? "Tersimpan" : "Suka"} ({selectedFilm.likes})
                    </button>
                  </div>
                </div>

              </div>

              {/* Review & Comment Section */}
              <div className="pt-6 border-t border-white/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-black uppercase text-white tracking-wider border-l-4 border-brand-gold pl-2.5">
                      Ulasan & Rating Sineas
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Ekspresi penonton untuk karya Rumah Adiksi Kreatif
                    </p>
                  </div>

                  {/* Summary Rating Badge */}
                  <div className="flex items-center gap-2 bg-[#0f1013] border border-white/5 px-3 py-1.5 rounded-lg text-xs font-mono">
                    <span className="text-gray-400">Rerata Rating:</span>
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

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Form to Write a Review */}
                  <div className="md:col-span-5 bg-[#0f1013] border border-white/5 rounded-xl p-4 sm:p-5 space-y-4">
                    <h5 className="text-xs font-extrabold uppercase text-white tracking-widest font-mono">
                      Tulis Ulasan Anda
                    </h5>

                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      {/* Name input */}
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                          Nama Anda
                        </label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="Masukkan nama asli atau samaran"
                          required
                          className="w-full text-xs bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold transition-colors"
                        />
                      </div>

                      {/* Stars Rating Selector */}
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                          Berikan Rating: <span className="text-brand-gold font-bold">{reviewRating} Bintang</span>
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="text-2xl hover:scale-125 transition-transform duration-100 focus:outline-none cursor-pointer"
                            >
                              <span className={star <= reviewRating ? "text-brand-gold" : "text-gray-600"}>
                                ★
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                          Kolom Ulasan
                        </label>
                        <textarea
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Opini sinematis, pujian, atau kritik membangun..."
                          required
                          className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors font-sans leading-relaxed"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full py-2 bg-brand-gold text-black rounded-lg text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                  <div className="md:col-span-7 flex flex-col justify-stretch">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-extrabold uppercase text-white tracking-widest font-mono">
                        Daftar Komentar Penonton ({selectedFilm.reviews ? selectedFilm.reviews.length : 0})
                      </h5>
                    </div>

                    <div className="bg-[#0f1013]/30 border border-white/5 rounded-xl p-4 flex-1 space-y-4 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                      {selectedFilm.reviews && selectedFilm.reviews.length > 0 ? (
                        [...selectedFilm.reviews]
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((rev) => (
                            <div 
                              key={rev.id} 
                              className="border-b border-white/5 last:border-0 pb-3 last:pb-0 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-300 font-sans">
                                  {rev.authorName}
                                </span>
                                <div className="text-[10px] text-gray-500 font-mono">
                                  {new Date(rev.timestamp).toLocaleDateString("id-ID", {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>

                              {/* Rating display */}
                              <div className="flex items-center gap-1.5">
                                <div className="flex text-brand-gold text-xs">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <span key={idx} className="leading-none text-[11px]">
                                      {idx < rev.rating ? "★" : "☆"}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-brand-gold font-mono font-bold">({rev.rating}/5)</span>
                              </div>

                              <p className="text-xs text-gray-400 font-sans leading-relaxed pt-1 whitespace-pre-wrap">
                                {rev.comment}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-10 text-center space-y-2">
                          <MovieIcon className="text-gray-600 animate-pulse" size={24} />
                          <div className="text-xs text-gray-500 font-mono">Belum ada tanggapan untuk film ini.</div>
                          <p className="text-[10px] text-gray-600 max-w-xs">
                            Jadilah kritikus sinema pertama yang memberikan nilai terbaik!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFilm.videoUrl);
                      addNotification("Tautan video telah disalin ke papan klip!");
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 rounded-lg text-xs font-bold uppercase transition-all font-mono"
                  >
                    <Share2 size={12} /> Salin Tautan Video
                  </button>
                </div>

                <button
                  onClick={() => setSelectedFilm(null)}
                  className="px-5 py-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:brightness-110 active:scale-95 text-black rounded-lg text-xs font-bold uppercase transition-colors font-mono"
                >
                  Tutup Layar
                </button>
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
                <video 
                  src={selectedFilm.videoUrl}
                  controls 
                  autoPlay
                  className="w-full h-full bg-black object-contain absolute inset-0"
                  referrerPolicy="no-referrer"
                />
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
