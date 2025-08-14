// src/components/add-status.tsx
"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, X, Send, Loader2, Youtube, Image as ImageIcon, Film } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YoutubePlayer } from './youtube-player';
import { useAuth } from '@/context/auth-context';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const imageSchema = z.object({
    type: z.literal('image'),
    file: z.any().refine((files) => files?.length === 1, "File is required.").refine((files) => files?.[0]?.size <= MAX_IMAGE_SIZE, `Max image size is 10MB.`).refine((files) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(files?.[0]?.type), "Only .jpg, .png, .webp, and .gif formats are supported."),
    youtubeLink: z.string().optional(),
});

const videoSchema = z.object({
    type: z.literal('video'),
    file: z.any().refine((files) => files?.length === 1, "File is required.").refine((files) => files?.[0]?.size <= MAX_VIDEO_SIZE, `Max video size is 50MB.`).refine((files) => ["video/mp4", "video/quicktime", "video/webm"].includes(files?.[0]?.type), "Only .mp4, .mov, and .webm formats are supported."),
    youtubeLink: z.string().optional(),
});

const youtubeSchema = z.object({
    type: z.literal('youtube'),
    youtubeLink: z.string().url("Please enter a valid YouTube URL.").refine(url => getYoutubeVideoId(url), "Must be a valid YouTube video link."),
    file: z.any().optional(),
});

const statusFormSchema = z.discriminatedUnion("type", [imageSchema, videoSchema, youtubeSchema]);

type StatusFormValues = z.infer<typeof statusFormSchema>;


const NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function getYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export function AddStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [preview, setPreview] = useState<{url: string, type: 'image' | 'video'} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'youtube'>("image");

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: { type: "image" }
  });
  
  const youtubeLinkValue = form.watch('youtubeLink');
  const youtubeVideoId = youtubeLinkValue ? getYoutubeVideoId(youtubeLinkValue) : null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileList = new DataTransfer();
      fileList.items.add(file);
      
      form.setValue('file', fileList.files, { shouldValidate: true });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview({
            url: reader.result as string,
            type: file.type.startsWith('video') ? 'video' : 'image',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetPreview = () => {
    setPreview(null);
    form.setValue("file", undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(data: StatusFormValues) {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "You must be logged in to post a status.",
        });
        return;
    }
    
    setIsUploading(true);

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            throw new Error("User data not found in Firestore.");
        }
        const userData = userSnap.data();
        const username = userData.name || "Anonymous";
        const avatarUrl = userData.avatarUrl || "https://placehold.co/100x100.png";

        if (data.type === 'youtube') {
            await addDoc(collection(db, "statuses"), {
                userId: user.uid,
                username: username,
                avatarUrl: avatarUrl,
                mediaUrl: data.youtubeLink,
                createdAt: serverTimestamp(),
                type: 'video', // YouTube links are treated as videos
                duration: 15, // Default duration for YouTube videos
            });
        } else { // Handle image and video file uploads
            const file = data.file?.[0];
            if (!file) {
                 toast({
                    variant: "destructive",
                    title: "No file selected",
                    description: "Please select a file to upload.",
                });
                 setIsUploading(false);
                 return;
            }

            const statusType = data.type;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
            
            const resourceType = statusType;
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!}/${resourceType}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                console.error("Cloudinary Error:", errorData);
                throw new Error('Cloudinary upload failed');
            }

            const cloudinaryData = await uploadResponse.json();
            const mediaUrl = cloudinaryData.secure_url;
            let duration = 5; // default for images
            if (statusType === 'video') {
                duration = Math.round(cloudinaryData.duration) || 15;
            }

            await addDoc(collection(db, "statuses"), {
                userId: user.uid,
                username: username,
                avatarUrl: avatarUrl,
                mediaUrl: mediaUrl,
                createdAt: serverTimestamp(),
                type: statusType,
                duration: duration,
            });
        }

        toast({
            title: "Status Posted!",
            description: "Your new status is now live for your friends to see.",
        });

        router.push("/status");

    } catch (error) {
        console.error("Error uploading file:", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "There was a problem uploading your status. Please try again.",
        });
    } finally {
        setIsUploading(false);
    }
  }
  
  const handleTabChange = (value: string) => {
    const newType = value as 'image' | 'video' | 'youtube';
    setActiveTab(newType);
    
    // Reset form with appropriate defaults for the selected type
    if (newType === 'youtube') {
      form.reset({
        type: 'youtube',
        youtubeLink: "",
      });
    } else {
      form.reset({
        type: newType,
        file: new DataTransfer().files,
        youtubeLink: "",
      });
    }
    resetPreview();
  };

  const renderFileInput = (accept: string, label: string, desc: string) => (
    <FormField
      control={form.control}
      name="file"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div
              className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <>
                  {preview.type === 'image' ? (
                    <Image src={preview.url} alt="File preview" layout="fill" objectFit="contain" className="rounded-lg" />
                  ) : (
                    <video src={preview.url} className="h-full w-full rounded-lg object-contain" muted autoPlay loop />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-3 -right-3 z-10 rounded-full h-8 w-8"
                    onClick={(e) => {
                        e.stopPropagation();
                        resetPreview();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                  <UploadCloud className="w-10 h-10 mb-3" />
                  <p className="mb-2 text-sm">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs">{desc}</p>
                </div>
              )}
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Card>
      <CardContent className="p-6">
       <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="image">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Image
                </TabsTrigger>
                <TabsTrigger value="video">
                    <Film className="mr-2 h-4 w-4" />
                    Video
                </TabsTrigger>
                <TabsTrigger value="youtube">
                    <Youtube className="mr-2 h-4 w-4" />
                    YouTube
                </TabsTrigger>
              </TabsList>
              <TabsContent value="image" className="mt-6">
                {renderFileInput("image/png, image/jpeg, image/webp, image/gif", "Upload Image", "PNG, JPG, GIF, WEBP (MAX. 10MB)")}
              </TabsContent>
              <TabsContent value="video" className="mt-6">
                {renderFileInput("video/mp4, video/quicktime, video/webm", "Upload Video", "MP4, MOV, WEBM (MAX. 50MB)")}
              </TabsContent>
              <TabsContent value="youtube" className="mt-6">
                  <FormField
                    control={form.control}
                    name="youtubeLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube Video Link</FormLabel>
                        <FormControl>
                            <Input placeholder="https://www.youtube.com/watch?v=..." {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                {youtubeVideoId && (
                    <div className="mt-4 rounded-lg overflow-hidden">
                        <p className="text-sm text-muted-foreground mb-2">Video Preview:</p>
                        <YoutubePlayer videoId={youtubeVideoId} />
                    </div>
                )}
              </TabsContent>
            </Tabs>
            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                   Post Status
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
