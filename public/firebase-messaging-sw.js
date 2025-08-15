// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxl3H3DT0DYcQq8CAyMks8RMOq4r2yQTQ",
  authDomain: "flow-v4.firebaseapp.com",
  databaseURL: "https://flow-v4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "flow-v4",
  storageBucket: "flow-v4.appspot.com",
  messagingSenderId: "466020342186",
  appId: "1:466020342186:web:6f719ae63d5817b359f3d3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/favicon.ico' 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
