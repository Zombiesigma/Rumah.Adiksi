import { getMessaging, isSupported, getToken, onMessage, Messaging } from 'firebase/messaging';
import { db } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

let messagingInstance: Messaging | null = null;

// Initialize Firebase Messaging safely
export async function initFirebaseMessaging(): Promise<Messaging | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Cloud Messaging is not supported in this browser/environment.');
      return null;
    }
    
    if (!messagingInstance) {
      const { initializeApp } = await import('firebase/app');
      const { default: firebaseConfig } = await import('../../firebase-applet-config.json');
      const app = initializeApp(firebaseConfig);
      messagingInstance = getMessaging(app);
      
      // Listen for foreground notifications
      onMessage(messagingInstance, (payload) => {
        console.log('Notification received in foreground: ', payload);
        const title = payload.notification?.title || 'Notifikasi Baru';
        const body = payload.notification?.body || '';
        
        // Show in-app via toast and also trigger native container
        triggerNotificationBridge(body, title);
      });
    }
    
    return messagingInstance;
  } catch (err) {
    console.warn('Failed to initialize Firebase Messaging:', err);
    return null;
  }
}

/**
 * Requests notification permission and retrieves/registers the FCM Token
 * @param userId Optional userId to associate the token with in Firestore
 */
export async function registerFcmToken(userId?: string): Promise<string | null> {
  try {
    const messaging = await initFirebaseMessaging();
    if (!messaging) return null;

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    // Check permission
    if (Notification.permission === 'denied') {
      console.warn('Notification permission is denied.');
      return null;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission was not granted.');
        return null;
      }
    }

    // Retrieve FCM token
    const token = await getToken(messaging);
    if (token) {
      console.log('FCM Device Token retrieved successfully:', token);
      
      // Save to Firestore under user document if logged in
      if (userId) {
        try {
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            fcmTokens: arrayUnion(token),
            lastActive: new Date().toISOString()
          });
          console.log(`FCM Token registered for user ${userId} in Firestore.`);
        } catch (dbErr) {
          console.error('Failed to save FCM token to Firestore:', dbErr);
        }
      }
      return token;
    }
    return null;
  } catch (err) {
    console.warn('Could not register FCM Token:', err);
    return null;
  }
}

/**
 * Triggers notification to native WebView container (if present) OR local events.
 * Bridges between Web page (JavaScript) and Android Mobile App (Java/Kotlin).
 */
export function triggerNotificationBridge(message: string, title: string = 'Rumah Adiksi') {
  console.log(`[Notification Bridge] Triggering: [${title}] ${message}`);

  // 1. Android JavaScriptInterface bridging scenario
  // If window.Android or window.Android.tampilkanNotif exists
  const win = window as any;
  if (win.Android) {
    try {
      if (typeof win.Android.tampilkanNotif === 'function') {
        win.Android.tampilkanNotif(message);
        console.log('[Notification Bridge] Succesfully sent message to Android.tampilkanNotif');
      } else if (typeof win.Android.showNotification === 'function') {
        win.Android.showNotification(title, message);
        console.log('[Notification Bridge] Succesfully sent message to Android.showNotification');
      } else {
        console.warn('[Notification Bridge] window.Android interface found but missing tampilkanNotif / showNotification functions.');
      }
    } catch (e) {
      console.error('[Notification Bridge] Error calling window.Android interface:', e);
    }
  }

  // 2. Dispatch custom event for our React in-app visual toast list
  const event = new CustomEvent('web-to-native-notification', {
    detail: { message, title }
  });
  window.dispatchEvent(event);
}
