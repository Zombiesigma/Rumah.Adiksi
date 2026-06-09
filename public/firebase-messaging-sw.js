// Minimal Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "rumah-adiksi",
  appId: "1:105934868931:web:d3e78fe3d17287bb3aad76",
  apiKey: "AIzaSyC1kLPJEQK1d4DKkGI80d1fjbqCJgbxvss",
  authDomain: "rumah-adiksi.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "rumah-adiksi.firebasestorage.app",
  messagingSenderId: "105934868931"
});

const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
