// src/context/firebase-messaging-context.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMessaging, onMessage } from "firebase/messaging";
import { app } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./auth-context";

interface FirebaseMessagingContextType {
  // You can add properties here if needed in the future
}

const FirebaseMessagingContext = createContext<FirebaseMessagingContextType | undefined>(undefined);

export function FirebaseMessagingProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const messaging = getMessaging(app);
        
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground message received.", payload);
            toast({
                title: payload.notification?.title,
                description: payload.notification?.body,
            });
        });

        return () => {
            unsubscribe();
        };
    }
  }, [toast]);
  
  useEffect(() => {
    // This effect will run when the user logs in, to initialize permissions.
    // The actual permission request is now in the PermissionsDialog.
    if(user){
        console.log("User logged in, FCM provider is active.");
    }
  }, [user])


  const value = {
    // context values
  };

  return <FirebaseMessagingContext.Provider value={value}>{children}</FirebaseMessagingContext.Provider>;
}

export function useFirebaseMessaging() {
  const context = useContext(FirebaseMessagingContext);
  if (context === undefined) {
    throw new Error("useFirebaseMessaging must be used within a FirebaseMessagingProvider");
  }
  return context;
}
