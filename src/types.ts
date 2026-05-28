/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GalleryItem {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  type: 'painting' | 'music' | 'photography' | 'craft' | 'digital';
  price?: number; // Optional, some artworks are up for sale
  description: string;
  imageUrl: string;
  isSold?: boolean;
  likes: number;
  views: number;
  createdDate: string;
}

export interface Talent {
  id: string;
  name: string;
  field: string;
  bio: string;
  avatarUrl: string;
  location: string;
  skills: string[];
  portfolioIds: string[];
  socialMedia: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
}

export interface ShopItemReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'coffee' | 'matcha' | 'tea' | 'merchandise';
  price: number;
  description: string;
  imageUrl: string;
  rating: number;
  stock: number;
  isMerch?: boolean;
  journeyStory?: string;
  reviews?: ShopItemReview[];
}

export interface CartItem {
  id: string; // unique cart item id (e.g., prodId + spec)
  itemType: 'shop' | 'gallery';
  itemId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  details?: string; // size, variant, etc.
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorUid?: string; // Firebase Auth User UID to track ownership
  authorField: string;
  authorAvatar: string;
  title: string;
  content: string;
  group: 'Diskusi' | 'Kolaborasi' | 'Workshop' | 'Karya';
  timestamp: string;
  likes: number;
  likedByCurrentUser?: boolean;
  comments: {
    id: string;
    authorName: string;
    authorUid?: string;
    content: string;
    timestamp: string;
  }[];
  imageUrl?: string;
  muralLocation?: string;
  rolesNeeded?: string[];
  workshopTime?: string;
  workshopFee?: string;
  workshopQuota?: string;
  artworkMedium?: string;
  registeredParticipants?: string[];
  collaborativeMembers?: { [role: string]: string };
  artworkRatings?: { id: string; authorName: string; authorUid?: string; score: number; feedback: string; timestamp: string }[];
  meetUri?: string;
  meetTitle?: string;
  isMeetPost?: boolean;
}

export interface ArtEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: 'Pameran' | 'Konser' | 'Workshop' | 'Bazaar';
  bannerUrl: string;
  registeredCount: number;
  isRegistered?: boolean;
}

export interface VeloraFilm {
  id: string;
  title: string;
  synopsis: string;
  logline?: string;
  genre: string;
  coverUrl: string;
  videoUrl: string;
  director: string;
  releaseYear: string;
  duration: string;
  cast: string[];
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
  likes: number;
  views: number;
  reviews?: {
    id: string;
    authorName: string;
    authorUid?: string;
    rating: number;
    comment: string;
    timestamp: string;
  }[];
}
