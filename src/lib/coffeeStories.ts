/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JourneyStep {
  title: string;
  description: string;
  icon: string;
}

export interface ItemJourney {
  title: string;
  subtitle: string;
  origin: string;
  elevation?: string;
  notes: string[];
  steps: JourneyStep[];
}

export const COFFEE_JOURNEYS: Record<string, ItemJourney> = {
  s1: {
    title: "Siklus Rasa Kopi Jampang Single Origin",
    subtitle: "Dari kaki Gunung Jampang hingga ke cangkir inspirasi Anda",
    origin: "Dataran Tinggi Jampang, Sukabumi Selatan",
    elevation: "1,100 - 1,300 mdpl",
    notes: ["Sweet Citrus", "Brown Sugar", "Toasted Coconut finish", "Medium Body"],
    steps: [
      {
        icon: "🌱",
        title: "Penanaman Organik",
        description: "Biji Arabika ditanam di tanah vulkanik subur Jampang. Dipelihara secara organik tanpa pestisida kimia oleh kelompok tani muda binaan lokal."
      },
      {
        icon: "🍒",
        title: "Selective Pick (Petik Merah)",
        description: "Hanya buah kopi yang benar-benar merah ranum (red cherry) yang dipetik secara manual dengan tangan satu per satu untuk memastikan kualitas gula alami maksimal."
      },
      {
        icon: "🌊",
        title: "Pascapanen Giling Basah (Semi-Washed)",
        description: "Ceri kopi digiling basah tradisional, lalu difermentasikan semalam sebelum dicuci bersih. Menghasilkan body kopi yang tebal dan keasaman yang lembut seimbang."
      },
      {
        icon: "☀️",
        title: "Penjemuran Sun-Drenched",
        description: "Biji kopi (green beans) dijemur di atas para-para bambu di bawah pancaran sinar matahari pesisir Pelabuhan Ratu yang melimpah, mendapatkan desau angin laut yang mempercepat pengeringan ideal."
      },
      {
        icon: "🔥",
        title: "Artisanal Roasting",
        description: "Disangrai dengan profil Medium Roast di micro-roastery Rumah Adiksi. Menjaga karakteristik asli buah tropis Jampang Sukabumi dipadukan dengan sentuhan aroma cokelat kental."
      },
      {
        icon: "☕",
        title: "Penyeduhan Presisi",
        description: "Biji kopi digiling segar dan diseduh menggunakan metode V60 manual brew dengan rasio air 1:15 suhu 91°C untuk memancarkan keaslian cita rasa Jampang seutuhnya."
      }
    ]
  },
  s2: {
    title: "Ekstraksi Dingin 16 Jam Signature Cold Brew",
    subtitle: "Kesabaran menyeduh kesempurnaan rasa kopi tanpa distorsi asam",
    origin: "Hutan Cisolok & Pesisir Citepus",
    elevation: "900 - 1,100 mdpl",
    notes: ["Ultra Smooth", "Caramelized Aren", "Low Acidity", "Chocolate Molasses"],
    steps: [
      {
        icon: "☕",
        title: "Kurasi Biji Kopi Blend",
        description: "Mentautkan biji Arabika Jampang aromatik tinggi dengan Robusta Cisolok pemikat kantuk guna menghasilkan perpaduan kekuatan kafein dan kekayaan aroma."
      },
      {
        icon: "📐",
        title: "Gilingan Kasar (Coarse Grind)",
        description: "Biji kopi disangrai Medium-to-Dark lalu digiling kasar secara konsisten agar proses ekstraksi tidak melepaskan senyawa pahit berlebih."
      },
      {
        icon: "❄️",
        title: "Ekstraksi Dingin Lambat",
        description: "Bubuk kopi direndam dalam air es murni bersuhu konstan 4°C selama 16 jam penuh di dalam tangki kedap udara steril."
      },
      {
        icon: "🧪",
        title: "Double-Stage Micro Filtration",
        description: "Melalui dua tahap penyaringan mikron saring kertas lembut, menyisakan cairan kopi hitam pekat yang luar biasa bersih, jernih, dan rendah keasaman."
      },
      {
        icon: "🌴",
        title: "Infusi Gula Aren Karamel",
        description: "Dipadukan dengan sirup gula aren asli Sukabumi yang dididihkan perlahan bersama daun pandan wangi pesisir oleh warga lokal Citepus."
      },
      {
        icon: "🧊",
        title: "Sajian Dingin Maksimal",
        description: "Kopi dituang ke dalam botol kaca steril tersegel yang siap menemani siang terik Anda di pesisir Pelabuhan Ratu."
      }
    ]
  },
  s3: {
    title: "Ritual Matcha Latte Pelabuhan Ratu Mist",
    subtitle: "Harmoni daun teh hijau Jepang premium dan manisnya alam Sukabumi",
    origin: "Uji (Kyoto) & Madu Liar Cisolok",
    notes: ["Uji Ceremonial Matcha", "Creamy Oatmilk", "Cisolok Wild Honey", "Rich Umami"],
    steps: [
      {
        icon: "🌿",
        title: "Peneduhan Daun Teh (Shade Grown)",
        description: "Daun teh hijau di Uji, Jepang diteduhi dari sinar matahari langsung selama 3 minggu sebelum panen untuk memicu klorofil melimpah yang menghasilkan warna hijau zamrud berkilau."
      },
      {
        icon: "💨",
        title: "Stone Mill Grinding",
        description: "Daun teh Tencha terbaik digiling perlahan menggunakan roda batu granit tradisional menjadi bubuk halus selembut sutra (Ceremonial Grade Matcha)."
      },
      {
        icon: "🍯",
        title: "Kurasi Madu Liar Sukabumi",
        description: "Alih-alih gula pasir biasa, kami menginfusikan madu liar asli dari rimbunnya hutan Cisolok Sukabumi untuk memberikan kelembutan rasa manis flora yang khas."
      },
      {
        icon: "🥣",
        title: "Pengocokan Tradisional (Chasen)",
        description: "Bubuk Matcha dilarutkan dengan air hangat bersuhu 80°C lalu dikocok cepat membentuk huruf 'W' menggunakan pengocok bambu tradisional chasen hingga berbusa halus (froth) umami kental."
      },
      {
        icon: "🥛",
        title: "Paduan Creamy Oat Milk",
        description: "Matcha kental ditiupkan di atas gelembung susu gandum (Oat Milk) hangat bertekstur mikro-buih lembut untuk menciptakan gradasi kabut mistis pesisir yang estetik."
      }
    ]
  },
  s4: {
    title: "Seduhan Otentik Teh Melati Wangi Sukabumi",
    subtitle: "Menangkap keharuman bunga melati segar dalam cangkir teh hitam premeium",
    origin: "Kebun Rakyat Pelabuhan Ratu",
    notes: ["Wangi Melati Alami", "Mild Astringency", "Soothing Floral", "Golden Infusion"],
    steps: [
      {
        icon: "🍃",
        title: "Pemetikan Pucuk Teh Pilihan",
        description: "Pucuk daun teh hitam berkualitas dipetik secara presisi (dua daun satu pucuk) dari lereng perkebunan teh lokal Sukabumi."
      },
      {
        icon: "🌸",
        title: "Sinergi Melati Segar",
        description: "Bunga melati yang dipetik sore hari saat kuncup ditumpuk berselingan dengan daun teh kering semalaman, membiarkan teh menyerap minyak aromatik alami bunga yang mekar di tengah malam."
      },
      {
        icon: "🌬️",
        title: "Oksidasi Sempurna",
        description: "Daun teh hitam melalui proses pengeringan dan oksidasi terkontrol untuk melahirkan cita rasa pekat berwarna kemerahan yang khas."
      },
      {
        icon: "🏺",
        title: "Pocian Tanah Liat",
        description: "Teh diseduh menggunakan air pegunungan mendidih di dalam poci tanah liat tradisional untuk mempertahankan suhu optimal dan mengeluarkan rasa manis floral terdalam."
      }
    ]
  },
  s5: {
    title: "Produksi T-Shirt Kolaboratif Wave of Art",
    subtitle: "Karya seni lokal berbalut kenyamanan serat katun premium",
    origin: "Studio Kreatif Fajar Cimaja, Pelabuhan Ratu",
    notes: ["100% Cotton Combed 24s", "Hand-drawn design", "High density print", "Artisan limited edition"],
    steps: [
      {
        icon: "🎨",
        title: "Sketsa Tangan Ilustrator",
        description: "Desain grafis ombak Cimaja yang megah disketsa manual di atas kertas oleh desainer grafis lokal Fajar Cimaja."
      },
      {
        icon: "👕",
        title: "Pemilihan Bahan Eco-Cotton",
        description: "Menggunakan kain premium Combed 24s bersertifikasi OEKO-TEX, sangat lembut di kulit dan bersirkulasi udara maksimal untuk iklim pantai hangat."
      },
      {
        icon: "⚙️",
        title: "Screen Printing Manual",
        description: "Disablon secara manual menggunakan teknik tinta plastisol berkualitas tinggi untuk memastikan gambar awet tidak pecah dan bergradasi tajam."
      }
    ]
  },
  s6: {
    title: "Totebag Kanvas Lukis Tangan Kolaboratif",
    subtitle: "Setiap jinjingan membawa coretan kuas unik anak-anak pesisir binaan kami",
    origin: "Basecamp Rumah Adiksi",
    notes: ["Water-resistant Canvas", "Individually hand-painted", "Charity fundraiser", "Unique serial number"],
    steps: [
      {
        icon: "👜",
        title: "Penjahitan Kanvas Tangguh",
        description: "Kain kanvas tebal tahan air dipotong dan dijahit kokoh membentuk totebag berkapasitas laptop dan buku gambar."
      },
      {
        icon: "🖌️",
        title: "Ekspresi Bebas Lukis Tangan",
        description: "Anak-anak asuh dan pemuda sanggar Rumah Adiksi melukis kanvas kosong secara langsung menggunakan cat akrilik tekstil khusus. Tiap sapuan kuas bercerita kisah mimpi mereka."
      },
      {
        icon: "🔒",
        title: "Thermal Setting Protection",
        description: "Karya yang selesai dilukis dipanaskan pada suhu tinggi untuk mengunci warna agar anti luntur saat dicuci."
      }
    ]
  },
  s7: {
    title: "Grafir Laser Tumbler Bambu Karanghawu",
    subtitle: "Sentuhan alam penopang gaya hidup bebas sampah plastik",
    origin: "Sentra Kriya Bambu Cisolok",
    notes: ["Natural Bamboo Outer", "Double-wall Stainless Steel 304", "12-hour hot/cold insulation", "Karanghawu pattern"],
    steps: [
      {
        icon: "🎋",
        title: "Pemilihan Buluh Bambu",
        description: "Bambu petung lokal Sukabumi berumur matang dipilih, dikeringkan alami tanpa oven gas agar seratnya tetap solid tahan pecah."
      },
      {
        icon: "🧪",
        title: "Pembubutan Presisi & Casing",
        description: "Bambu dibubut tipis berbentuk selongsong yang membungkus botol ganda thermal stainless steel kualitas pangan."
      },
      {
        icon: "⚡",
        title: "Custom Laser Engraving",
        description: "Permukaan bambu digrafir menggunakan mesin laser bertenaga tinggi, menggambarkan siluet magis tebing pantai Karanghawu secara detail."
      }
    ]
  }
};

export const getFallbackJourney = (id: string, category: string, name: string, description: string): ItemJourney => {
  if (COFFEE_JOURNEYS[id]) {
    return COFFEE_JOURNEYS[id];
  }
  
  // Dynamic fallback for any other items
  const isKopi = category === 'coffee' || name.toLowerCase().includes('kopi') || name.toLowerCase().includes('coffee');
  const isMatcha = category === 'matcha' || name.toLowerCase().includes('matcha');
  const isTea = category === 'tea' || name.toLowerCase().includes('teh') || name.toLowerCase().includes('tea');
  
  return {
    title: `Siklus Proses Kreatif ${name}`,
    subtitle: `Kisah di balik pembuatan seduhan dan karya ${name}`,
    origin: "Pelabuhan Ratu, Sukabumi Selatan",
    notes: ["Local Heritage", "Artisan Hand-crafted", "Sustainable Resource"],
    steps: [
      {
        icon: isKopi ? "🌱" : isMatcha ? "🌿" : isTea ? "🍃" : "🎨",
        title: "Koleksi & Kurasi Bahan",
        description: `Bahan dasar ${name} dipilih secara ramah lingkungan langsung dari lereng pegunungan atau komunitas pesisir Sukabumi.`
      },
      {
        icon: "⚙️",
        title: "Pengolahan Tradisional",
        description: "Bahan diproses secara higienis dan cermat dengan sentuhan ketelitian ahli kriya lokal untuk melestarikan metode warisan sejarah."
      },
      {
        icon: "✨",
        title: "Finishing & Sentuhan Akhir",
        description: `Sajian ${name} disempurnakan di workshop Rumah Adiksi agar siap dinikmati dengan aroma, estetika, dan kualitas yang prima.`
      }
    ]
  };
};
