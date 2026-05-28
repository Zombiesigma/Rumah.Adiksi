import { Award, Compass, Feather, Users, Wind, Droplets } from 'lucide-react';
import React from 'react';
import { motion } from 'motion/react';

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <motion.div 
        className="bg-brand-card border border-white/10 rounded-2xl p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="flex justify-center items-center mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold font-serif text-brand-gold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{children}</p>
    </motion.div>
);

export default function AboutUs() {
  return (
    <div className="bg-brand-charcoal text-white">
      <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
        >
          <Compass className="mx-auto text-brand-gold h-12 w-12" />
          <h1 className="mt-4 text-4xl md:text-6xl font-black font-serif tracking-tight text-white">
            Kami Adalah Sungai, Bukan Bendungan.
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-gray-400 leading-relaxed">
            Di Rumah Adiksi, kami percaya kegelisahan adalah energi suci. Misi kami adalah mengalirkannya menjadi karya yang menginspirasi, menciptakan <strong className="text-white">kecanduan positif</strong>.
          </p>
        </motion.div>

        {/* Philosophy Section */}
        <div className="mb-20">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold font-serif text-white">Filosofi Inti Kami</h2>
                <p className="text-gray-400 mt-2">Energi murni yang siap diluncurkan.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <FeatureCard icon={<Feather size={40} className="text-brand-gold" />} title="Kegelisahan adalah Energi">
                    Setiap "kegelisahan" adalah imajinasi di puncak gunung, siap meluncur turun. Kami tidak membendungnya; kami membuatkan sungai untuknya.
                </FeatureCard>
                 <FeatureCard icon={<Wind size={40} className="text-brand-gold" />} title="Pelabuhan Ide Liar">
                    Kami adalah pelabuhan untuk ide-ide liar, mimpi, dan hasrat. Tempat singgah yang nyaman untuk mengisi ulang energi sebelum kembali berlayar.
                </FeatureCard>
                 <FeatureCard icon={<Droplets size={40} className="text-brand-gold" />} title="Menemani, Bukan Menghakimi">
                    Pada akhirnya, Rumah Adiksi adalah teman seperjalanan. Kami tidak berpretensi menjadi tujuan akhir. Kami tidak menghakimi, kami menemani.
                </FeatureCard>
            </div>
        </div>

        {/* Mission Section */}
        <div className="bg-brand-card border border-white/5 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold font-serif text-white">Misi & Wadah Sehat Kami</h2>
                <p className="text-gray-400 mt-2">Bagaimana kami menyalurkan setiap gejolak energi.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-start space-x-4">
                    <div className="bg-brand-gold/10 p-3 rounded-xl border border-brand-gold/20"><Award className="h-8 w-8 text-brand-gold" /></div>
                    <div>
                        <h4 className="font-bold text-white text-lg">Memberdayakan Talenta</h4>
                        <p className="text-gray-400 text-sm mt-1">Menjadi panggung bagi seniman, musisi, dan perajin lokal untuk bersinar dan mendapatkan apresiasi ekonomi.</p>
                    </div>
                </div>
                <div className="flex items-start space-x-4">
                     <div className="bg-brand-gold/10 p-3 rounded-xl border border-brand-gold/20"><Feather className="h-8 w-8 text-brand-gold" /></div>
                    <div>
                        <h4 className="font-bold text-white text-lg">Menyelenggarakan Acara</h4>
                        <p className="text-gray-400 text-sm mt-1">Menggelar pameran seni, lokakarya, pertunjukan akustik, dan berbagai acara budaya untuk merayakan kreativitas.</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-4">
                     <div className="bg-brand-gold/10 p-3 rounded-xl border border-brand-gold/20"><Users className="h-8 w-8 text-brand-gold" /></div>
                    <div>
                        <h4 className="font-bold text-white text-lg">Membangun Komunitas</h4>
                        <p className="text-gray-400 text-sm mt-1">Merajut jembatan empati melalui cerita, tawa, dan air mata, membangun kekuatan untuk terus bertumbuh bersama.</p>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Concluding Section */}
        <div className="text-center mt-20">
            <h3 className="font-serif text-2xl text-white">
                "Bukan melawan arus, tapi <strong className="text-brand-gold">menari bersamanya.</strong>"
            </h3>
            <p className="text-gray-500 mt-2 text-sm">
            Mengalir dari puncak kegelisahan, menyusuri sungai-sungai kemungkinan, dan bermuara pada samudra karya.
            </p>
        </div>
      </div>
    </div>
  );
}
