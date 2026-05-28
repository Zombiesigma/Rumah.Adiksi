/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1. Gunakan importScripts untuk memuat library Firebase Compat dari CDN
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 2. Konfigurasi Firebase kamu (sudah sesuai dengan milikmu)
const firebaseConfig = {
  apiKey: "AIzaSyC1kLPJEQK1d4DKkGI80d1fjbqCJgbxvss",
  authDomain: "rumah-adiksi.firebaseapp.com",
  projectId: "rumah-adiksi",
  storageBucket: "rumah-adiksi.appspot.com",
  messagingSenderId: "105934868931",
  appId: "1:105934868931:web:d3e78fe3d17287bb3aad76",
  measurementId: "G-QLMCVDC4H7"
};

// 3. Inisialisasi Firebase menggunakan sintaks compat
firebase.initializeApp(firebaseConfig);

// 4. Panggil messaging
const messaging = firebase.messaging();

/**
 * 5. Handle background messages. 
 * Ini akan memicu notifikasi saat aplikasi berjalan di background.
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Kustomisasi Judul dan Body Notifikasi
    const notificationTitle = payload.notification?.title || 'Rumah Adiksi';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message.',
        icon: '/logo.png' // Pastikan file logo.png benar-benar ada di folder public kamu
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
