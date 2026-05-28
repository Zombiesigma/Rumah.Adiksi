/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GalleryItem, Talent, ShopItem, CommunityPost, ArtEvent } from './types';

export const INITIAL_TALENTS: Talent[] = [
  {
    id: 't1',
    name: 'Bayu Samudra',
    field: 'Seni Lukis Kontemporer',
    bio: 'Pelukis ekspresionis yang menangkap pergerakan ombak Pelabuhan Ratu dan kehidupan nelayan tradisional di atas kanvas raksasa.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    location: 'Pelabuhan Ratu - Citepus',
    skills: ['Cat Minyak', 'Seni Akrilik', 'Mural Pesisir', 'Seni Sketsa'],
    portfolioIds: ['g1', 'g5'],
    socialMedia: {
      instagram: 'bayu_samudra_art',
      tiktok: 'bayusamudra.paint'
    }
  },
  {
    id: 't2',
    name: 'Rian Citepus',
    field: 'Musik & Balada Pesisir',
    bio: 'Penyanyi-penulis lagu indie folk yang terinspirasi dari desau angin laut selatan. Mengembangkan sekolah musik gratis bagi pemuda pelabuhan.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    location: 'Pelabuhan Ratu - Pantai Citepus',
    skills: ['Acoustic Guitar', 'Vokal', 'Songwriting', 'Musik Harmonika'],
    portfolioIds: ['g2'],
    socialMedia: {
      instagram: 'rian.citepus',
      youtube: 'RianCitepusOfficial'
    }
  },
  {
    id: 't3',
    name: 'Siti Ayu Larasati',
    field: 'Kriya Kayu Hanyut & Kerang',
    bio: 'Pengrajin ramah lingkungan yang mendaur ulang kayu hanyut (driftwood) yang terdampar di pantai Sukabumi menjadi furnitur artistik dan patung eksklusif.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    location: 'Pelabuhan Ratu - Cisolok',
    skills: ['Ukiran Kayu', 'Seni Kriya Logam', 'Desain Interior Organik', 'Restorasi Bahan'],
    portfolioIds: ['g4'],
    socialMedia: {
      instagram: 'larasati.driftwood',
      tiktok: 'larasati_kriya'
    }
  },
  {
    id: 't4',
    name: 'Ahmad Karanghawu',
    field: 'Fotografi Lanskap Laut Belakang',
    bio: 'Fotografer petualangan berspesialisasi dalam astrofotografi di atas karang-karang ikonik Karanghawu serta pemotretan peselancar profesional Cimaja.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    location: 'Pelabuhan Ratu - Karang Hawu',
    skills: ['Fotografi Lanskap', 'Drone Shot', 'Astrofotografi', 'Lightroom Grading'],
    portfolioIds: ['g3', 'g6'],
    socialMedia: {
      instagram: 'ahmad_karanghawu_photo'
    }
  },
  {
    id: 't5',
    name: 'Fajar Cimaja',
    field: 'Desain Grafis & Seni Digital',
    bio: 'Animator dan desainer grafis yang memadukan kultur selancar Cimaja dengan sentuhan ilustrasi cyber-art modern Indonesia.',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
    location: 'Pelabuhan Ratu - Cimaja',
    skills: ['Ilustrasi Vector', 'Branding Komunitas', 'Motion Graphics', 'UI/UX Design'],
    portfolioIds: [],
    socialMedia: {
      instagram: 'fajar.cimaja.creative',
      tiktok: 'fajar_cimaja'
    }
  }
];

export const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'g1',
    title: 'Harmoni Debur Ombak Cimaja',
    artistId: 't1',
    artistName: 'Bayu Samudra',
    type: 'painting',
    price: 3500000,
    description: 'Lukisan cat minyak berskala masif mengekspresikan dinamika gulungan ombak Cimaja yang terkenal di kalangan peselancar internasional. Dicat dengan teknik pisau palet tebal yang memberikan tekstur 3D nyata dari busa laut.',
    imageUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=800&q=80', // Beautiful painterly sea wave
    isSold: false,
    likes: 124,
    views: 546,
    createdDate: '2026-04-12'
  },
  {
    id: 'g2',
    title: 'Balada Kidung Pantai Citepus',
    artistId: 't2',
    artistName: 'Rian Citepus',
    type: 'music',
    price: 150000, // digital album download & support
    description: 'Album musik akustik berisi 8 lagu balada eksklusif tentang kehidupan, cinta, dan harapan pemuda di bibir pantai Pelabuhan Ratu. Setiap trek diiringi sapuan suara rekaman alam bising ombak laut selatan yang menenangkan.',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80', // Guitar on the shore
    isSold: false,
    likes: 89,
    views: 312,
    createdDate: '2026-05-01'
  },
  {
    id: 'g3',
    title: 'Malam Berbintang di Karang Hawu',
    artistId: 't4',
    artistName: 'Ahmad Karanghawu',
    type: 'photography',
    price: 1200000, // Printed and Framed Large Photo
    description: 'Foto bentangan Galaksi Bima Sakti (Milky Way) yang melengkung indah tepat di atas formasi tebing karang mistis Pantai Karang Hawu. Membutuhkan waktu eksposur sepanjang 30 detik untuk menangkap detail kilau kosmik.',
    imageUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80', // Beautiful starry night sky
    isSold: false,
    likes: 156,
    views: 890,
    createdDate: '2026-03-22'
  },
  {
    id: 'g4',
    title: 'Lentera Nelayan dari Akar Jati Hanyut',
    artistId: 't3',
    artistName: 'Siti Ayu Larasati',
    type: 'craft',
    price: 2100000,
    description: 'Lampu hias fungsional yang dibentuk dari serpihan akar pohon jati purba yang terbawa ombak pantai selatan dan terdampar di Cisolok. Dilengkapi fitting bohlam Edison hangat untuk memancarkan aura seni pesisir yang magis.',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', // Beautiful rustic wood lamp
    isSold: true,
    likes: 95,
    views: 405,
    createdDate: '2026-04-29'
  },
  {
    id: 'g5',
    title: 'Perahu Cadik di Bawah Langit Lembayung',
    artistId: 't1',
    artistName: 'Bayu Samudra',
    type: 'painting',
    price: 4200000,
    description: 'Lukisan akrilik cerah yang menggambarkan formasi kapal cadik tradisional bercadik laut selatan yang sedang bersandar di bawah siraman cahaya matahari terbenam (golden hour) Pelabuhan Ratu.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80', // Vibrant artistic painting
    isSold: false,
    likes: 210,
    views: 1120,
    createdDate: '2026-05-10'
  },
  {
    id: 'g6',
    title: 'Peselancar Menembus Gulungan Ombak',
    artistId: 't4',
    artistName: 'Ahmad Karanghawu',
    type: 'photography',
    price: 850000, // Standard print
    description: 'Aksi dramatis peselancar lokal menunggangi ombak besar (barrel wave) di bibir Pantai Cimaja, ditangkap menggunakan lensa telephoto dengan percikan air laut yang tajam beku di udara.',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80', // Surfing dynamic action
    isSold: false,
    likes: 147,
    views: 654,
    createdDate: '2026-05-18'
  }
];

export const INITIAL_SHOP_ITEMS: ShopItem[] = [
  // COFFEE
  {
    id: 's1',
    name: 'Kopi Nusantara Jampang (Single Origin)',
    category: 'coffee',
    price: 35000,
    description: 'Biji kopi Arabika yang ditanam di dataran tinggi Jampang Sukabumi selatan. Dipanggang medium untuk menonjolkan cita rasa buah tropis, keasaman manis sedang, dan sentuhan aroma cokelat kelapa laut.',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=500&q=80', // Coffee cup with beans
    rating: 4.8,
    stock: 25
  },
  {
    id: 's2',
    name: 'Rumah Adiksi Signature Cold Brew',
    category: 'coffee',
    price: 28000,
    description: 'Kopi seduh dingin selama 16 jam menggunakan racikan signature kami. Rasa halus (smooth), kaya rasa, disajikan dingin dengan sirup karamel bakar buatan sendiri dari gula aren lokal.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80', // Cold brew iced coffee
    rating: 4.9,
    stock: 40
  },
  // MATCHA
  {
    id: 's3',
    name: 'Uji Matcha Latte Pelabuhan Ratu Mist',
    category: 'matcha',
    price: 32000,
    description: 'Matcha Uji Jepang berkualitas tinggi (ceremonial grade), dipadukan dengan susu oat creamy dan sentuhan rahasia dari sari madu liar hutan Cisolok.',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=80', // Matcha latte in ceramic bowl
    rating: 4.7,
    stock: 30
  },
  // TEA
  {
    id: 's4',
    name: 'Teh Melati Wangi Khas Sukabumi',
    category: 'tea',
    price: 22000,
    description: 'Teh hitam premium lokal yang dikoasikan dengan kuntum melati segar dari kebun warga Pelabuhan Ratu, menghasilkan rasa manis floral alami yang menenangkan.',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80', // Hot cup of tea
    rating: 4.6,
    stock: 50
  },
  // MERCHANDISE EXCLUSIVE
  {
    id: 's5',
    name: 'T-Shirt Rumah Adiksi x Wave of Art',
    category: 'merchandise',
    price: 165000,
    description: 'Kaos katun premium 24s berhiaskan sablon grafis ombak Cimaja yang digambar tangan oleh ilustrator lokal Fajar Cimaja. Edisi ulang tahun pertama komunitas.',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80', // White t-shirt minimalist
    rating: 4.9,
    stock: 12,
    isMerch: true
  },
  {
    id: 's6',
    name: 'Totebag Kanvas Lukis Tangan Kolaboratif',
    category: 'merchandise',
    price: 95000,
    description: 'Tas jinjing kanvas tebal tahan air. Tiap bagian dilukis tangan secara unik oleh anak-anak asuh Rumah Adiksi, memastikan tidak ada produk yang sama persis di dunia!',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80', // Stylish canvas totebag
    rating: 5.0,
    stock: 8,
    isMerch: true
  },
  {
    id: 's7',
    name: 'Tumbler Bambu Grafir Karanghawu',
    category: 'merchandise',
    price: 135000,
    description: 'Tumbler termal stainless steel berlapis casing bambu alami, digrafir laser dengan siluet mistis tebing Karanghawu. Menjaga suhu minuman Anda hingga 12 jam.',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=500&q=80', // Sustainable bamboo thermo flask
    rating: 4.8,
    stock: 15,
    isMerch: true
  }
];

export const INITIAL_EVENTS: ArtEvent[] = [
  {
    id: 'e1',
    title: 'Gelar Karya Seni Pesisir 2026',
    date: '2026-06-15',
    time: '14:00 - 22:00 WIB',
    location: 'Pendopo Pantai Citepus, Pelabuhan Ratu',
    description: 'Pameran seni tahunan terbesar Rumah Adiksi yang menampilkan lebih dari 50 karya seni lukis, instalasi akar pantai, fotografi lanskap, dan sajian live kriya oleh pemuda-pemudi pesisir. Dilengkapi bazaar kreatif dan live music.',
    category: 'Pameran',
    bannerUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80', // Art studio colorful
    registeredCount: 142
  },
  {
    id: 'e2',
    title: 'Cimaja Sunset Accoustic Session',
    date: '2026-06-28',
    time: '16:30 - 20:00 WIB',
    location: 'Amfiteater Pasir, Pantai Cimaja',
    description: 'Pertunjukan musik folk intim berlatar belakang sunset eksotis Cimaja. Menampilkan penyanyi lokal Rian Citepus serta panggung kolaboratif bagi grup band remaja pemula untuk mempromosikan single ciptaan sendiri.',
    category: 'Konser',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80', // Live concert stage
    registeredCount: 98
  },
  {
    id: 'e3',
    title: 'Workshop Seni Lukis Media Kayu Hanyut',
    date: '2026-07-05',
    time: '09:00 - 13:00 WIB',
    location: 'Basecamp Rumah Adiksi, Pelabuhan Ratu',
    description: 'Pelajari cara menyortir, membersihkan, merestorasi, serta menggambar di atas media kayu hanyut (driftwood) bersama instruktur Siti Ayu Larasati. Seluruh hasil karya buatan peserta boleh dibawa pulang secara gratis!',
    category: 'Workshop',
    bannerUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80', // Art class hands on painting
    registeredCount: 45
  },
  {
    id: 'e4',
    title: 'Pelabuhan Ratu Creative Eco-Bazaar',
    date: '2026-07-19',
    time: '10:00 - 21:00 WIB',
    location: 'Halaman Kompleks GOR Pelabuhan Ratu',
    description: 'Ruang pasar kolaboratif tempat UMKM kerajinan daur ulang, kuliner pantai organik, sablon kaos seni kustom, hingga Rumah Adiksi coffee bar bersatu memeriahkan ekonomi kreatif pemuda lokal.',
    category: 'Bazaar',
    bannerUrl: 'https://images.unsplash.com/photo-1488137595304-2f22b7a0f622?auto=format&fit=crop&w=800&q=80', // Open market market stalls
    registeredCount: 77
  }
];

export const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    authorName: 'Rian Citepus',
    authorField: 'Musik Pesisir',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    title: 'Mencari Drummer/Perkusionis untuk Kolaborasi Musik Pantai!',
    content: 'Halo teman-teman! Saya sedang mematangkan aransemen lagu baru bertajuk "Mimpi di Ujung Suar". Lagunya bernuansa folk dengan ketukan etnik ritmis pelan. Adakah drummer, pemain cajon, atau perkusionis lokal Pelabuhan Ratu yang tertarik join latihan bersama minggu ini di Basecamp?',
    group: 'Kolaborasi',
    timestamp: '2 jam yang lalu',
    likes: 18,
    comments: [
      {
        id: 'c1',
        authorName: 'Bayu Samudra',
        content: 'Wah mantap ini bro! Kalau butuh perkusi kendang sunda atau alat tradisional djembe, saya ada kenalan anak pemuda Citepus yang jago ritem. Saya hubungkan ya!',
        timestamp: '1 jam yang lalu'
      },
      {
        id: 'c2',
        authorName: 'Ahmad Karanghawu',
        content: 'Sambil live session nanti, kabari ya. Saya bisa bantu dokumentasi foto atau bikin video lirik dramatis di sunset Cimaja.',
        timestamp: '45 menit yang lalu'
      }
    ]
  },
  {
    id: 'p2',
    authorName: 'Siti Ayu Larasati',
    authorField: 'Kriya Kayu',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    title: 'Mencari Kayu Hanyut Artistik di Sekitar Citepus Hari Ini',
    content: 'Setelah badai kecil tadi malam, biasanya banyak kayu gelondongan dan sisa kayu akar pohon terbawa banjir sungai dan terdampar di pantai Citepus atau Cisolok. Saya mau turun berburu siang ini sekitar jam 2 siang. Ada yang berminat ikut jalan-jalan mencari sekalian sharing teknik sortir kayu kualitas seni?',
    group: 'Diskusi',
    timestamp: '1 hari yang lalu',
    likes: 15,
    comments: [
      {
        id: 'c3',
        authorName: 'Fajar Cimaja',
        content: 'Ikut mbak Ayu! Kebetulan mau cari kayu datar kecil buat papan nama studio kamar saya. Kumpul di citepus sebelah mana?',
        timestamp: '23 jam yang lalu'
      },
      {
        id: 'c4',
        authorName: 'Siti Ayu Larasati',
        content: 'Boleh bung Fajar! Kita kumpul dekat pos nelayan Citepus ya biar parkir motor gampang.',
        timestamp: '22 jam yang lalu'
      }
    ]
  }
];
