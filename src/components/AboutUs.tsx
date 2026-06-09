import { Award, Compass, Feather, Users, Wind, Droplets } from 'lucide-react';
import React from 'react';
import { motion } from 'motion/react';

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <motion.div 
        className="bg-white border border-gray-150 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="flex justify-center items-center mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold font-sans text-brand-green mb-2">{title}</h3>
        <p className="text-gray-650 text-sm leading-relaxed">{children}</p>
    </motion.div>
);

export default function AboutUs() {
  return (
    <div className="bg-brand-cream text-gray-900">
      <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
        >
          <Compass className="mx-auto text-brand-accent h-12 w-12" />
          <h1 className="mt-4 text-4xl md:text-6xl font-black font-sans tracking-tight text-brand-green">
            Kami Adalah Sungai, Bukan Bendungan.
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-gray-600 leading-relaxed">
            Di Rumah Adiksi, kami percaya kegelisahan adalah energi suci. Misi kami adalah mengalirkannya menjadi karya yang menginspirasi, menciptakan <strong className="text-brand-accent font-black">kecanduan positif</strong> melalui kopi dan eksplorasi karya.
          </p>
        </motion.div>

        {/* Philosophy Section */}
        <div className="mb-20">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold font-sans text-brand-green">Filosofi Inti Kami</h2>
                <p className="text-gray-500 mt-2">Energi murni yang siap diluncurkan.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <FeatureCard icon={<Feather size={40} className="text-brand-accent" />} title="Kegelisahan adalah Energi">
                    Setiap "kegelisahan" adalah imajinasi di puncak gunung, siap meluncur turun. Kami tidak membendungnya; kami membuatkan sungai untuknya.
                </FeatureCard>
                 <FeatureCard icon={<Wind size={40} className="text-brand-accent" />} title="Pelabuhan Ide Liar">
                    Kami adalah pelabuhan untuk ide-ide liar, mimpi, dan hasrat. Tempat singgah yang nyaman untuk mengisi ulang energi sebelum kembali berlayar.
                </FeatureCard>
                 <FeatureCard icon={<Droplets size={40} className="text-brand-accent" />} title="Menemani, Bukan Menghakimi">
                    Pada akhirnya, Rumah Adiksi adalah teman seperjalanan. Kami tidak berpretensi menjadi tujuan akhir. Kami tidak menghakimi, kami menemani.
                </FeatureCard>
            </div>
        </div>

        {/* Mission Section */}
        <div className="bg-white border border-gray-150 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold font-sans text-brand-green">Misi & Wadah Sehat Kami</h2>
                <p className="text-gray-500 mt-2">Bagaimana kami menyalurkan setiap gejolak energi.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-start space-x-4">
                    <div className="bg-brand-accent/10 p-3 rounded-xl border border-brand-accent/20"><Award className="h-8 w-8 text-brand-accent" /></div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg">Memberdayakan Talenta</h4>
                        <p className="text-gray-600 text-sm mt-1">Menjadi panggung bagi seniman, musisi, dan perajin lokal untuk bersinar dan mendapatkan apresiasi ekonomi.</p>
                    </div>
                </div>
                <div className="flex items-start space-x-4">
                     <div className="bg-brand-accent/10 p-3 rounded-xl border border-brand-accent/20"><Feather className="h-8 w-8 text-brand-accent" /></div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg">Menyelenggarakan Acara</h4>
                        <p className="text-gray-600 text-sm mt-1">Menggelar pameran seni, lokakarya, pertunjukan akustik, dan berbagai acara budaya untuk merayakan kreativitas.</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-4">
                     <div className="bg-brand-accent/10 p-3 rounded-xl border border-brand-accent/20"><Users className="h-8 w-8 text-brand-accent" /></div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg">Membangun Komunitas</h4>
                        <p className="text-gray-600 text-sm mt-1">Merajut jembatan empati melalui cerita, tawa, dan air mata, membangun kekuatan untuk terus bertumbuh bersama.</p>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Concluding Section */}
        <div className="text-center mt-20">
            <h3 className="font-sans text-2xl text-brand-green font-bold">
                "Bukan melawan arus, tapi <strong className="text-brand-accent font-black">menari bersamanya.</strong>"
            </h3>
            <p className="text-gray-500 mt-2 text-sm">
            Mengalir dari puncak kegelisahan, menyusuri sungai-sungai kemungkinan, dan bermuara pada samudra karya.
            </p>
        </div>
      </div>
    </div>
  );
}
