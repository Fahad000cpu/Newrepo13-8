// src/app/chat/[id]/page.tsx
"use client";

import { ChatInterface } from "@/components/chat-interface";
import { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Friend = {
  id: string;
  name: string;
  avatarUrl: string;
};

export default function ChatPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [friend, setFriend] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchFriendData = async () => {
      try {
        const friendRef = doc(db, 'users', id);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) {
          const friendData = friendSnap.data();
          setFriend({
            id: friendSnap.id,
            name: friendData.name || 'Unknown User',
            avatarUrl: friendData.avatarUrl || `https://placehold.co/100x100.png`,
          });
        }
      } catch (error) {
        console.error("Error fetching friend data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFriendData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
          <header className="flex items-center gap-4 border-b bg-background px-4 py-3 shrink-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-grow space-y-2">
              <Skeleton className="h-5 w-32" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Skeleton messages */}
          </main>
      </div>
    );
  }

  if (!friend) {
    return <div>User not found.</div>;
  }

  return <ChatInterface friend={friend} />;
}
