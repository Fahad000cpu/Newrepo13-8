// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK.
// It checks if the app is already initialized to prevent errors.
// It retrieves the service account key from environment variables,
// which is a secure way to handle credentials on the server.

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Error parsing Firebase service account key:', error);
    throw new Error('The Firebase service account key is not a valid JSON string.');
  }
};

export const adminApp = initializeFirebaseAdmin();
export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();
