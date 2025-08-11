
// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBIcz7mSDzIwB7U9LorPbIIGPBUntoxnRs",
  authDomain: "linkshare-g906j.firebaseapp.com",
  databaseURL: "https://linkshare-g906j-default-rtdb.firebaseio.com",
  projectId: "linkshare-g906j",
  storageBucket: "linkshare-g906j.appspot.com",
  messagingSenderId: "64008378258",
  appId: "1:64008378258:web:3d8f999d08cc56088ad34b"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
