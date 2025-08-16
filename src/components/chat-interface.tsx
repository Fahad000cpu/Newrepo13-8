// src/components/chat-interface.tsx
"use client";
import Link from 'next/link';
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, Send, Paperclip, X, Loader2, Youtube, Film, Trash2, MoreVertical, ShieldOff, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, DocumentData } from "firebase/firestore";
import { YoutubePlayer } from './youtube-player';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useAuth } from '@/context/auth-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/lib/cloudinary';

type Friend = {
  id: string;
  name: string;
  avatarUrl: string;
};

type Message = {
    id: string;
    content: string;
    senderId: string;
    timestamp: any;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
}

function getYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
}


export function ChatInterface({ friend }: { friend: Friend }) {
  const { user, loading, blockUser, unblockUser, userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<{file: File, preview: string, type: 'image' | 'video'} | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isBlockedByYou = userData?.blockedUsers?.includes(friend.id);
  const isBlockedByFriend = friend.id && userData?.blockedBy?.includes(friend.id); // This would need friend's data in a real app. We'll simulate it.

  const getChatCollectionId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  }

  useEffect(() => {
    if (!user) return;
    const chatId = getChatCollectionId(user.uid, friend.id);
    const messagesCol = collection(db, "chats", chatId, "messages");
    const q = query(messagesCol, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
    });

    return () => unsubscribe();
  }, [friend.id, user]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || (newMessage.trim() === "" && !attachment)) return;
    if (isBlockedByYou) {
        toast({ variant: "destructive", title: "User is blocked.", description: "You must unblock this user to send a message." });
        return;
    }
     if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "File upload is not configured correctly. Please contact support.",
        });
        return;
    }

    setIsSending(true);

    try {
        const messageData: DocumentData = {
            content: newMessage,
            senderId: user.uid,
            timestamp: serverTimestamp(),
        };

        if (attachment) {
            const formData = new FormData();
            formData.append('file', attachment.file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            
            const resourceType = attachment.type;
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Cloudinary upload failed');
            }
            const cloudinaryData = await uploadResponse.json();
            messageData.mediaUrl = cloudinaryData.secure_url;
            messageData.mediaType = attachment.type;
        }

        const chatId = getChatCollectionId(user.uid, friend.id);
        const messagesCol = collection(db, "chats", chatId, "messages");

        await addDoc(messagesCol, messageData);

        setNewMessage("");
        setAttachment(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    } catch (error: any) {
        console.error("Error sending message:", error);
        toast({
            variant: "destructive",
            title: "Send Failed",
            description: error.message || "Could not send your message. Please try again."
        })
    } finally {
        setIsSending(false);
    }
  };

  const handleYoutubeShare = async () => {
    if (!user || !youtubeLink || !getYoutubeVideoId(youtubeLink)) {
        toast({
            variant: "destructive",
            title: "Invalid Link",
            description: "Please enter a valid YouTube video URL.",
        });
        return;
    }
    
    setIsSending(true);
    try {
        const chatId = getChatCollectionId(user.uid, friend.id);
        const messagesCol = collection(db, "chats", chatId, "messages");

        await addDoc(messagesCol, {
            content: youtubeLink,
            senderId: user.uid,
            timestamp: serverTimestamp(),
        });

        setYoutubeLink("");
        setIsYoutubeDialogOpen(false);
    } catch (error) {
         console.error("Error sending message:", error);
        toast({
            variant: "destructive",
            title: "Send Failed",
            description: "Could not send your message. Please try again."
        })
    } finally {
        setIsSending(false);
    }
  }


  const handleAttachmentClick = (type: 'image' | 'video') => {
    if (fileInputRef.current) {
        fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
        fileInputRef.current.click();
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const fileType = file.type.startsWith('video') ? 'video' : 'image';
        const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image
        
        if (file.size > maxSize) {
            toast({
                variant: 'destructive',
                title: "File too large",
                description: `Please select a file smaller than ${maxSize / 1024 / 1024}MB.`,
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            setAttachment({ file, preview: loadEvent.target?.result as string, type: fileType });
        };
        reader.readAsDataURL(file);
    }
  }
  
  const handleLongPress = (message: Message) => {
      if (user && message.senderId === user.uid) {
          setMessageToDelete(message);
      }
  }

  const confirmDelete = async () => {
      if (!messageToDelete || !user) return;
      
      try {
          const chatId = getChatCollectionId(user.uid, friend.id);
          const messageRef = doc(db, "chats", chatId, "messages", messageToDelete.id);
          await deleteDoc(messageRef);
          toast({
              title: "Message Deleted",
              description: "The message has been removed."
          });
      } catch (error) {
          console.error("Error deleting message:", error);
          toast({
              variant: "destructive",
              title: "Delete Failed",
              description: "Could not delete the message."
          })
      } finally {
          setMessageToDelete(null);
      }
  }
  
  const handleBlock = async () => {
    if (!user) return;
    try {
        await blockUser(friend.id);
        toast({ title: "User Blocked", description: `You have blocked ${friend.name}.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not block user." });
    }
  }

  const handleUnblock = async () => {
    if (!user) return;
    try {
        await unblockUser(friend.id);
        toast({ title: "User Unblocked", description: `You have unblocked ${friend.name}.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not unblock user." });
    }
  }

  if (!user) {
    // Or a loading spinner
    return <div className="flex items-center justify-center h-full">Please log in to chat.</div>
  }


  return (
    <>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
        <header className="flex items-center gap-4 border-b bg-background px-4 py-3 shrink-0">
          <Button asChild variant="ghost" size="icon" className="md:hidden">
              <Link href="/chat">
                  <ArrowLeft />
                  <span className="sr-only">Back to chats</span>
              </Link>
          </Button>
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={friend.avatarUrl} alt={friend.name} />
            <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <p className="font-semibold text-lg">{friend.name}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {isBlockedByYou ? (
                     <DropdownMenuItem onClick={handleUnblock} className="cursor-pointer">
                        <ShieldOff className="mr-2"/>
                        <span>Unblock User</span>
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={handleBlock} className="cursor-pointer">
                        <Shield className="mr-2"/>
                        <span>Block User</span>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((message) => {
              const youtubeVideoId = getYoutubeVideoId(message.content);
              return (
                  <div key={message.id} className={cn("flex items-end gap-2 group", message.senderId === user.uid ? "justify-end" : "justify-start")}>
                      {message.senderId !== user.uid && (
                          <Avatar className="h-8 w-8 border">
                              <AvatarImage src={friend.avatarUrl} alt={friend.name} />
                              <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                      )}
                      
                      {message.senderId === user.uid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleLongPress(message)}
                          >
                             <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                      )}
                      
                      <div className={cn("max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2", message.senderId === user.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          {message.mediaUrl && message.mediaType === 'image' && (
                              <Image src={message.mediaUrl} alt="attached image" width={300} height={300} className="rounded-md mb-2 object-cover" />
                          )}
                          {message.mediaUrl && message.mediaType === 'video' && (
                              <video src={message.mediaUrl} controls className="rounded-md mb-2 w-full max-w-[300px]" />
                          )}

                          {youtubeVideoId ? (
                              <YoutubePlayer videoId={youtubeVideoId} />
                          ) : (
                            message.content && <p className="whitespace-pre-wrap">{message.content}</p>
                          )}

                          <p className="text-xs text-right mt-1 opacity-70">
                              {message.timestamp?.toDate ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                          </p>
                      </div>
                  </div>
              )
          })}
          <div ref={messagesEndRef} />
        </main>
        <footer className="border-t bg-background p-2">
           {isBlockedByYou && (
                <div className="text-center text-sm text-muted-foreground p-2 bg-muted rounded-md mb-2">
                    You have blocked {friend.name}. Unblock them to send a message.
                </div>
           )}
          {attachment && (
              <div className="p-2 relative w-32">
                  {attachment.type === 'image' ? (
                     <Image src={attachment.preview} alt="attachment preview" width={100} height={100} className="rounded-md object-cover" />
                  ) : (
                      <video src={attachment.preview} className="rounded-md w-full" muted autoPlay loop />
                  )}
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setAttachment(null)}>
                      <X className="h-4 w-4"/>
                  </Button>
              </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" type="button" onClick={() => handleAttachmentClick('image')} disabled={isSending || isBlockedByYou}>
                <Paperclip />
                <span className="sr-only">Attach image</span>
            </Button>
            <Button variant="ghost" size="icon" type="button" onClick={() => handleAttachmentClick('video')} disabled={isSending || isBlockedByYou}>
                <Film />
                <span className="sr-only">Attach video</span>
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button variant="ghost" size="icon" type="button" onClick={() => setIsYoutubeDialogOpen(true)} disabled={isSending || isBlockedByYou}>
                <Youtube />
                <span className="sr-only">Share YouTube video</span>
            </Button>
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
              autoComplete="off"
              disabled={isSending || isBlockedByYou}
            />
            <Button type="submit" size="icon" disabled={isSending || (newMessage.trim() === "" && !attachment) || isBlockedByYou}>
              {isSending ? <Loader2 className="mr-2 animate-spin" /> : <Send />}
              <span className="sr-only">Send Message</span>
            </Button>
          </form>
        </footer>
      </div>

      <Dialog open={isYoutubeDialogOpen} onOpenChange={setIsYoutubeDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Share a YouTube Video</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    placeholder="Paste YouTube link here..." 
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <Button onClick={handleYoutubeShare} disabled={isSending}>
                    {isSending ? <Loader2 className="mr-2 animate-spin" /> : "Share Video"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete this message. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
