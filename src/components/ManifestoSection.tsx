/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Heart,
  Users,
  Compass,
  Sun,
  Moon,
  ChevronRight,
  Flame,
  Activity,
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export default function ManifestoSection() {
  const [activeTab, setActiveTab] = useState<'sekapur' | 'pembuka' | 'visi' | 'misi'>('sekapur');
  const [hoveredHormone, setHoveredHormone] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);

  const hormones = [
    {
      id: 'dopamine',
      name: 'Dopamin',
      slogan: 'Hasrat & Ambisi',
      desc: 'Inilah hasrat yang menyala, dorongan pencapaian, ambisi, dan gejolak langkah untuk terus bergerak maju mengukir nama di bumi.',
      alignment: 'Menyalurkan Dopamin yang berlebih secara sehat melalui ciptaan karya nyata yang bermanfaat.',
      color: 'from-amber-600 to-yellow-500',
      textColor: 'text-amber-800 font-extrabold',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'endorphin',
      name: 'Endorfin',
      slogan: 'Daya Tahan & Resiliensi',
      desc: 'Inilah perisai tak kasatmata; daya tahan dan resiliensi yang membiarkanmu tetap berdiri tegak melewati sayatan luka, himpitan tekanan, dan rasa sakit dari kejamnya kehidupan.',
      alignment: 'Mengasah Endorfin yang benar melalui pengorbanan, kerelaan berproses, dan daya juang belajar.',
      color: 'from-rose-600 to-red-500',
      textColor: 'text-rose-800 font-extrabold',
      bgColor: 'bg-rose-50',
    },
    {
      id: 'oxytocin',
      name: 'Oksitosin',
      slogan: 'Kehangatan & Cinta Kasih',
      desc: 'Inilah kehangatan rasa peluk; benang halus yang merajut keterhubungan, persaudaraan, cinta kasih, dan rasa percaya antara satu manusia dengan manusia lainnya.',
      alignment: 'Menyebarkan Oksitosin yang tulus melalui pelukan hangat, ketulusan rasa, dan percakapan tanpa sekat.',
      color: 'from-indigo-600 to-blue-500',
      textColor: 'text-indigo-800 font-extrabold',
      bgColor: 'bg-indigo-55',
    },
    {
      id: 'serotonin',
      name: 'Serotonin',
      slogan: 'Ketenangan & Kedamaian Sejati',
      desc: 'Inilah helaan napas yang panjang; ketenangan yang sejati, penerimaan atas diri apa adanya, rasa cukup, dan kedamaian saat menatap lautan hidup.',
      alignment: 'Mendekap Serotonin yang utuh melalui kedamaian gaya hidup, serta perjalanan panjang mengenali diri.',
      color: 'from-emerald-600 to-teal-500',
      textColor: 'text-emerald-800 font-extrabold',
      bgColor: 'bg-emerald-55',
    }
  ];

  const towerFloors = [
    {
      floor: 3,
      title: "Lantai 3: Mengakar di Bumi, Menyentuh Bintang di Langit",
      tag: "Blooming with Flows",
      content: "Mekar Mengikuti Aliran — mekar bukanlah perlombaan balap lari. Ada yang mampu menyala garang layaknya matahari siang, ada pula yang merasa cukup dengan menjadi rembulan—menjadi bayang cahaya teduh milik seseorang. Keduanya memiliki derajat keberartian yang setara.",
      light: "rgba(245, 158, 11, 0.9)"
    },
    {
      floor: 2,
      title: "Lantai 2: Ruangan Tanpa Penghakiman",
      tag: "Rumah bagi Jiwa yang Lapar",
      content: "Menara dengan banyak pintu dan jendela, serta puluhan lantai yang selalu memberi kelonggaran bagi siapa pun untuk keluar masuk sesuka hati. Di bawah atap rumah ini, engkau boleh gagal ribuan kali tanpa ada satu pun tawa ejekan yang terdengar.",
      light: "rgba(99, 102, 241, 0.8)"
    },
    {
      floor: 1,
      title: "Lantai 1: Pembuka Jendela Batin",
      tag: "Kakak & Adik",
      content: "Rumah ini menolak mengenal kasta bos dan karyawan, melainkan tautan batin antara Kakak dan Adik. Majelis ilmu di mana kami tidak sekadar mengajar, melainkan mengkaryakan penyampaian murni di dalam kehangatan cinta.",
      light: "rgba(244, 63, 94, 0.8)"
    }
  ];

  return (
    <div className="space-y-12 py-4 relative">

      {/* Cinematic Hero Title Panel */}
      <div className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-accent/10 text-brand-accent rounded-full text-xs font-bold tracking-widest uppercase border border-brand-accent/20">
          <Compass className="w-4 h-4 text-brand-accent" />
          <span>Blooming with Flows — Mekar Mengikuti Aliran</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-brand-green leading-tight">
          Manifesto Gerakan <span className="text-brand-gold italic">Rumah Adiksi</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-750 max-w-2xl mx-auto font-sans leading-relaxed">
          "Berbagi Ruang, Menjemput Cahaya Masing-Masing. Dari Gejolak Menjadi Cahaya Terang di Tengah Padang Sunyi."
        </p>
      </div>

      {/* Interactive Tabs Menu */}
      <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto border-b border-gray-200 pb-4">
        {[
          { id: 'sekapur', label: 'Sekapur Sirih', desc: 'Menara di Tengah Padang Sunyi' },
          { id: 'pembuka', label: 'Manifesto', desc: 'Siklus Aliran & 4 Hormon' },
          { id: 'visi', label: 'Visi Perjuangan', desc: 'Membuka Jendela Batin' },
          { id: 'misi', label: 'Misi & Harapan', desc: 'Melangkah Tanpa Tuntutan' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[150px] p-3 text-center rounded-2xl border transition-all duration-300 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-brand-accent text-white border-brand-accent shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:text-gray-950 hover:bg-gray-50'
            }`}
          >
            <div className={`text-xs font-bold tracking-wider uppercase font-sans ${activeTab === tab.id ? 'text-white' : 'text-gray-800'}`}>{tab.label}</div>
            <div className={`text-[10px] font-sans mt-0.5 ${activeTab === tab.id ? 'text-white/80' : 'text-gray-500'}`}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Main Tab Content Renderers */}
      <div className="max-w-5xl mx-auto" id="manifesto-content-body">
        <AnimatePresence mode="wait">
          {activeTab === 'sekapur' && (
            <motion.div
              key="sekapur"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              <div className="lg:col-span-8 bg-white border border-gray-200 p-6 md:p-8 rounded-3xl space-y-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-5 text-left">
                  <span className="text-xs font-bold text-brand-accent uppercase tracking-widest font-mono block border-b border-gray-200 pb-2">
                    # SEKAPUR SIRIH: Menara di Tengah Padang Sunyi
                  </span>
                  <div className="text-gray-700 font-serif leading-relaxed text-sm md:text-base space-y-4">
                    <p className="italic text-base md:text-lg text-brand-green border-l-2 border-brand-accent/50 pl-4 py-1 leading-relaxed">
                      "Di hamparan luas yang sunyi, di antara bentang pegunungan purba dan lautan yang merelakan dirinya dipeluk ombak, di sanalah kita bermula. Pada sebuah hamparan padang rumput kering—yang sering kali merupa sebagai cermin dari gersangnya ruang bagi imajinasi di dunia nyata—berdiri tegak sebuah menara."
                    </p>
                    <p>
                      Puncaknya mencium langit, dihiasi jutaan bintang yang tak pernah tidur. Menara ini tinggi, memiliki begitu banyak pintu yang tak pernah dikunci, dan jendela-jendela yang selalu terbuka. Menjulang membelah angkasa, ia menjelma bagai kembang api malam; sebuah sumpah yang menyala dengan jutaan warna, merangkai pemandangan yang dibingkai oleh pengharapan terbaik dan mimpi-mimpi paling megah yang pernah berani diikrarkan manusia.
                    </p>
                    <p>
                      Namun, ketahuilah, menara ini berdiri bukan untuk menantang kebesaran langit. Ia berdiri tegak semata-mata untuk mengingatkan kita: bahwa di dalam diri setiap manusia, selalu ada ruang yang ingin tumbuh lebih tinggi dari rasa takutnya sendiri. Jika engkau melintas di malam paling gelap dan paling sunyi—yaitu malam-malam panjang tepat sebelum fajar bersedia tiba—cahaya pendar dari jendela-jendela kecilnya akan tampak seperti denyut nadi kehidupan. Jika engkau mendekat, engkau akan mendengar harmoni kehidupan yang paling jujur.
                    </p>
                    <p>
                      Di dalam sana, ada yang sedang menangis diam-diam, menumpahkan lelahnya dalam pelukan kami. Ada yang sedang tertawa lepas karena, setelah sekian lama mengembara, ia akhirnya menemukan dirinya kembali. Ada yang sedang menulis merangkai kata. Ada yang sedang melukis dan mencipta karya. Dan ada pula yang sekadar duduk diam, belajar menatap kegagalan hidupnya tanpa lagi merasakan kebencian.
                    </p>
                    <p className="text-gray-950 font-medium">
                      Menara ini bukan sekadar susunan batu dan bata. Ia bernapas. Ia adalah tempat pulang bagi gejolak yang selama ini dihakimi dan dianggap salah arah. Ia adalah ruang singgah bagi mereka yang bahunya sudah terlalu lelah berpura-pura kuat dan baik-baik saja di hadapan dunia. Ia adalah rumah bagi jiwa-jiwa yang terlalu berisik di dalam kepalanya, tetapi terlalu sunyi di dalam hidupnya. Menara ini adalah pelukan batin bagi mereka semua yang membutuhkan.
                    </p>
                  </div>
                </div>

                <div className="bg-brand-accent/5 border border-brand-accent/15 p-5 rounded-2xl flex items-start gap-4 mt-4 text-left">
                  <div className="p-2 bg-brand-accent/10 rounded-xl text-brand-accent shrink-0">
                    <Heart className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 font-mono uppercase">Menara Kita Adalah Tempat Pulang</h4>
                    <p className="text-xs text-gray-650 mt-1">
                      Pelukan batin bagi jiwa-jiwa yang terlalu berisik di dalam kepalanya, namun terlalu sunyi di dalam hidupnya.
                    </p>
                  </div>
                </div>
              </div>

              {/* Graphical representation corresponding to the text */}
              <div className="lg:col-span-4 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative shadow-sm text-left">
                
                {/* Visual Tower Mockup */}
                <div className="space-y-4 relative z-10 w-full">
                  <h4 className="text-xs font-black uppercase text-brand-accent tracking-widest font-mono">Rumah Adiksi</h4>
                  <div className="border border-gray-200 bg-gray-50 p-4 rounded-2xl relative min-h-[260px] flex flex-col items-center justify-end overflow-hidden">
                    
                    {/* Glowing Tower peak star */}
                    <div className="absolute top-6 text-center flex flex-col items-center">
                      <Star className="w-10 h-10 text-brand-accent animate-bounce" />
                      <div className="w-1.5 h-36 bg-gradient-to-b from-brand-accent via-indigo-505/30 to-transparent mt-1" />
                    </div>

                    <div className="absolute bottom-4 inset-x-4 flex justify-between bg-white p-2 border border-gray-200 rounded-xl text-[10px] font-mono text-gray-600 shadow-sm">
                      <span>Pintu: Tak Terkunci</span>
                      <span>Jendela: Terbuka</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-150 pt-4">
                  <span className="text-[10px] text-gray-550 font-mono block">NAMA GERAKAN:</span>
                  <p className="text-xl font-bold font-serif text-brand-green tracking-tight mt-1">“Rumah Adiksi”</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Sebuah menara di tengah padang sunyi, berdiri kokoh menjulang membelah angkasa membawa mimpi-mimpi paling megah.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pembuka' && (
            <motion.div
              key="pembuka"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Manifesto Core text paragraph */}
              <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm text-left">
                <span className="text-xs font-bold text-brand-accent uppercase tracking-widest font-mono block border-b border-gray-200 pb-2">
                  # MANIFESTO GERAKAN RUMAH ADIKSI
                </span>
                <p className="text-gray-700 font-serif leading-relaxed text-sm md:text-base italic text-center max-w-4xl mx-auto px-4">
                  "Sebab segala sesuatu yang dipaksa mekar terlalu cepat, oleh ambisi atau tuntutan zaman, akan layu sebelum ia sempat mengenali di musim apa ia sebenarnya hidup."
                </p>
                <div className="text-gray-700 font-serif leading-relaxed text-sm md:text-base space-y-4 max-w-4xl mx-auto">
                  <p>
                    Di titik nol ini, di bawah kaki menara, kami membuka lembaran kisah kembali. Kita semua dikembangkan untuk menyadari satu hukum semesta: bahwa bunga-bunga harapan dan cita-cita yang hendak bermekaran, senantiasa harus tunduk pada hukum alamnya sendiri. Sebuah perjalanan yang berbunyi: <strong className="text-gray-900">"Keberangkatan dari kemulaan di puncak gunung, kemudian mengalir singgah pada sungai-sungai yang berliku, lalu menepi dengan tenang menuju muaranya."</strong>
                  </p>
                  <p>
                    Kondisi "kemulaan" kita adalah mimpi dan gejolak; imajinasi yang melampaui batas awan dan energi kehidupan yang meledak-ledak. Sayangnya, dunia acap kali memandang energi besar ini sebagai sebuah 'penyimpangan'. Gejolak ini dieksploitasi, dibiarkan liar tak terdidik, hingga mereka yang sejatinya menyimpan semesta potensi—yang sering kita buat babak belur dan kita sepelekan—terpaksa membuang harga diri dan air matanya dalam setiap rasa malu, jatuh, dan sakitnya. Seperti seorang pecandu—yang dipaksa mengkhianati fungsi, cita rasa, dan khayalannya—begitu banyak jiwa-jiwa hebat di luar sana yang dipaksa mengkhianati keaslian dirinya demi memenuhi tuntutan ego orang lain dan realitas yang kejam.
                  </p>
                  <p>
                    Dunia yang fana ini terlalu sering meminta manusia menjadi seragam, hingga mereka lupa, bahwa beberapa bunga memang sengaja diciptakan Tuhan untuk tumbuh liar agar mampu bertahan di tanah yang paling keras sekalipun. <strong className="text-brand-accent">Rumah Adiksi</strong> hadir sebagai pelabuhan terakhir dari pelarian itu. Kami tidak melihat kondisi "addiction" (adiksi/kecanduan) yang dihadapi oleh anak-anak muda saat ini semata-mata sebagai sebuah penyakit atau pesakitan moral. Kami memandangnya sebagai tanda dari kepemilikan energi kehidupan yang luar biasa meruah. Ia adalah api. Api yang jika dibiarkan tanpa arah, akan membakar tuannya sendiri menjadi abu. Namun api yang sama, jika dipahami dan dialirkan melalui tungku yang benar, akan menjadi cahaya yang menghangatkan banyak kehidupan.
                  </p>
                  <p>
                    Kami percaya, manusia tidak sekadar hidup dari satu tarikan napas dopamin belaka. Jiwa manusia adalah sebuah orkestra agung, di mana empat ritme harmoni kehidupan mengalir menderas:
                  </p>
                </div>
              </div>

              {/* Natural Hormones Integrator Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-serif font-bold text-gray-900 tracking-tight">
                    Harmoni 4 Hormon Alami & Aliran Sungai Jiwa
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono mt-1">
                    Sorot atau ketuk setiap hormon untuk melihat tindakan penyeimbangannya
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {hormones.map((h) => {
                    const isHovered = hoveredHormone === h.id;
                    return (
                      <div
                        key={h.id}
                        onMouseEnter={() => setHoveredHormone(h.id)}
                        onMouseLeave={() => setHoveredHormone(null)}
                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-left ${h.bgColor} ${
                          isHovered 
                            ? 'border-brand-accent bg-white shadow-lg scale-102' 
                            : 'border-gray-200 bg-white shadow-sm'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-mono uppercase tracking-widest ${h.textColor}`}>
                              {h.name}
                            </span>
                            <Activity className={`w-3.5 h-3.5 ${isHovered ? 'animate-bounce text-brand-accent' : 'text-gray-500'}`} />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 tracking-tight">{h.slogan}</h4>
                          <p className="text-[11.5px] text-gray-650 leading-normal">{h.desc}</p>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-gray-150 space-y-1">
                          <span className="text-[9px] uppercase font-mono text-gray-505 block">Siklus Aliran:</span>
                          <p className="text-[10px] leading-tight text-brand-accent font-bold">{h.alignment}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Second part of Manifesto explanation */}
              <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-3xl text-gray-700 font-serif leading-relaxed text-sm md:text-base space-y-4 max-w-4xl mx-auto shadow-sm text-left">
                <p>
                  Kami menyadari, banyak manusia kehilangan arah bukan karena mereka lemah. Mereka hancur karena keempat aliran sungai di dalam dirinya ini dipaksa mengalir timpang. Ada yang berlari terlalu kencang dikejar ambisi (<strong className="text-gray-950">Dopamin</strong>) hingga lupa bagaimana rasanya beristirahat. Ada yang terlalu keras membentur karang kehidupannya (<strong className="text-gray-950">Endorfin</strong>) hingga hatinya mati rasa. Ada yang terlalu haus akan validasi (<strong className="text-gray-950">Oksitosin</strong>) hingga lupa bagaimana mencintai dirinya sendiri. Ada yang terlalu lama terkurung dalam kesepian hingga lupa bagaimana rasanya dipeluk oleh pengertian yang membuatnya tenang (<strong className="text-gray-950">Serotonin</strong>).
                </p>
                <p>
                  Maka, tugas kita di menara ini bukanlah memadamkan gejolak api itu. Tugas kita adalah membantu setiap jiwa menemukan kembali ritme di antara keriuhan tersebut. Sebab ketika Dopamin telah menemukan arah tujuannya, Endorfin telah menemukan ketangguhannya yang pas, Oksitosin telah bersandar pada cinta yang tepat, dan Serotonin telah mendekap ketenangannya—maka saat itulah manusia akan mendengarkan kembali irama kebahagiaan yang utuh. Sebuah keadaan sakral di mana karya yang lahir tak lagi berasal dari pelarian yang menyakitkan, melainkan dari kesadaran yang hidup dan jiwa yang telah berdamai dengan masa lalunya.
                </p>
                <p>
                  Rumah Adiksi adalah ruang inkubasi untuk alkemi tersebut. Kami menjalaninya dengan satu prinsip utama: membimbing batin tanpa dorongan substansi, melainkan mendorongnya dengan memantik hormon-hormon alami dan naluri alamiah manusia. Sebuah naluri untuk terus bermanfaat dan meninggalkan jejak keabadian melalui kisah dan karya nyata. Kami percaya dengan segenap hati, bahwa sebagian besar orang yang tersesat tidak sedang membutuhkan hukuman. Mereka tidak butuh dibatasi by pagar dan tembok tebal, yang bahkan alasan mengapa tembok itu dibangun pun tidak pernah dijelaskan kepada mereka.
                </p>
                <p className="border-t border-gray-200 pt-4 font-bold text-gray-950">
                  Pada akhirnya, kami meyakini bahwa yang sesungguhnya kita butuhkan hanyalah sebuah ruang yang cukup. Ruang untuk didengar, dipeluk, dan dipahami, sebelum kita benar-benar tenggelam dalam kebisingan dunia.
                </p>
              </div>

              {/* Natural Slogan Callout */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 text-center space-y-2 font-mono">
                <div className="text-[10px] uppercase text-gray-550">Filosofi Aliran</div>
                <div className="text-brand-accent text-sm font-black tracking-widest">
                  "API YANG DIPAHAMI DAN DIALIRKAN MELALUI TUNGKU YANG BENAR AKAN MENJADI CAHAYA"
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'visi' && (
            <motion.div
              key="visi"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
               {/* Left Panel: 3 Pillars structured directly corresponding to Visi */}
              <div className="lg:col-span-8 space-y-4 text-left">
                <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-3xl space-y-8 shadow-sm">
                  
                  {/* VISI #1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-brand-accent font-mono font-bold text-xs uppercase tracking-wide">
                      <Star className="w-4 h-4 text-brand-accent animate-pulse" />
                      <span>1. Pembuka Jendela Batin</span>
                    </div>
                    <div className="text-gray-750 text-sm leading-relaxed space-y-3 font-serif">
                      <p className="font-bold text-brand-green text-sm italic">
                        "Ilmu yang belum menemukan cahayanya, adalah ilmu yang kehilangan cinta."
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Melangkah masuk ke rumah ini, tinggalkanlah atribut sementaramu di depan pintu. Rumah ini menolak mengenal kasta bos dan karyawan, ketua dan anak buah, atau atasan dan bawahan. Di sini, yang ada hanyalah tautan batin antara <strong className="text-gray-900">Kakak dan Adik</strong>. Ruang ini adalah wadah nirbala, sebuah majelis ilmu di mana kami tidak sekadar mengajar, melainkan <strong className="text-brand-accent">"Mengkaryakan Penyampaian"</strong>. Kami berbicara melalui langit yang terbuka dan ruang yang luas, bukan sekadar “menggurui” di dalam sekat-sekat kelas mainstream yang sempit dan pengap.
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Pengetahuan murni tanpa dibasuh kasih sayang hanya akan melahirkan arogansi dan kesombongan intelek. Sebaliknya, pengetahuan yang dilebur bersama cinta, akan melahirkan sebuah peradaban. Para penggerak yang merawat rumah ini tercipta dari rahim passion dan keikhlasan. Jika ketiga unsur ini—Cinta, Passion, dan Keikhlasan—telah berpadu menjadi satu fondasi, maka menara ini tidak akan pernah runtuh, dan akan senantiasa menghidupi siapa saja yang datang mencari terang.
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Ruang pembelajaran di sini sifatnya membebaskan rasa dari belenggu, menerangi pojok-pojok imajinasi yang gelap, menjembatani mimpi dengan realitas, dan memberi ruang inkubasi yang terpelihara dengan saksama. Tujuannya satu: agar penghuninya tidak tercerabut dari akar kenyataan bumi, namun tetap memiliki jiwa yang tangguh saat berhadapan dengan gejolak zaman yang terus-menerus memaksa kita untuk berubah. Kami tidak ingin menciptakan manusia yang pandai merangkai kata tentang mimpi di awan, namun tak tahu cara menjejakkan kaki di tanah. Kami ingin melahirkan manusia yang mampu bertahan hidup di dunia nyata, tanpa harus membunymimpinya sendiri. Sebab dunia ini sudah terlalu penuh sesak dengan orang dewasa yang kehilangan jiwanya ketika mereka tumbuh besar.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-150 my-4" />

                  {/* VISI #2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-brand-accent font-mono font-bold text-xs uppercase tracking-wide">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>2. Ruangan Tanpa Penghakiman</span>
                    </div>
                    <div className="text-gray-750 text-sm leading-relaxed space-y-3 font-serif">
                      <p className="font-bold text-brand-green text-sm italic">
                        "Beberapa manusia bisa perlahan 'sembuh' hanya karena untuk pertama kalinya dalam hidup, ia merasa diterima seutuhnya."
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Rumah Adiksi adalah menara dengan banyak pintu dan jendela, serta puluhan lantai yang selalu memberi kelonggaran bagi siapa pun untuk keluar dan masuk sesuka hati. Fungsi kami adalah menjadi rumah bagi mereka yang lapar akan pelukan. Kami menerima dan menyuguhi tamu-tamu jiwa dengan secangkir ketulusan, tanpa pernah melarang mereka untuk mengepakkan sayap dan bertamu ke rumah-rumah kehidupan yang lain.
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Kami mencari orang-orang yang ingin menemukan ritme atas kebebasannya sendiri sebagai manusia. Ya, merekalah para <strong className="text-brand-accent">"pecandu"</strong> dalam kamus kami. Mereka yang diam-diam menyembunyikan semesta raya di dalam kepalanya. Mereka yang terlalu sering diasingkan dan dianggap aneh hanya karena cara kerjanya berbeda. Mereka yang tangan dan jiwanya gatal ingin menciptakan sesuatu, namun selalu kehabisan napas karena dibatasi ruang geraknya sejak ia mencoba memulai. Kami mencoba untuk duduk dan membersamai mereka. Mereka yang berani mengelupas topeng sosialnya dan menunjukkan wajah aslinya dengan nilai yang paling orisinal.
                      </p>
                      <p className="text-[13px] text-gray-655 font-sans leading-relaxed">
                        Di bawah atap rumah ini, engkau boleh gagal ribuan kali tanpa ada satu pun tawa ejekan yang terdengar. Engkau boleh terlihat bingung dan tersesat tanpa ada palu hakim yang dijatuhkan. Engkau boleh menangis dan merasa lelah tanpa pernah dipaksa untuk memasang wajah tegar. Sebab kami tahu, tidak semua luka bernanah itu membutuhkan obat berupa nasihat. Sebagian luka hanya membutuhkan kehadiran; eksistensi dari manusia lain yang bersedia duduk diam, memegang tanganmu, dan memilih untuk tetap tinggal. Di tengah laju dunia yang terus berputar tergesa-gesa ini, barangkali bentuk cinta yang paling mewah dan sederhana adalah: memberi ruang, dan sungguh-sungguh mendengarkan.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-150 my-4" />

                  {/* VISI #3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-brand-accent font-mono font-bold text-xs uppercase tracking-wide">
                      <Sun className="w-4 h-4 text-amber-600 animate-spin-slow" />
                      <span>3. Mengakar di Bumi, Menyentuh Bintang di Langit</span>
                    </div>
                    <div className="text-gray-750 text-sm leading-relaxed space-y-3 font-serif">
                      <p className="font-bold text-brand-green text-sm italic">
                        "Blooming with Flows — Mekar Mengikuti Aliran adalah denyut nadi dari ideologi kami."
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Di puncak menara, sebuah perjalanan memang selalu menjanjikan kerlap-kerlip harapan dan kejutan yang indah. Namun, kami adalah tukang kebun jiwa yang pantang memaksa sekuntum bunga untuk mekar sebelum musimnya tiba. Kita semua adalah tunas yang berada dalam fase mekar bersama. Kita bersepakat untuk mengikuti aliran air yang jujur, membiarkan diri ini mengalir (let it flow) dengan segala ragam bentuk, pendar warna, variasi genre, karakter, dan wujud karya yang tak terbatas.
                      </p>
                      <p className="text-[13px] text-gray-655 font-sans leading-relaxed">
                        Kami menolak keseragaman, karena keindahan sejati justru lahir dari keberanian jiwa untuk setia mengikuti arus kreativitasnya sendiri menuju muara kemandiriannya masing-masing. Kami menegaskan bahwa mekar bukanlah sebuah perlombaan balap lari. Tidak semua bunga ditakdirkan untuk tumbuh dan merekah di musim yang sama. Tidak semua pendar cahaya di semesta ini menyala dengan cara yang seragam. Akan ada dari kalian yang mampu menyala garang, terang benderang layaknya matahari siang. Namun, akan ada pula dari kalian yang merasa cukup dengan menjadi rembulan—menjadi bayang cahaya teduh yang menjelma sebagai lampu-lampu kecil di tengah malam gelap milik seseorang. Dan ketahuilah, keduanya memiliki derajat keberartian yang setara.
                      </p>
                      <p className="text-[13px] text-gray-650 font-sans leading-relaxed">
                        Di rumah ini, setitik proses peluh lebih dihormati daripada segunung pencitraan hasil akhir. Kejujuran pada diri sendiri jauh lebih berharga daripada tepuk tangan dan validasi kosong dari orang banyak. Dan keberanian untuk mengambil satu langkah kecil meski tertatih, jauh lebih mulia daripada berdiam diri hanya agar terlihat sempurna. Bagi kami, esensi hidup tidak pernah tentang siapa yang paling cepat menancapkan bendera di puncak gunung. Esensi hidup adalah tentang siapa yang masih memiliki kemainan dan jiwanya secara utuh ketika ia akhirnya tiba di puncak sana.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Panel: Interactive Tower Explorer Simulation */}
              <div className="lg:col-span-4 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm space-y-6 text-left">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-brand-accent uppercase tracking-wider font-mono">
                  Menara Kearifan Lokal
                  </h4>
                  <p className="text-[11px] text-gray-500 font-sans">
                  Setiap lantai adalah pilar gerakan kami. Jelajahi untuk memahami lebih dalam.
                  </p>
                </div>

                {/* Stack of interactive floors representing tower floors */}
                <div className="space-y-3 flex-grow flex flex-col justify-center">
                  {towerFloors.map((tf) => {
                    const isSelected = activeFloor === tf.floor;
                    return (
                      <button
                        key={tf.floor}
                        onClick={() => setActiveFloor(isSelected ? null : tf.floor)}
                        className={`w-full p-4 rounded-xl text-left border transition-all duration-300 relative overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/55 border-brand-accent shadow-md shadow-brand-accent/5'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center relative z-10 font-mono text-[10px]">
                          <span className="tracking-widest text-brand-accent uppercase font-extrabold">
                            LANTAI {tf.floor}
                          </span>
                          <span className="text-[9px] text-gray-505 italic">
                            {tf.tag}
                          </span>
                        </div>
                        <h5 className="text-[13px] font-bold text-gray-900 tracking-tight mt-1 relative z-10">
                          {tf.title}
                        </h5>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="relative z-10 mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-600 leading-relaxed space-y-1.5"
                            >
                              <p className="italic text-gray-700">"{tf.content}"</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[10px] text-center font-mono text-gray-650">
                  <span className="text-brand-accent font-bold">Ideologi:</span> "Mekar bukan perlombaan."
                </div>

              </div>

            </motion.div>
          )}

          {activeTab === 'misi' && (
            <motion.div
              key="misi"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-gray-200 p-6 md:p-8 rounded-3xl space-y-8 shadow-sm text-left"
            >
              <div className="border-b border-gray-250 pb-4">
                <span className="text-xs font-bold text-brand-accent uppercase tracking-widest font-mono block mb-1">
                  # MISI GERAKAN: MENEMANI PERJALANAN JIWA
                </span>
                <h3 className="text-xl font-serif font-black text-gray-900">Menemani Perjalanan Martabat Setiap Jiwa</h3>
              </div>

              <div className="text-gray-700 font-serif leading-relaxed text-sm md:text-base space-y-5 max-w-4xl mx-auto">
                <p>
                  Pada akhirnya, <strong className="text-gray-950">Rumah Adiksi</strong> hanyalah sebuah persinggahan kecil bagi para pejalan yang sedang menata ulang langkah kakinya. Kami mendirikan tiang-tiang ini bukan untuk bertindak sebagai kompas yang menghakimi arah anginmu, melainkan sekadar untuk memastikan: bahwa selalu ada sebatang lilin yang menyala bagi siapa saja yang ingin mampir, duduk sejenak, dan meramu ulang makna hidupnya.
                </p>
                <p>
                  Lalu, bersama-sama kita akan mendinginkan api yang membakar itu. Kita salurkan keempat hormon alami dengan aliran yang seimbang:
                </p>

                {/* Sub alignments bullet points matching verbatim text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 font-sans max-w-4xl">
                  {[
                    { tag: "Dopamin (Hasrat)", val: "Kita salurkan Dopamin yang berlebih secara sehat melalui ciptaan karya nyata.", color: "border-amber-200 text-amber-800 bg-amber-50" },
                    { tag: "Endorfin (Ketahanan)", val: "Kita asah Endorfin yang benar melalui pengorbanan dan daya juang belajar.", color: "border-rose-200 text-rose-800 bg-rose-50" },
                    { tag: "Oksitosin (Koneksi)", val: "Kita sebarkan Oksitosin yang tulus melalui pelukan hangat dan percakapan tanpa sekat.", color: "border-indigo-200 text-indigo-800 bg-indigo-50" },
                    { tag: "Serotonin (Kedamaian)", val: "Kita dekap Serotonin yang utuh melalui kedamaian gaya hidup, serta perjalanan panjang untuk mengenali siapa kita sebenarnya.", color: "border-emerald-200 text-emerald-800 bg-emerald-50" }
                  ].map((x, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${x.color} space-y-1`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold block">{x.tag}</span>
                      <p className="text-gray-600 text-xs leading-relaxed">{x.val}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <p>
                    Tidak pernah ada ikatan tuntutan bagi mereka yang datang untuk menetap selamanya. Dan tidak pernah ada beban keharusan bagi mereka yang memilih pergi untuk kembali dengan membawa piala pembuktian. Kami di sini, hadir hanya untuk memeluk dan menemani perjalanan martabat dari setiap jiwa.
                  </p>
                  <p className="border-l-2 border-brand-accent/30 pl-4 py-1 italic font-medium text-brand-green text-sm md:text-base">
                    "Sebuah ikhtiar bersahaja agar kita semua dapat menumbuhkan akar yang mencengkeram kuat realitas keras di bumi, sembari sesekali memberikan izin pada ujung jari imajinasi kita untuk menyentuh kerlap-kerlip bintang di angkasa."
                  </p>
                  <p>
                    Sebab pada akhirnya, kapan engkau akan mekar adalah perjanjian rahasia antara jiwamu dengan waktunya sendiri. Kami tidak memaksakan musim. Kami hanya menyediakan tanah yang gembur, air yang jernih, ruang yang aman, dan aliran cinta yang paling tulus. Kami hanya di sini, berjaga dalam doa dan tindakan, memastikan agar nyala lentera dalam dirimu tidak ditiup padam oleh badai terlalu cepat.
                  </p>
                  <p className="font-bold text-brand-accent text-lg md:text-xl py-3 tracking-wide">
                    Maka sekarang, masuklah. Letakkan lelahmu. Mari mengalir dengan jujur. Mari mekar tanpa terburu-buru. Mari berkarya dengan bebas. Dan pada akhirnya... Mari kembali menjadi manusia seutuhnya.
                  </p>
                </div>
              </div>
                   {/* Three simple checks of success derived verbatim */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200 text-xs text-gray-600 leading-relaxed font-sans max-w-4xl mx-auto text-left">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-gray-900 font-serif font-bold text-sm tracking-tight">Menemukan Terang</span>
                  <p>"Jika di salah satu sudut menara ini ada seseorang yang menemukan walau hanya seberkas terang untuk menuntun jalannya besok, maka itu sudah lebih dari cukup bagi kami."</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-gray-900 font-serif font-bold text-sm tracking-tight">Berdamai dengan Pantulan diri</span>
                  <p>"Jika di lantai rumah ini ada seseorang yang akhirnya sanggup menatap cermin dan berhenti membenci pantulan dirinya sendiri, maka itu sudah lebih dari cukup bagi kami."</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-gray-900 font-serif font-bold text-sm tracking-tight">Kemenangan Jiwa</span>
                  <p>"Jika di serambi ini seseorang yang pernah patah pada akhirnya menemukan satu saja alasan untuk tetap hidup, terus berkarya, dan kembali berani memercayai hari esok—maka setiap batu, setiap tiang, dan seluruh napas di menara ini telah menuntaskan tugas sucinya."</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Epic Branding Footer Card & Slogans verbatim */}
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 p-8 rounded-3xl text-center space-y-4 shadow-sm relative overflow-hidden">
        
        {/* Abstract glowing effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-brand-accent/5 rounded-full filter blur-[80px] pointer-events-none -z-10" />

        <div className="space-y-2">
          <p className="text-xs text-brand-accent font-mono tracking-widest uppercase font-black">
          NILAI INTI GERAKAN
          </p>
          <blockquote className="text-2xl md:text-3xl font-serif font-black text-brand-green italic tracking-wide">
            "Blooming with Flows"
          </blockquote>
          <p className="text-xs font-mono text-gray-650">
          — Dari Gejolak Menjadi Cahaya
          </p>
        </div>

        <div className="w-16 h-[1px] bg-gray-250 mx-auto my-4" />

        <p className="text-sm text-gray-800 font-serif font-bold tracking-tight">
        Rumah Adiksi: Berbagi Ruang untuk Saling Menemukan Cahaya.
        </p>

        <p className="text-xs text-gray-500 font-sans max-w-sm mx-auto leading-relaxed">
        Mari mengalir, mekar, dan berkarya. Mari menjadi manusia seutuhnya.
        </p>
      </div>

    </div>
  );
}
