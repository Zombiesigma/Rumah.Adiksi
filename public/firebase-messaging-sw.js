/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import the Firebase app and messaging services
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Your web app's Firebase configuration - this is sourced from your project's config
const firebaseConfig = {
  apiKey: "AIzaSyC1kLPJEQK1d4DKkGI80d1fjbqCJgbxvss",
  authDomain: "rumah-adiksi.firebaseapp.com",
  projectId: "rumah-adiksi",
  storageBucket: "rumah-adiksi.appspot.com",
  messagingSenderId: "105934868931",
  appId: "1:105934868931:web:d3e78fe3d17287bb3aad76",
  measurementId: "G-QLMCVDC4H7"
};

// Initialize the Firebase app in the service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * Handle background messages. When a notification is received while the app is in the background,
 * this callback will be triggered.
 */
onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize the notification Title and Body
    const notificationTitle = payload.notification?.title || 'Rumah Adiksi';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message.',
        icon: '/logo.png' // Optional: Use your app logo
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
