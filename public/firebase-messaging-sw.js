// public/firebase-messaging-sw.js

// This file must be in the public directory to be served at the root of the domain.

// Import the Firebase scripts for the modular SDK (v9+)
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Your web app's Firebase configuration from the flow-v4 project
// IMPORTANT: This config must match the one in your main app (src/lib/firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyAxl3H3DT0DYcQq8CAyMks8RMOq4r2yQTQ",
  authDomain: "flow-v4.firebaseapp.com",
  projectId: "flow-v4",
  storageBucket: "flow-v4.appspot.com",
  messagingSenderId: "466020342186",
  appId: "1:466020342186:web:6f719ae63d5817b359f3d3",
  databaseURL: "https://flow-v4-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// This function will be triggered when a push notification is received while the app is in the background.
onBackgroundMessage(messaging, (payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Customize the notification display here
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: "/favicon.ico", // You can change this to your app's logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
