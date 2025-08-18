// src/components/status-viewers-list.tsx
"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, documentId } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from "date-fns";

interface StatusViewersListProps {
  statusId: string;
  onClose: () => void;
}

type Viewer = {
  userId: string;
  viewedAt: any;
  name: string;
  avatarUrl: string;
}

export function StatusViewersList({ statusId, onClose }: StatusViewersListProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!statusId) return;

    const fetchViewers = async () => {
        setLoading(true);
        try {
            const viewsRef = collection(db, "statuses", statusId, "views");
            const viewsQuery = query(viewsRef, orderBy("viewedAt", "desc"));
            const viewsSnapshot = await getDocs(viewsQuery);

            if(viewsSnapshot.empty) {
                setLoading(false);
                return;
            }

            const viewerIds = viewsSnapshot.docs.map(doc => doc.id);
            const viewerTimestamps: {[key: string]: any} = {};
            viewsSnapshot.docs.forEach(doc => {
                viewerTimestamps[doc.id] = doc.data().viewedAt;
            });
            
            // Fetch user data for the viewers
            const usersRef = collection(db, "users");
            const usersQuery = query(usersRef, where(documentId(), "in", viewerIds));
            const usersSnapshot = await getDocs(usersQuery);

            const viewersData = usersSnapshot.docs.map(doc => {
                const userData = doc.data();
                return {
                    userId: doc.id,
                    name: userData.name || "Unknown User",
                    avatarUrl: userData.avatarUrl || `https://placehold.co/100x100.png`,
                    viewedAt: viewerTimestamps[doc.id],
                }
            });
            
            // Sort by viewedAt timestamp again client-side
            viewersData.sort((a,b) => b.viewedAt.toMillis() - a.viewedAt.toMillis());

            setViewers(viewersData);
        } catch (error) {
            console.error("Error fetching viewers:", error);
        } finally {
            setLoading(false);
        }
    }
    
    fetchViewers();
  }, [statusId]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Viewed By</DialogTitle>
          <DialogDescription>
            People who have viewed your status.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto pr-2 space-y-4">
          {loading ? (
             [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-grow space-y-1">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))
          ) : viewers.length > 0 ? (
            viewers.map((viewer) => (
              <div key={viewer.userId} className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                  <AvatarFallback>{viewer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{viewer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {viewer.viewedAt ? formatDistanceToNow(viewer.viewedAt.toDate(), { addSuffix: true }) : 'Just now'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No views yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
