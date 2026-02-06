/**
 * Firebase Client Configuration
 *
 * This config is for client-side Firebase features (Analytics, etc.)
 * Note: API keys in Firebase web configs are designed to be public.
 * Security is enforced via Firebase Security Rules.
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCQfNrdug3T181tCeouEOvrbBsa7sGov0k",
  authDomain: "usb-csat-mj-generator.firebaseapp.com",
  projectId: "usb-csat-mj-generator",
  storageBucket: "usb-csat-mj-generator.firebasestorage.app",
  messagingSenderId: "1007374264855",
  appId: "1:1007374264855:web:ef2934a68dbaa2571c8a52",
  measurementId: "G-2LT19LT53H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environments that support it)
let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log('[Firebase] Analytics initialized');
  }
}).catch(err => {
  console.warn('[Firebase] Analytics not supported:', err.message);
});

export { app, analytics };
export default app;
