
// src/components/permissions-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BellRing, MapPin } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { requestNotificationPermission } from "@/lib/firebase-messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export function PermissionsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, userData } = useAuth();

  useEffect(() => {
    if (!user || !userData) return;

    // Check if we've already asked for permissions from this user
    if (userData.permissionsRequested === undefined || userData.permissionsRequested === false) {
       const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000); // 3-second delay
      return () => clearTimeout(timer);
    }
  }, [user, userData]);

  const markPermissionAsRequested = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
        await setDoc(userRef, { permissionsRequested: true }, { merge: true });
    } catch (error) {
        console.error("Failed to mark permission as requested:", error);
    }
  }

  const handleAllow = async () => {
    if (!user) return;
    
    console.log("Requesting Notification permissions...");
    await requestNotificationPermission(user.uid);

    console.log("Requesting Geolocation permissions...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Location obtained:", latitude, longitude);
          // Save location to Firestore
          const userRef = doc(db, "users", user.uid);
          try {
            await setDoc(userRef, {
                location: {
                    lat: latitude,
                    lon: longitude
                }
            }, { merge: true });
            console.log("User location saved to Firestore.");
          } catch(error) {
              console.error("Failed to save location:", error);
          }
        },
        (error) => {
          console.error("Geolocation error:", error.message);
        }
      );
    }
    
    await markPermissionAsRequested();
    setIsOpen(false);
  };

  const handleDeny = async () => {
    await markPermissionAsRequested();
    setIsOpen(false);
  };

  if (!user || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Enhance Your Experience</DialogTitle>
          <DialogDescription>
            Allow notifications and location access to get the most out of Flow V6. We'll only use them to provide relevant updates and content.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 my-4">
            <div className="flex items-center gap-4">
                <BellRing className="h-8 w-8 text-primary"/>
                <p>Get notified about new trends and messages.</p>
            </div>
             <div className="flex items-center gap-4">
                <MapPin className="h-8 w-8 text-primary"/>
                <p>Discover products and curators near you.</p>
            </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="secondary" onClick={handleDeny}>
            Maybe Later
          </Button>
          <Button type="button" onClick={handleAllow}>
            Allow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
