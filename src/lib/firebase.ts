// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration from the flow-v4 project
const firebaseConfig = {
  apiKey: "AIzaSyAxl3H3DT0DYcQq8CAyMks8RMOq4r2yQTQ",
  authDomain: "flow-v4.firebaseapp.com",
  projectId: "flow-v4",
  storageBucket: "flow-v4.appspot.com",
  messagingSenderId: "466020342186",
  appId: "1:466020342186:web:6f719ae63d5817b359f3d3",
  databaseURL: "https://flow-v4-default-rtdb.asia-southeast1.firebasedatabase.app"
};


// Log the project ID to the browser console to help debug connection issues.
if (typeof window !== 'undefined') {
  if (!firebaseConfig.projectId) {
    console.error("FIREBASE CONNECTION FAILED: Firebase config is missing.");
  } else {
    console.log("Attempting to connect to Firebase project:", firebaseConfig.projectId);
  }
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
