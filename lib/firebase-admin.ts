import { getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Resolve the service-account credential from (in order):
 *   1. FIREBASE_SERVICE_ACCOUNT  — full JSON string (preferred for Vercel)
 *   2. firebase-adminsdk.json    — local dev file (gitignored)
 * Returns null if neither is available, so the app keeps working without push.
 */
function resolveCredential(): ServiceAccount | null {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as ServiceAccount;
    } catch (err) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT JSON:', err);
      return null;
    }
  }
  try {
    // Local development fallback — file is gitignored and absent on Vercel.
    return require('../firebase-adminsdk.json') as ServiceAccount;
  } catch {
    return null;
  }
}

if (getApps().length === 0) {
  const credential = resolveCredential();
  if (credential) {
    try {
      initializeApp({ credential: cert(credential) });
    } catch (error: any) {
      console.error('Firebase admin initialization error', error?.stack || error);
    }
  } else {
    console.warn('[firebase-admin] No credentials found — push notifications disabled.');
  }
}

export const adminDb = getApps().length ? getFirestore() : null;
export const messaging = getApps().length ? getMessaging() : null;
