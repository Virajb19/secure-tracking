/**
 * Firebase Configuration for Admin CMS
 * 
 * This module initializes Firebase for web push notifications.
 * Uses Firebase Cloud Messaging (FCM) for browser notifications.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAvvr3zip-fa10KY83HcXcOr8hGF2lP2uE",
  authDomain: "tracking-aa41a.firebaseapp.com",
  projectId: "tracking-aa41a",
  storageBucket: "tracking-aa41a.firebasestorage.app",
  messagingSenderId: "399583690209",
  appId: "1:399583690209:web:13ed15bba0ac06640ca6a0",
  measurementId: "G-4EJ3W0D19J"
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

/**
 * Get Firebase Messaging instance (browser only)
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') {
    return null; // Server-side, no messaging
  }

  if (!messaging) {
    const app = getFirebaseApp();
    messaging = getMessaging(app);
  }
  return messaging;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase] Notification permission denied');
      return null;
    }

    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      return null;
    }

    // Get FCM token
    // Note: You'll need to add your VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    console.log('[Firebase] FCM Token:', token);
    return token;
  } catch (error) {
    console.error('[Firebase] Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  return onMessage(messagingInstance, (payload) => {
    console.log('[Firebase] Foreground message received:', payload);
    callback(payload);
  });
}

export { firebaseConfig };
