// src/app/chat/group/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, DocumentData } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, ArrowLeft, Cog, Image as ImageIcon, Loader2, Send, Paperclip, Film, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/lib/cloudinary';

const settingsFormSchema = z.object({
    groupName: z.string().min(3, "Name must be at least 3 characters."),
    groupIcon: z.any().optional(),
    adminOnlyMessages: z.boolean().default(false),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

type Group = {
  id: string;
  groupName: string;
  groupIconUrl: string;
  members: string[];
  createdBy: string;
  settings?: {
    adminOnlyMessages: boolean;
  }
};

type Message = {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    timestamp: any;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
}

export default function GroupChatPage({ params }: { params: { id: string } }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<{file: File, preview: string, type: 'image' | 'video'} | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SettingsFormValues>();

  useEffect(() => {
    const groupId = params.id;
    if (!groupId) return;

    setLoading(true);
    const groupRef = doc(db, 'groups', groupId);
    const unsubscribe = onSnapshot(groupRef, (docSnap) => {
        if (docSnap.exists()) {
          const groupData = docSnap.data();
          const groupInfo = {
             ...groupData,
             id: docSnap.id,
          } as Group
          setGroup(groupInfo);
          form.reset({
              groupName: groupInfo.groupName,
              adminOnlyMessages: groupInfo.settings?.adminOnlyMessages || false,
          });
        } else {
            console.error("Group not found!");
            setGroup(null);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching group data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [params.id, form]);

  useEffect(() => {
    if (!params.id) return;
    const messagesCol = collection(db, "groups", params.id, "messages");
    const q = query(messagesCol, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
    });

    return () => unsubscribe();
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleIconChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileList = new DataTransfer();
      fileList.items.add(file);
      
      form.setValue('groupIcon', fileList.files, { shouldValidate: true });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSettingsSubmit = async (data: SettingsFormValues) => {
    if (!group) return;
     if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "File upload is not configured correctly. Please contact support.",
        });
        return;
    }
    setIsSaving(true);
    try {
        let newIconUrl = group.groupIconUrl;
        const iconFile = data.groupIcon?.[0];

        if (iconFile) {
            const formData = new FormData();
            formData.append('file', iconFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) throw new Error('Icon upload failed');
            const cloudinaryData = await uploadResponse.json();
            newIconUrl = cloudinaryData.secure_url;
        }

        const groupRef = doc(db, 'groups', group.id);
        await updateDoc(groupRef, {
            groupName: data.groupName,
            groupIconUrl: newIconUrl,
            settings: {
                adminOnlyMessages: data.adminOnlyMessages,
            }
        });

        toast({ title: "Settings Saved", description: "Group details have been updated."});
        setIsSettingsOpen(false);
        setIconPreview(null);
    } catch (error: any) {
        console.error("Error saving settings:", error);
        toast({ variant: "destructive", title: "Save Failed", description: error.message || "Could not update group settings." });
    } finally {
        setIsSaving(false);
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !userData || !group || (newMessage.trim() === "" && !attachment)) return;

    if (group.settings?.adminOnlyMessages && user.uid !== group.createdBy) {
        toast({ variant: "destructive", title: "Permission Denied", description: "Only admins can send messages in this group." });
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
            senderName: userData.name || "Anonymous",
            senderAvatar: userData.avatarUrl || `https://placehold.co/100x100.png`,
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


        const messagesCol = collection(db, "groups", group.id, "messages");
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
  
  const isAdmin = user && group && user.uid === group.createdBy;

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
          <header className="flex items-center gap-4 border-b bg-background px-4 py-3 shrink-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-grow space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 text-center">
            <p>Loading chat...</p>
          </main>
      </div>
    );
  }

  if (!group) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold mb-4">Group not found.</h2>
            <Button asChild>
                <Link href="/chat">
                    <ArrowLeft className="mr-2"/>
                    Back to Chats
                </Link>
            </Button>
        </div>
    );
  }
  
  const canSendMessage = !group.settings?.adminOnlyMessages || isAdmin;

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
          <AvatarImage src={group.groupIconUrl} alt={group.groupName} />
          <AvatarFallback><Users/></AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <p className="font-semibold text-lg">{group.groupName}</p>
          {group.members && <p className="text-sm text-muted-foreground">{group.members.length} members</p>}
        </div>
        {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Cog />
            </Button>
        )}
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((message) => (
             <div key={message.id} className={cn("flex items-end gap-2", message.senderId === user?.uid ? "justify-end" : "justify-start")}>
                 {message.senderId !== user?.uid && (
                     <Avatar className="h-8 w-8 border">
                         <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                         <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                     </Avatar>
                 )}
                 <div className={cn("max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2", message.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {message.senderId !== user?.uid && <p className="text-xs font-semibold mb-1">{message.senderName}</p>}
                    
                    {message.mediaUrl && message.mediaType === 'image' && (
                        <Image src={message.mediaUrl} alt="attached image" width={300} height={300} className="rounded-md mb-2 object-cover" />
                    )}
                    {message.mediaUrl && message.mediaType === 'video' && (
                        <video src={message.mediaUrl} controls className="rounded-md mb-2 w-full max-w-[300px]" />
                    )}
                    
                    {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

                    <p className="text-xs text-right mt-1 opacity-70">
                        {message.timestamp?.toDate ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </p>
                </div>
            </div>
        ))}
         <div ref={messagesEndRef} />
      </main>
      <footer className="border-t bg-background p-2">
        {group.settings?.adminOnlyMessages && !isAdmin && (
            <div className="text-center text-xs text-amber-600 p-2">Only admins can send messages.</div>
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
            <Button variant="ghost" size="icon" type="button" onClick={() => handleAttachmentClick('image')} disabled={isSending || !canSendMessage}>
                <ImageIcon />
                <span className="sr-only">Attach image</span>
            </Button>
            <Button variant="ghost" size="icon" type="button" onClick={() => handleAttachmentClick('video')} disabled={isSending || !canSendMessage}>
                <Film />
                <span className="sr-only">Attach video</span>
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            <Input
              type="text"
              placeholder={canSendMessage ? "Type a message..." : "Only admins can send messages"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
              autoComplete="off"
              disabled={!canSendMessage || isSending}
            />
            <Button type="submit" size="icon" disabled={!canSendMessage || isSending || (newMessage.trim() === "" && !attachment)}>
              {isSending ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="sr-only">Send Message</span>
            </Button>
          </form>
      </footer>
    </div>

    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Group Settings</DialogTitle>
                <DialogDescription>
                    Manage settings for your group. Only admins can see this.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-6 py-4">
                    <FormField
                        control={form.control}
                        name="groupName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Group Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="groupIcon"
                        render={() => (
                            <FormItem>
                                <FormLabel>Group Icon</FormLabel>
                                <div className="flex items-center gap-4">
                                     <Avatar className="h-16 w-16">
                                        <AvatarImage src={iconPreview || group?.groupIconUrl} alt="Group Icon"/>
                                        <AvatarFallback><Users/></AvatarFallback>
                                    </Avatar>
                                    <Button type="button" variant="outline" onClick={() => document.getElementById('group-icon-upload')?.click()}>
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Upload New Icon
                                    </Button>
                                    <Input id="group-icon-upload" type="file" className="hidden" accept="image/*" onChange={handleIconChange} />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminOnlyMessages"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Only Admins Can Send Messages</FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                        If enabled, only group admins can send messages.
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  )
}
