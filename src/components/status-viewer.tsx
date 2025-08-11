
// src/components/status-viewer.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, Heart, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserWithStories } from "./status-list";
import { YoutubePlayer } from "./youtube-player";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, collection, addDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";

function getYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

interface StatusViewerProps {
  user: UserWithStories;
  onClose: () => void;
  onNextUser: () => void;
}

export function StatusViewer({ user, onClose, onNextUser }: StatusViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const likeAnimationTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTap = useRef(0);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const currentStory = user.stories[currentStoryIndex];
  const youtubeVideoId = currentStory ? getYoutubeVideoId(currentStory.url) : null;
  
  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < user.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      onNextUser();
    }
  }, [currentStoryIndex, user.stories.length, onNextUser]);

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };
  
  useEffect(() => {
      const checkLikeStatus = async () => {
          if (!currentUser || !currentStory) return;
          const likeRef = doc(db, "statuses", currentStory.id, "likes", currentUser.uid);
          const likeSnap = await getDoc(likeRef);
          setIsLiked(likeSnap.exists());
      }
      if(currentStory) {
        checkLikeStatus();
      }
  }, [currentStory, currentUser]);


  useEffect(() => {
    setCurrentStoryIndex(0);
  }, [user]);

  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
    setIsLiked(false);
  }, [currentStoryIndex, user]);

  useEffect(() => {
    if (isPaused || !currentStory || youtubeVideoId) {
        return;
    }

    const durationInSeconds = currentStory.duration || 5;
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (durationInSeconds * 10));
        if (newProgress >= 100) {
          goToNextStory();
          return 100;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStory, isPaused, goToNextStory, youtubeVideoId]);

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") goToNextStory();
        if (e.key === "ArrowLeft") goToPreviousStory();
        if (e.key === "Escape") onClose();
        if (e.key === " ") { 
            e.preventDefault();
            setIsPaused(p => !p);
        }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNextStory, goToPreviousStory, onClose]);
  
  const triggerLike = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Please log in",
        description: "You need to be logged in to like a status.",
      });
      return;
    }
    if (currentUser.uid === user.userId) {
        toast({ title: "Can't like your own status" });
        return;
    }

    setShowLikeAnimation(true);
    if(likeAnimationTimeoutRef.current) clearTimeout(likeAnimationTimeoutRef.current);
    likeAnimationTimeoutRef.current = setTimeout(() => setShowLikeAnimation(false), 1000);

    if (isLiked) return;
    
    setIsLiked(true);

    try {
      const statusRef = doc(db, "statuses", currentStory.id);
      const likeRef = doc(db, "statuses", currentStory.id, "likes", currentUser.uid);

      await runTransaction(db, async (transaction) => {
        const statusDoc = await transaction.get(statusRef);
        if (!statusDoc.exists()) throw "Status does not exist!";
        
        const likeDoc = await transaction.get(likeRef);
        if(likeDoc.exists()) return;

        const currentLikes = statusDoc.data().likes || 0;
        transaction.update(statusRef, { likes: currentLikes + 1 });
        transaction.set(likeRef, { likedAt: serverTimestamp() });
        
        const currentUserData = (await getDoc(doc(db, "users", currentUser.uid))).data();

        if (currentUserData) {
            const notificationsRef = collection(db, "users", user.userId, "notifications");
            await addDoc(notificationsRef, {
                fromUserId: currentUser.uid,
                fromUserName: currentUserData.name || "A user",
                fromUserAvatar: currentUserData.avatarUrl || "",
                type: "like",
                message: "liked your status.",
                entityId: currentStory.id,
                timestamp: serverTimestamp(),
                isRead: false
            });
        }
      });

    } catch (error) {
      console.error("Error liking status:", error);
      setIsLiked(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not like status.",
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Check out ${user.username}'s status!`,
      text: `See what ${user.username} shared on Flow v3.`,
      url: window.location.origin,
    };
    
    const canShare = navigator.share && window.location.protocol.startsWith('https');

    try {
      if (canShare) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied!",
          description: "App link copied to clipboard because Web Share is not available.",
        });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error("Error sharing:", error);
      toast({
        variant: "destructive",
        title: "Could not share",
        description: "We've copied the link for you instead.",
      });
    }
  };


  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
          e.preventDefault();
          triggerLike();
      }
      lastTap.current = now;
  };
  
  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-in fade-in-0">
      <div 
        className="relative w-full max-w-md h-full max-h-dvh md:max-h-[90vh] bg-neutral-900 rounded-lg overflow-hidden shadow-2xl select-none"
        onPointerDown={() => !youtubeVideoId && setIsPaused(true)} onPointerUp={() => !youtubeVideoId && setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 w-full p-4 z-20 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2 mb-2">
                {user.stories.map((story, index) => (
                    <div key={story.id} className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-100 linear"
                            style={{ width: `${index === currentStoryIndex ? (youtubeVideoId ? 0 : progress) : (index < currentStoryIndex ? 100 : 0)}%`}}
                        />
                    </div>
                ))}
            </div>
            {/* Header Info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 pointer-events-none">
                    <Avatar className="h-10 w-10 border-2 border-white">
                        <AvatarImage src={user.avatarUrl} alt={user.username} />
                        <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-white">{user.username}</p>
                        <p className="text-xs text-white/80">{currentStory.timestamp}</p>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white hover:text-primary z-30 pointer-events-auto">
                    <X className="h-6 w-6" />
                </button>
            </div>
        </div>

        {/* Media Content */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleTap}
        >
            {youtubeVideoId ? (
                <div className="w-full h-full z-20">
                    <YoutubePlayer videoId={youtubeVideoId} />
                </div>
            ) : currentStory.type === 'video' ? (
                 <video
                    src={currentStory.url}
                    className="w-full h-full object-contain pointer-events-none"
                    autoPlay={!isPaused}
                    playsInline
                    muted
                    loop
                    key={currentStory.id}
                />
            ) : (
                 <Image
                  src={currentStory.url}
                  alt={`Story from ${user.username}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="w-full h-full pointer-events-none"
                  priority
                />
            )}

            {showLikeAnimation && (
                <div className="absolute z-30 pointer-events-none">
                    <Heart className="h-24 w-24 text-white/90 fill-white/80 animate-in fade-in-0 zoom-in-50" />
                </div>
            )}
        </div>
        
        {/* Conditional Navigation */}
        {youtubeVideoId ? (
            <>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousStory}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-40 h-10 w-10 rounded-full bg-black/20 text-white hover:bg-black/40 hover:text-white"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextStory}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-40 h-10 w-10 rounded-full bg-black/20 text-white hover:bg-black/40 hover:text-white"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </>
        ) : (
             <div className="absolute inset-0 flex z-10">
                <div className="w-1/3" onClick={goToPreviousStory}></div>
                <div className="w-1/3"></div>
                <div className="w-1/3" onClick={goToNextStory}></div>
            </div>
        )}

        {/* Action Buttons */}
        <div className="absolute bottom-5 right-5 flex flex-col items-center gap-4 z-40">
             <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white rounded-full bg-black/30 hover:bg-black/50 hover:text-white"
                onClick={(e) => {
                    e.stopPropagation();
                    triggerLike();
                }}
            >
                <Heart className={cn("h-7 w-7 transition-all", isLiked && "fill-red-500 text-red-500")}/>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white rounded-full bg-black/30 hover:bg-black/50 hover:text-white"
                onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                }}
            >
                <Share2 className="h-7 w-7"/>
            </Button>
        </div>
      </div>
    </div>
  );
}
