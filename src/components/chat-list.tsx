// src/components/chat-list.tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { PlusCircle, MessageSquare, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isGroup?: boolean;
}

export function ChatList() {
    const { user: currentUser } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
             setLoading(false);
             return;
        };

        let combinedConversations: Conversation[] = [];

        // 1. Fetch Users (for one-on-one chats)
        const usersCol = collection(db, "users");
        const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
            const userList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Conversation))
                .filter(u => u.id !== currentUser.uid);
            
            combinedConversations = [...userList, ...combinedConversations.filter(c => c.isGroup)];
            // In a real app, you'd fetch real last message data.
            // For now, we'll add placeholder data.
            const usersWithPlaceholders = userList.map(u => ({
                ...u,
                lastMessage: "Click to start a conversation",
                timestamp: ""
            }))
            
            setConversations(prev => [...usersWithPlaceholders, ...prev.filter(c => c.isGroup)]);
            setLoading(false);
        });

        // 2. Fetch Groups
        const groupsCol = collection(db, "groups");
        const groupsQuery = query(groupsCol, where("members", "array-contains", currentUser.uid));
        const unsubscribeGroups = onSnapshot(groupsQuery, (snapshot) => {
            const groupList = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return { 
                        id: doc.id,
                        name: data.groupName,
                        avatarUrl: data.groupIconUrl,
                        lastMessage: "Group conversation",
                        timestamp: "",
                        isGroup: true,
                    } as Conversation
                });
            
            setConversations(prev => [...groupList, ...prev.filter(c => !c.isGroup)]);
            setLoading(false);
        });


        return () => {
            unsubscribeUsers();
            unsubscribeGroups();
        };
    }, [currentUser]);


  return (
    <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
            <CardTitle>Messages</CardTitle>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                  <Link href="/chat/create-group">
                      <Users className="mr-2 h-4 w-4" />
                      Create Group
                  </Link>
              </Button>
              <Button asChild variant="outline">
                  <Link href="/chat/find">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Find Friends
                  </Link>
              </Button>
            </div>
        </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {loading ? (
            [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                </div>
            ))
          ) : conversations.length > 0 ? (
            conversations.map((convo) => (
              <Link
                href={convo.isGroup ? `/chat/group/${convo.id}` : `/chat/${convo.id}`}
                key={convo.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={convo.avatarUrl} alt={convo.name} />
                  <AvatarFallback>
                    {convo.isGroup ? <Users/> : convo.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="font-semibold">{convo.name}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-xs">{convo.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end text-xs text-muted-foreground">
                  <span>{convo.timestamp}</span>
                  {convo.unreadCount && convo.unreadCount > 0 && (
                    <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            ))
          ) : (
             <div className="text-center p-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p className="font-semibold">No conversations yet.</p>
                <p>Find a friend or create a group to start chatting.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
