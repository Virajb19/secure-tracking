/**
 * Firebase Configuration for Mobile App (Expo)
 * 
 * This module initializes Firebase for the React Native mobile app.
 * Note: For Expo Go, we use expo-notifications with FCM device tokens.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

// Firebase configuration from Firebase Console
export const firebaseConfig = {
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

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized Firebase app');
  } else {
    app = getApps()[0];
  }
  return app;
}

// Initialize on import
getFirebaseApp();

export default app!;
