/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  MapPin,
  Bell,
  Check,
  Volume2,
  VolumeX,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { ArtEvent } from '../types';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import EventDetail from './EventDetail';


interface EventsSectionProps {
  events: ArtEvent[];
  setEvents: React.Dispatch<React.SetStateAction<ArtEvent[]>>;
  notifications: Array<{ id: string; message: string; timestamp: string }>;
  addNotification: (msg: string) => void;
  clearNotifications: () => void;
}

export default function EventsSection({
  events,
  setEvents,
  notifications,
  addNotification,
  clearNotifications
}: EventsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Pameran' | 'Konser' | 'Workshop' | 'Bazaar'>('All');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ArtEvent | null>(null);


  const playChime = () => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(783.99, now); 
      osc2.frequency.setValueAtTime(1046.50, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (activeCategory === 'All') return true;
    return ev.category === activeCategory;
  });

  const handleRSVP = async (e: React.MouseEvent, eventId: string, title: string) => {
    e.stopPropagation();
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return;

    const alreadyRegistered = !!event.isRegistered;
    const updatedEvent: ArtEvent = {
      ...event,
      isRegistered: !alreadyRegistered,
      registeredCount: alreadyRegistered 
        ? Math.max(0, event.registeredCount - 1) 
        : event.registeredCount + 1
    };

    try {
      await setDoc(doc(db, 'events', eventId), cleanUndefined(updatedEvent));
      if (!alreadyRegistered) {
        addNotification(`RSVP berhasil! Anda terdaftar dalam "${title}". Tiket QR dikirim ke surel.`);
        playChime();
      } else {
        addNotification(`Pendaftaran dibatalkan untuk acara "${title}".`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    }
  };

  const handleEventSelect = (event: ArtEvent) => {
      setSelectedEvent(event);
  }

  const handleBackFromDetail = () => {
      setSelectedEvent(null);
  }

  if (selectedEvent) {
      return <EventDetail event={selectedEvent} onBack={handleBackFromDetail} />
  }

  return (
    <div className="space-y-8 py-4 text-gray-900">
      {/* Event Header with Notification Center overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
        {/* Left Column: Events Listing */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-2 border-b border-gray-200 pb-6">
            <span className="text-xs font-mono text-brand-accent uppercase tracking-wider font-extrabold">UPCOMING ART ACTIVATIONS</span>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-3xl font-extrabold text-brand-green tracking-tight">Kanal Acara Seni</h2>
              {/* Audio controller clicker */}
              <button
                onClick={() => {
                  setAudioEnabled(!audioEnabled);
                  playChime();
                }}
                className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                  audioEnabled
                    ? 'bg-amber-50 text-brand-accent border-brand-accent/30 font-bold'
                    : 'bg-gray-50 text-gray-505 border-gray-200'
                }`}
                title={audioEnabled ? "Matikan suara bell" : "Aktifkan suara bell"}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-brand-accent animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline font-mono">{audioEnabled ? 'Bel Aktif' : 'Bel Senyap'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Jangan lewatkan aneka program, pameran kriya kayu daur ulang, sesi kumpul musik folk, dan bazaar kreatif pemuda Pelabuhan Ratu.
            </p>
          </div>

          {/* Event Category Selector */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'All', label: 'Semua Acara' },
              { id: 'Pameran', label: 'Eksibisi / Pameran' },
              { id: 'Konser', label: 'Konser / Akustik' },
              { id: 'Workshop', label: 'Pelatihan Kelas' },
              { id: 'Bazaar', label: 'Bazaar UMKM' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  activeCategory === cat.id
                    ? 'bg-brand-accent text-white font-bold shadow-md shadow-brand-accent/20'
                    : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid of Events */}
          <div className="space-y-6" id="art-events-list">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleEventSelect(ev)}
                className="group relative bg-white rounded-2xl border border-gray-200 hover:border-brand-accent/20 overflow-hidden flex flex-col md:flex-row gap-6 p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
              >
                {/* Image panel with zoom and glow */}
                <div className="md:w-1/3 aspect-[16/10] md:aspect-square rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative border border-gray-100">
                  <img
                    src={ev.bannerUrl}
                    alt={ev.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                  />
                  <div className="absolute top-2 left-2 z-10 px-2.5 py-0.5 rounded-md text-[9px] uppercase font-mono font-bold bg-white/95 text-brand-accent border border-brand-accent/15 shadow-sm">
                    {ev.category}
                  </div>
                </div>

                {/* Event text metrics */}
                <div className="flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-gray-900 group-hover:text-brand-accent transition-colors leading-tight">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                      {ev.description}
                    </p>

                    {/* Meta labels */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-gray-500">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                        <span>{ev.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-brand-accent" />
                        <span>{ev.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 sm:col-span-2 text-gray-700">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <MapPin className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" />
                          <span className="line-clamp-1 truncate text-[11px]">{ev.location}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMapId(expandedMapId === ev.id ? null : ev.id);
                          }}
                          className={`shrink-0 text-[9px] uppercase font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all duration-300 ${
                            expandedMapId === ev.id
                              ? 'bg-brand-accent text-white border-brand-accent font-bold shadow-sm'
                              : 'bg-white text-brand-accent border-brand-accent/25 hover:bg-brand-accent/10'
                          }`}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{expandedMapId === ev.id ? 'Tutup Peta' : 'Peta Lokasi'}</span>
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedMapId === ev.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 180, opacity: 1, marginTop: 12 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden rounded-xl border border-gray-200 relative z-30 h-[180px] shadow-inner"
                        >
                          <iframe
                            title={`Map for ${ev.location}`}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(ev.location + ', Pelabuhan Ratu')}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="opacity-95 hover:opacity-100 transition-opacity duration-300"
                          ></iframe>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Register action line */}
                  <div className="pt-3 border-t border-gray-150 flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono text-brand-accent font-bold">
                      🎟 {ev.registeredCount} orang terdaftar
                    </span>

                    <button
                      onClick={(e) => handleRSVP(e, ev.id, ev.title)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer hover:scale-101 ${
                        ev.isRegistered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-brand-accent hover:bg-brand-green text-white font-bold shadow-sm'
                      }`}
                      id={`btn-rsvp-${ev.id}`}
                    >
                      {ev.isRegistered ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" /> Terdaftar (RSVP)
                        </>
                      ) : (
                        'Amankan Kursi (Gratis)'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-gray-505 text-xs">Belum ada jadwal acara pada kategori ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Notification Center */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs uppercase font-mono font-bold text-brand-green tracking-widest flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-accent animate-bounce" /> Pusat Notifikasi Acara
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-[9px] font-mono text-gray-500 hover:text-rose-600 cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {/* Notification logs panel */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1" id="notifications-logs">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-gray-50 border border-gray-150 p-3 rounded-xl hover:border-brand-accent/20 transition-colors"
                >
                  <div className="flex justify-between items-start text-[10px] font-mono text-gray-505">
                    <span className="text-brand-accent font-bold flex items-center gap-1">
                      <Bell className="w-2.5 h-2.5 text-brand-accent" /> UPDATE EVENT
                    </span>
                    <span>{notif.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-800 mt-1 leading-relaxed">{notif.message}</p>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-8 text-gray-400 space-y-2">
                  <Bell className="w-6 h-6 text-gray-350 mx-auto animate-pulse" />
                  <p className="text-[11px] font-mono font-bold">Kotak masuk notifikasi kosong.</p>
                  <p className="text-[10px] text-gray-500 block leading-tight">Daftar salah satu kelas pameran seni di sebelah kiri untuk melihat notifikasi instan!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
