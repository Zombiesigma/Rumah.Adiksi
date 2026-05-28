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
      desc: 'Hasrat, pencapaian, ambisi, dan gejolak untuk bergerak menuju karya nyata.',
      alignment: 'Meramu gejolak hasrat liar menjadi bahan bakar penciptaan tanpa merusak diri.',
      color: 'from-amber-500 to-yellow-400',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-550/10',
    },
    {
      id: 'endorphin',
      name: 'Endorfin',
      slogan: 'Daya Tahan & Ketahanan',
      desc: 'Daya tahan untuk tetap bertahan melewati luka, tekanan, dan rasa sakit kehidupan.',
      alignment: 'Menemukan keindahan dari kepedihan lewat pengorbanan dan daya juang di ruang inkubasi.',
      color: 'from-rose-500 to-red-400',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    {
      id: 'oxytocin',
      name: 'Oksitosin',
      slogan: 'Koneksi & Persaudaraan',
      desc: 'Rasa peluk, keterhubungan, persaudaraan, dan kepercayaan antarsesama manusia.',
      alignment: 'Mengganti kasta kepemimpinan yang dingin dengan dekapan kakak-adik penuh pengertian.',
      color: 'from-indigo-500 to-blue-400',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      id: 'serotonin',
      name: 'Serotonin',
      slogan: 'Ketenangan & Keseimbangan',
      desc: 'Ketenangan, penerimaan diri, rasa cukup, dan damai dengan kehidupan.',
      alignment: 'Menerima kegagalan tanpa membenci kehidupan, menyatu utuh dengan takdir waktu.',
      color: 'from-emerald-500 to-teal-400',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    }
  ];

  const towerFloors = [
    {
      floor: 3,
      title: "Puncak Menara: Blooming with Flows",
      tag: "Intisari Ideologi",
      content: "Sebab mekar bukan perlombaan. Tidak semua bunga tumbuh di musim yang sama. Ada yang bersinar laksana matahari, ada pula yang lembut bagai rembulan—keduanya bermakna di langit masing-masing.",
      light: "rgba(245, 158, 11, 0.9)"
    },
    {
      floor: 2,
      title: "Wadah Multidimensi: Pintu & Jendela Terbuka",
      tag: "Tempat Singgah Jiwa",
      content: "Gerbang yang membebaskan rasa, menerangi imajinasi, dan menjembatani mimpi. Di sini, seseorang boleh gagal tanpa ditertawakan, boleh bingung tanpa dihakimi, dan boleh lelah tanpa dipaksa terlihat kokoh.",
      light: "rgba(99, 102, 241, 0.8)"
    },
    {
      floor: 1,
      title: "Majelis Ilmu: Kakak & Adik",
      tag: "Nonprofit & Sinergi",
      content: "Tidak mengenal kasta bos dan bawahan, melainkan pelukan suci kakak dan adik. Pengetahuan yang bertemu dengan cinta sejati akan melahirkan peradaban abadi bagi pemuda pesisir.",
      light: "rgba(244, 63, 94, 0.8)"
    }
  ];

  return (
    <div className="space-y-12 py-4 relative">
      
      {/* Background stars animation simulator */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-gradient-to-b from-slate-950 via-slate-900 to-brand-charcoal rounded-3xl opacity-40">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-80 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Cinematic Hero Title Panel */}
      <div className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-gold/10 text-brand-gold rounded-full text-xs font-semibold tracking-widest uppercase border border-brand-gold/20">
          <Compass className="w-4 h-4 text-brand-gold" />
          <span>Blooming with Flows</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight text-white leading-tight">
        Manifesto Gerakan <span className="text-brand-gold italic">Rumah Adiksi</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto font-sans leading-relaxed">
        "Berbagi Ruang, Menjemput Cahaya Masing-Masing. Dari Gejolak Menjadi Cahaya Terang di Pesisir Pelabuhan Ratu."
        </p>
      </div>

      {/* Interactive Tabs Menu */}
      <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto border-b border-white/5 pb-4">
        {[
          { id: 'sekapur', label: 'Pembuka Jalan', desc: 'Api Unggun di Tepi Pantai' },
          { id: 'pembuka', label: 'Manifesto Gerakan', desc: 'Siklus Aliran & Hormon Alami' },
          { id: 'visi', label: 'Visi & Pilar Gerakan', desc: '3 Pilar Inti Menara' },
          { id: 'misi', label: 'Misi & Penutup Gerakan', desc: 'Menata Langkah Penuh Makna' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[150px] p-3 text-center rounded-2xl border transition-all duration-300 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-b from-brand-gold/15 to-amber-500/5 text-brand-gold border-brand-gold/40 shadow-lg shadow-brand-gold/5'
                : 'bg-brand-card/30 text-gray-400 border-white/5 hover:text-white hover:bg-brand-card/50'
            }`}
          >
            <div className="text-xs font-black tracking-wider uppercase font-mono">{tab.label}</div>
            <div className="text-[10px] text-gray-500 font-sans mt-0.5 mt-1">{tab.desc}</div>
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
              <div className="lg:col-span-8 bg-brand-card/60 backdrop-blur-sm border border-white/5 p-6 md:p-8 rounded-3xl space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-brand-gold uppercase tracking-widest font-mono block border-b border-white/5 pb-2">
                  # Pembuka Jalan: Sebuah Api Unggun di Tepi Pantai
                  </span>
                  <div className="text-gray-300 font-serif leading-relaxed text-sm md:text-base space-y-4">
                    <p className="italic text-base md:text-lg text-white/90 border-l-2 border-brand-gold/50 pl-4 py-1 leading-relaxed">
                    "Di Pesisir Pelabuhan Ratu, di antara debur ombak dan aroma garam, berdirilah sebuah rumah. Bukan sekadar bangunan, melainkan api unggun yang kami nyalakan untuk jiwa-jiwa yang mencari kehangatan. Ia adalah Rumah Adiksi, tempat kami merayakan gejolak hasrat dan mengubahnya menjadi karya yang menyala."
                    </p>
                    <p>
                    Rumah ini lahir dari kesadaran bahwa setiap pemuda di pesisir ini menyimpan semesta di dalam kepalanya. Imajinasi yang liar, energi yang meluap, dan mimpi yang seringkali dianggap sebagai ombak pasang yang perlu diredam. Kami tidak meredamnya. Kami memberinya wadah.
                    </p>
                    <p>
                    Di sini, di tepi samudra, kami berkumpul. Ada yang datang dengan hati gelisah, ada yang membawa tawa, ada yang sekadar ingin diam dan mendengarkan. Kami berbagi cerita, tawa, dan air mata, merajutnya menjadi kekuatan untuk terus berkarya dan bertumbuh.
                    </p>
                  </div>
                </div>

                <div className="bg-brand-gold/5 border border-brand-gold/10 p-5 rounded-2xl flex items-start gap-4">
                  <div className="p-2 bg-brand-gold/10 rounded-xl text-brand-gold shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white font-mono uppercase">Api Unggun Jiwa Pesisir</h4>
                    <p className="text-xs text-gray-400 mt-1">
                    Rumah Adiksi adalah tempat gejolak hasrat tak lagi dianggap sebagai penyimpangan, melainkan sebagai bahan bakar utama untuk menciptakan karya. Di sini, setiap jiwa berhak menyala, seterang apa pun yang ia inginkan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Graphical representation corresponding to the text */}
              <div className="lg:col-span-4 bg-gradient-to-b from-brand-subcard to-brand-card rounded-3xl p-6 border border-white/5 flex flex-col justify-between overflow-hidden relative shadow-2xl">
                
                {/* Visual Tower Mockup */}
                <div className="space-y-4 relative z-10">
                  <h4 className="text-xs font-black uppercase text-brand-gold tracking-widest font-mono">Simbol Gerakan Kami</h4>
                  <div className="border border-white/5 bg-slate-950/40 p-4 rounded-2xl relative min-h-[220px] flex flex-col items-center justify-end overflow-hidden">
                    
                    {/* Glowing Tower peak star */}
                    <div className="absolute top-8 text-center flex flex-col items-center">
                      <Star className="w-10 h-10 text-brand-gold animate-bounce" />
                      <div className="w-1.5 h-32 bg-gradient-to-b from-brand-gold via-indigo-500/50 to-transparent mt-1" />
                    </div>

                    <div className="absolute bottom-4 inset-x-4 flex justify-between bg-slate-950/80 p-2 border border-white/5 rounded-xl text-[10px] font-mono text-gray-400">
                      <span>Jendela: Terbuka</span>
                      <span>Struktur: Fleksibel</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  <span className="text-[10px] text-gray-500 font-mono block">NAMA GERAKAN:</span>
                  <p className="text-xl font-bold font-serif text-white tracking-tight mt-1">“Rumah Adiksi”</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Merayakan hasrat, mengubah candu menjadi karya, dan menyalakan api kreativitas di pesisir Pelabuhan Ratu.
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
              <div className="bg-brand-card/60 backdrop-blur-sm border border-white/5 p-6 md:p-8 rounded-3xl space-y-6">
                <span className="text-xs font-bold text-brand-gold uppercase tracking-widest font-mono block border-b border-white/5 pb-2">
                # Manifesto Gerakan & Filosofi Aliran
                </span>
                <p className="text-gray-300 font-serif leading-relaxed text-sm md:text-base italic text-center max-w-3xl mx-auto px-4">
                "Bukan melawan arus, tapi menari bersamanya. Mengalir dari puncak kegelisahan, menyusuri sungai-sungai kemungkinan, dan bermuara pada samudra karya."
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-400 leading-relaxed pt-2">
                  <p>
                  Setiap <strong className="text-white">"kegelisahan"</strong> adalah energi murni. Ia adalah imajinasi di puncak gunung, siap meluncur turun. Sistem yang ada seringkali mencoba membendungnya, memaksanya masuk ke dalam pipa-pipa sempit. Hasilnya? Energi itu melemah, atau lebih buruk, meluap tak terkendali.
                  </p>
                  <p>
                  Di Rumah Adiksi, kami percaya bahwa setiap aliran energi itu suci. Kami tidak membendungnya, kami membuatkan sungai untuknya. Kami adalah pelabuhan bagi ide-ide liar, mimpi-mimpi basah, dan hasrat yang seringkali dicap salah.
                  </p>
                </div>
              </div>

              {/* Natural Hormones Integrator Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-serif font-bold text-white tracking-tight">
                  Keseimbangan 4 Hormon Alamiah: Fondasi Gerakan
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono mt-1">
                  Klik atau arahkan kursor pada hormon untuk melihat bagaimana kami menyeimbangkannya
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
                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${h.bgColor} ${
                          isHovered 
                            ? 'border-brand-gold bg-slate-900/80 shadow-lg scale-102' 
                            : 'border-white/5 bg-brand-card/30'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-mono uppercase tracking-widest ${h.textColor} font-bold`}>
                              {h.name}
                            </span>
                            <Activity className={`w-3.5 h-3.5 ${isHovered ? 'animate-bounce text-brand-gold' : 'text-gray-500'}`} />
                          </div>
                          <h4 className="text-sm font-bold text-white tracking-tight">{h.slogan}</h4>
                          <p className="text-[11.5px] text-gray-400 leading-normal">{h.desc}</p>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
                          <span className="text-[9px] uppercase font-mono text-gray-500 block">Aksi Aliran Sehat:</span>
                          <p className="text-[10px] leading-tight text-brand-gold">{h.alignment}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Natural Slogan Callout */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 text-center space-y-2 font-mono">
                <div className="text-[10px] uppercase text-gray-500">Motto Gerakan</div>
                <div className="text-brand-gold text-sm font-black tracking-widest">
                "BERKARYA DENGAN KESADARAN, BERSANDAR PADA KEKUATAN ALAMIAH DIRI"
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
              
              {/* Left Panel: 3 Pillars structured directly corresponding to users VISI text */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-brand-card/60 backdrop-blur-sm border border-white/5 p-6 md:p-8 rounded-3xl space-y-6">
                  
                  {/* VISI #1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-brand-gold font-mono font-bold text-xs uppercase tracking-wide">
                      <Users className="w-4 h-4 text-brand-gold" />
                      <span>VISI #1 — SINERGI KAKAK-ADIK, BUKAN BOS-KARYAWAN</span>
                    </div>
                    <div className="text-gray-300 text-sm leading-relaxed space-y-3 font-serif">
                      <p className="font-bold text-white text-sm">
                      "Rumah ini adalah majelis ilmu, tempat Kakak berbagi cerita dan Adik membawa energi baru. Kita adalah keluarga."
                      </p>
                      <p className="text-[13px] text-gray-400 font-sans">
                      Gerakan ini berjalan di atas fondasi nonprofit dan keikhlasan. Kami <strong className="text-brand-gold">"mengkaryakan kebersamaan"</strong> dalam ruang-ruang dialog yang hangat, bukan sekadar memberi instruksi di ruang rapat yang dingin. Pengetahuan yang dibalut cinta akan melahirkan peradaban. Tanpa cinta, ia hanya akan jadi alat untuk saling menyakiti.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-4" />

                  {/* VISI #2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-brand-gold font-mono font-bold text-xs uppercase tracking-wide">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <span>VISI #2 — PEMBEBASAN RASA & IMAJINASI LIAR</span>
                    </div>
                    <div className="text-gray-300 text-sm leading-relaxed space-y-3 font-serif">
                      <p className="font-bold text-white text-sm">
                      "Rumah Adiksi adalah rumah dengan seribu jendela dan pintu. Silakan masuk, keluar, atau sekadar mengintip. Semua diterima."
                      </p>
                      <p className="text-[13px] text-gray-400 font-sans">
                      Kami mencari para <strong className="text-brand-gold">"pecandu"</strong> sejati: mereka yang kecanduan ide, musik, warna, dan kata-kata. Mereka yang menyimpan semesta di kepalanya tapi seringkali dianggap 'aneh'. Di sini, gagal adalah bagian dari proses, bingung adalah tanda berpikir, dan lelah adalah pengingat untuk istirahat, bukan menyerah.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-4" />

                  {/* VISI #3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-brand-gold font-mono font-bold text-xs uppercase tracking-wide">
                      <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                      <span>VISI #3 — BLOOMING WITH FLOWS: MEKAR BERSAMA ALIRAN</span>
                    </div>
                    <div className="text-gray-300 text-sm leading-relaxed space-y-3 font-serif">
                      <p className="font-bold text-white text-sm">
                      "Blooming with Flows adalah DNA gerakan ini. Kita tidak sedang berlomba, kita sedang menari bersama."
                      </p>
                      <p className="text-[13px] text-gray-400 font-sans">
                      Setiap dari kita adalah bunga yang unik. Ada yang mekar di bawah terik matahari, ada yang justru bersinar di bawah cahaya rembulan. Keduanya sama-sama indah. Kita mengalir dengan jujur, merayakan setiap warna, genre, dan bentuk karya. Karena mekar yang sesungguhnya adalah ketika kita berani menunjukkan warna asli kita, apa pun itu.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Panel: Interactive Tower Explorer Simulation */}
              <div className="lg:col-span-4 bg-gradient-to-b from-brand-subcard to-brand-card rounded-3xl p-6 border border-white/5 flex flex-col justify-between shadow-2xl space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider font-mono">
                  Menara Kearifan Lokal
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans">
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
                            ? 'bg-slate-900 border-brand-gold shadow-lg shadow-brand-gold/5'
                            : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                        }`}
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <span className="text-[10px] font-mono tracking-widest text-brand-gold uppercase">
                            LANTAI {tf.floor}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono italic">
                            {tf.tag}
                          </span>
                        </div>
                        <h5 className="text-[13px] font-bold text-white tracking-tight mt-1 relative z-10">
                          {tf.title}
                        </h5>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="relative z-10 mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-400 leading-relaxed space-y-1.5"
                            >
                              <p className="italic text-gray-300">"{tf.content}"</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-950/60 border border-white/5 rounded-2xl text-[10px] text-center font-mono text-gray-400">
                  <span className="text-brand-gold font-bold">Ideologi:</span> "Mekar bukan perlombaan."
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
              className="bg-brand-card/60 backdrop-blur-sm border border-white/5 p-6 md:p-8 rounded-3xl space-y-8"
            >
              <div className="border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-brand-gold uppercase tracking-widest font-mono block mb-1">
                # Misi Gerakan: Menemani Setiap Langkah Jiwa
                </span>
                <h3 className="text-xl font-serif font-black text-white">Dari Titik Terendah Menuju Karya Terbaik</h3>
              </div>

              <div className="text-gray-300 font-serif leading-relaxed text-sm md:text-base space-y-4 max-w-4xl">
                <p>
                Pada akhirnya, <strong className="text-white">"Rumah Adiksi"</strong> adalah sebuah teman perjalanan. Kami tidak berpretensi menjadi tujuan akhir, melainkan menjadi tempat singgah yang nyaman, tempat mengisi ulang energi sebelum kembali melanjutkan perjalanan. Kami tidak menghakimi, kami menemani.
                </p>
                <p>
                Bagaimana caranya? Dengan menyalurkan setiap gejolak energi ke dalam wadah yang sehat:
                </p>

                {/* Sub alignments bullet points matching verbatim text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 font-sans max-w-3xl">
                  {[
                    { tag: "Dopamin Sehat", val: "Membangun kreasi-karya seni lokal pesisir yang bermanfaat nyata.", color: "border-amber-500/20 text-amber-400" },
                    { tag: "Endorfin Benar", val: "Mengarahkan pengorbanan, pembelajaran kriya pantai, & ketangguhan mental.", color: "border-rose-500/20 text-rose-400" },
                    { tag: "Oksitosin Baik", val: "Membuka ruang diskusi hangat, persaudaraan erat, & obrolan tulus.", color: "border-indigo-500/20 text-indigo-400" },
                    { tag: "Serotonin Utuh", val: "Gaya hidup ramah lingkungan, menyatu alam, mengenali keunikan diri.", color: "border-emerald-500/20 text-emerald-400" }
                  ].map((x, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${x.color} bg-slate-950/20 space-y-1`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold block">{x.tag}</span>
                      <p className="text-gray-300 text-xs leading-relaxed">{x.val}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-6 text-gray-300 italic space-y-2 border-l-2 border-brand-gold/30 pl-4">
                  <p>"Tidak ada paksaan untuk tinggal, tidak ada larangan untuk pergi. Setiap jiwa berhak atas perjalanannya sendiri."
</p>
                  <p>"Misi kami sederhana: memastikan setiap orang yang singgah di sini bisa kembali melangkah dengan kepala tegak dan hati yang lebih ringan, sambil tetap membiarkan imajinasinya menyentuh bintang."
</p>
                </div>
              </div>

              {/* Three simple checks of success derived verbatim */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/5 text-xs text-gray-400 leading-relaxed font-sans">
                <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-white font-serif font-bold text-sm tracking-tight">Kemenangan Terang</span>
                  <p>"Jika di rumah ini salah satu dari kita menemukan sedikit terang untuk perjalanan selanjutnya, maka itu sudah lebih dari cukup bagi kita."</p>
                </div>
                <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-white font-serif font-bold text-sm tracking-tight">Penerimaan Diri</span>
                  <p>"Jika di rumah ini seseorang akhirnya berhenti membenci dirinya sendiri, maka itu sudah lebih dari cukup bagi kita."</p>
                </div>
                <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-white font-serif font-bold text-sm tracking-tight">Cinta Hari Esok</span>
                  <p>"Jika di rumah ini seseorang akhirnya menemukan alasan untuk tetap hidup, berkarya, dan percaya pada hari esok—maka seluruh menara ini telah menjalankan fungsinya."</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Epic Branding Footer Card & Slogans verbatim */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-brand-subcard via-brand-card to-brand-subcard border border-brand-gold/20 p-8 rounded-3xl text-center space-y-4 shadow-2xl relative overflow-hidden">
        
        {/* Abstract glowing effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-brand-gold/5 rounded-full filter blur-[80px] pointer-events-none -z-10" />

        <div className="space-y-2">
          <p className="text-xs text-brand-gold font-mono tracking-widest uppercase font-black">
          NILAI INTI GERAKAN
          </p>
          <blockquote className="text-2xl md:text-3xl font-serif font-black text-white italic tracking-wide">
            "Blooming with Flows"
          </blockquote>
          <p className="text-xs font-mono text-gray-400">
          — Dari Gejolak Menjadi Cahaya
          </p>
        </div>

        <div className="w-16 h-[1px] bg-brand-gold/20 mx-auto my-4" />

        <p className="text-sm text-gray-300 font-serif font-bold tracking-tight">
        Rumah Adiksi: Berbagi Ruang untuk Saling Menemukan Cahaya.
        </p>

        <p className="text-xs text-gray-500 font-sans max-w-sm mx-auto leading-relaxed">
        Mari mengalir, mekar, dan berkarya. Mari menjadi manusia seutuhnya.
        </p>
      </div>

    </div>
  );
}
