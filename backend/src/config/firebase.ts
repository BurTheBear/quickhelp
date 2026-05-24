import admin from 'firebase-admin';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_PRIVATE_KEY || !config.FIREBASE_CLIENT_EMAIL) {
    logger.warn('Firebase credentials not configured — push notifications disabled');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
      }),
    });

    logger.info('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (err) {
    logger.error('Failed to initialize Firebase:', err);
    return null;
  }
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  if (!firebaseApp) return null;
  return admin.messaging(firebaseApp);
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  if (!firebaseApp) return null;
  return admin.auth(firebaseApp);
}
