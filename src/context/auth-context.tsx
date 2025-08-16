// src/context/auth-context.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  Auth,
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, DocumentData } from "firebase/firestore";

interface UserData extends DocumentData {
    name?: string;
    email?: string;
    avatarUrl?: string;
    bio?: string;
    isPrivate?: boolean;
    blockedUsers?: string[];
    blockedBy?: string[];
    permissionsRequested?: boolean;
    totalLikes?: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
  blockUser: (userIdToBlock: string) => Promise<void>;
  unblockUser: (userIdToUnblock: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setIsAdmin(user.uid === process.env.NEXT_PUBLIC_ADMIN_UID);
      } else {
        setIsAdmin(false);
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserData({
                  ...data,
                  avatarUrl: user.photoURL ?? data.avatarUrl,
                });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }
  }, [user]);

  const signUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });

      // Create a user document in Firestore
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        name: displayName,
        email: email,
        avatarUrl: `https://placehold.co/100x100.png`,
        bio: `Welcome to my Flow v3 profile!`,
        isPrivate: false, // Default to public profile
        twitter: "",
        instagram: "",
        github: "",
        youtube: "",
        facebook: "",
        blockedUsers: [],
        blockedBy: [],
        permissionsRequested: false, // Initialize permission status
        totalLikes: 0, // Initialize total likes
      });

      setUser(userCredential.user);
      return userCredential;
    } catch (error) {
        console.error("Error signing up:", error);
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
     setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      return userCredential;
    } catch(error) {
        console.error("Error signing in:", error);
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
        if(user) {
            // Clear notification token on sign out
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { notificationToken: null }, { merge: true });
        }
        await firebaseSignOut(auth);
        setUser(null);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const blockUser = async (userIdToBlock: string) => {
    if (!user) throw new Error("Not authenticated");
    const currentUserRef = doc(db, "users", user.uid);
    const targetUserRef = doc(db, "users", userIdToBlock);

    await updateDoc(currentUserRef, {
        blockedUsers: arrayUnion(userIdToBlock)
    });
     await updateDoc(targetUserRef, {
        blockedBy: arrayUnion(user.uid)
    });
  }

  const unblockUser = async (userIdToUnblock: string) => {
    if (!user) throw new Error("Not authenticated");
    const currentUserRef = doc(db, "users", user.uid);
    const targetUserRef = doc(db, "users", userIdToUnblock);
    
    await updateDoc(currentUserRef, {
        blockedUsers: arrayRemove(userIdToUnblock)
    });
    await updateDoc(targetUserRef, {
        blockedBy: arrayRemove(user.uid)
    });
  }
  
  const value = {
    user,
    userData,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    blockUser,
    unblockUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
