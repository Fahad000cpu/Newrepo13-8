// src/components/status-list.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle } from "lucide-react";
import { StatusViewer } from "./status-viewer";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy, documentId } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";

export type Story = {
  id: string;
  type: "image" | "video";
  url: string;
  duration: number; // in seconds
  timestamp: string;
  createdAt: Timestamp; // Keep the original timestamp for sorting
};

export type UserWithStories = {
  userId: string;
  username: string;
  avatarUrl: string;
  stories: Story[];
};

export function StatusList() {
  const [storiesByUser, setStoriesByUser] = useState<UserWithStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserWithStories | null>(null);

  useEffect(() => {
    async function fetchStatuses() {
      setLoading(true);
      try {
        const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        
        // 1. Get all recent statuses
        const statusesRef = collection(db, "statuses");
        const statusesQuery = query(
          statusesRef,
          where("createdAt", ">=", twentyFourHoursAgo),
          orderBy("createdAt", "asc")
        );
        const statusesSnapshot = await getDocs(statusesQuery);

        if (statusesSnapshot.empty) {
          setStoriesByUser([]);
          setLoading(false);
          return;
        }

        // 2. Get the unique user IDs from these statuses
        const userIds = [...new Set(statusesSnapshot.docs.map(doc => doc.data().userId))];

        // 3. Fetch the user data for these specific users
        const usersRef = collection(db, "users");
        // Firestore 'in' query can handle up to 30 items. If more users, chunking would be needed.
        const usersQuery = query(usersRef, where(documentId(), "in", userIds));
        const usersSnapshot = await getDocs(usersQuery);
        
        const usersData: { [key: string]: { name: string, avatarUrl: string, isPrivate: boolean } } = {};
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            usersData[doc.id] = {
                name: data.name || 'Anonymous',
                avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png`,
                isPrivate: data.isPrivate || false,
            };
        });

        // 4. Group stories by user, but only for public users
        const groupedStories: Record<string, UserWithStories> = {};

        statusesSnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;
          const user = usersData[userId];
          
          // Only process statuses from public users
          if (user && !user.isPrivate) {
             if (!groupedStories[userId]) {
                groupedStories[userId] = {
                    userId: userId,
                    username: user.name,
                    avatarUrl: user.avatarUrl,
                    stories: [],
                };
            }
            const createdAt = data.createdAt as Timestamp;
            groupedStories[userId].stories.push({
                id: doc.id,
                type: data.type,
                url: data.mediaUrl,
                duration: data.duration,
                timestamp: createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}),
                createdAt: createdAt,
            });
          }
        });
        
        const usersArray = Object.values(groupedStories).sort((a, b) => {
            const lastStoryA = a.stories[a.stories.length - 1].createdAt.toMillis();
            const lastStoryB = b.stories[b.stories.length - 1].createdAt.toMillis();
            return lastStoryB - lastStoryA; // Newest first
        });

        setStoriesByUser(usersArray);
      } catch (error) {
          console.error("Error fetching statuses: ", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatuses();
  }, []);

  const handleOpenViewer = (user: UserWithStories) => {
    setCurrentUser(user);
  };

  const handleCloseViewer = () => {
    setCurrentUser(null);
  };
  
  const handleNextUser = () => {
      if (!currentUser) return;
      const currentIndex = storiesByUser.findIndex(u => u.userId === currentUser.userId);
      if (currentIndex < storiesByUser.length - 1) {
          setCurrentUser(storiesByUser[currentIndex + 1]);
      } else {
          setCurrentUser(null); // End of all stories
      }
  }

  return (
    <>
      <div className="flex items-center gap-4 overflow-x-auto p-4 bg-background rounded-lg border">
         <Link href="/status/add" className="flex flex-col items-center gap-2 flex-shrink-0 text-center w-20">
            <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground">
                    {/* In a real app, this might show the user's current avatar */}
                    <AvatarImage src="" alt="Your Story" /> 
                    <AvatarFallback>YOU</AvatarFallback>
                </Avatar>
                <PlusCircle className="absolute -bottom-1 -right-1 h-6 w-6 bg-background rounded-full text-primary" />
            </div>
            <span className="text-xs font-medium truncate">Your Story</span>
        </Link>
        {loading ? (
            [...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 text-center w-20">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                </div>
            ))
        ) : (
            storiesByUser.map((user) => (
              <button
                key={user.userId}
                onClick={() => handleOpenViewer(user)}
                className="flex flex-col items-center gap-2 flex-shrink-0 text-center w-20"
              >
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={user.avatarUrl} alt={user.username} />
                  <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate">{user.username}</span>
              </button>
            ))
        )}
      </div>
      {!loading && storiesByUser.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No public statuses from the last 24 hours. Be the first to post!</p>
      )}
      {currentUser && <StatusViewer user={currentUser} onClose={handleCloseViewer} onNextUser={handleNextUser} />}
    </>
  );
}
