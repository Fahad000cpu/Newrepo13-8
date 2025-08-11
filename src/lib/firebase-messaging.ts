// src/lib/firebase-messaging.ts
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "./firebase";
import { doc, setDoc, query, collection, where, getDocs, writeBatch } from "firebase/firestore";

const VAPID_KEY = "BMppf757iqQldw-r5kLklfT8lPCkkFujiInCx3Ez2mvt6bkWA5Wpnd5IOhURh-Uo3qg595jHur59SVDetk66u4k";

export const requestNotificationPermission = async (userId: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }
  
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("Notification permission granted.");
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (currentToken) {
        console.log("FCM Token:", currentToken);
        
        // Find if any other user has this token and remove it
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("notificationToken", "==", currentToken));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            if (doc.id !== userId) {
                console.log(`Removing token from old user: ${doc.id}`);
                const oldUserRef = doc.ref;
                batch.update(oldUserRef, { notificationToken: null });
            }
        });
        await batch.commit();

        // Save the token to the current user's Firestore document
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { notificationToken: currentToken }, { merge: true });
        console.log(`Token assigned to current user: ${userId}`);

      } else {
        console.log("No registration token available. Request permission to generate one.");
      }
    } else {
      console.log("Unable to get permission to notify.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
  }
};

export const onMessageListener = () => {
  const messaging = getMessaging(app);
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received. ", payload);
      resolve(payload);
    });
  });
};
