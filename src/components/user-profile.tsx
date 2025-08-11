// src/components/user-profile.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit, Mail, Link as LinkIcon, Twitter, Instagram, Github, Palette, Youtube, Facebook, Shield, ShieldOff, UploadCloud, X, Loader2, Star } from "lucide-react";
import { useTheme } from "next-themes";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product } from "@/types";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/auth-context";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  bio: z.string().max(160, { message: "Bio cannot be more than 160 characters." }).optional(),
  email: z.string().email({ message: "Please enter a valid email address." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL." }).optional(),
  twitter: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  instagram: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  github: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  youtube: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  facebook: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const CLOUDINARY_CLOUD_NAME = "dhbytckit";
const CLOUDINARY_UPLOAD_PRESET = "Flow v3";


function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}


export function UserProfile({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme()
  const { user, userData: authUserData, blockUser, unblockUser } = useAuth();
  
  const [isUploading, setIsUploading] = useState(false);
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);

  const [userInfo, setUserInfo] = useState<ProfileFormValues | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const isMyProfile = user?.uid === userId;
  const isBlocked = authUserData?.blockedUsers?.includes(userId);
  
  useEffect(() => {
    setLoading(true);
    const userRef = doc(db, "users", userId);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as ProfileFormValues;
        setUserInfo(userData);
        form.reset(userData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, form]);


  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: "destructive", title: "File too large", description: "Please select an image smaller than 5MB."});
            return;
        }
      setCrop(undefined) // Makes crop preview update between images.
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '')
        setIsCropDialogOpen(true);
        setIsEditDialogOpen(false); // Close the main edit dialog
      })
      reader.readAsDataURL(e.target.files[0])
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1))
  }

  async function getCroppedImg(
    imageSrc: string,
    pixelCrop: PixelCrop
  ): Promise<Blob | null> {
    const image = new window.Image();
    image.src = imageSrc;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
  
    const cropX = pixelCrop.x * scaleX;
    const cropY = pixelCrop.y * scaleY;

    ctx.drawImage(
        image,
        cropX,
        cropY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
        resolve(blob);
        }, "image/png");
    });
  }

  const handleCropSave = async () => {
    if (!completedCrop || !imgSrc) return;
    const croppedBlob = await getCroppedImg(imgSrc, completedCrop);
    setCroppedImageBlob(croppedBlob);
    
    const objectUrl = URL.createObjectURL(croppedBlob as Blob);
    form.setValue('avatarUrl', objectUrl, { shouldDirty: true });

    setIsCropDialogOpen(false);
    setIsEditDialogOpen(true); // Re-open the main edit dialog
  }


  async function onSubmit(data: ProfileFormValues) {
    if (!isMyProfile) return;
    setIsUploading(true);
    try {
      const userRef = doc(db, "users", userId);
      
      let newAvatarUrl = data.avatarUrl;

      if (croppedImageBlob) {
        const formData = new FormData();
        const croppedFile = new File([croppedImageBlob], "avatar.png", { type: "image/png"});
        formData.append('file', croppedFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error('Cloudinary upload failed');
        }

        const cloudinaryData = await uploadResponse.json();
        newAvatarUrl = cloudinaryData.secure_url;
      }

      await setDoc(userRef, { ...data, avatarUrl: newAvatarUrl }, { merge: true });

      toast({
        title: "Profile Updated",
        description: "Your information has been successfully saved.",
      });
      setIsEditDialogOpen(false);
      setCroppedImageBlob(null);
      setImgSrc('');
    } catch (error) {
      console.error("Error updating profile:", error);
       toast({
        title: "Error",
        description: "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
        setIsUploading(false);
    }
  }

  const handleBlock = async () => {
    if (isMyProfile) return;
    try {
      await blockUser(userId);
      toast({ title: "User Blocked" });
    } catch(e) {
      toast({ title: "Error blocking user", variant: "destructive"})
    }
  }

  const handleUnblock = async () => {
    if (isMyProfile) return;
    try {
      await unblockUser(userId);
      toast({ title: "User Unblocked" });
    } catch(e) {
      toast({ title: "Error unblocking user", variant: "destructive"})
    }
  }

  const XIcon = (props: any) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );

  if (loading || !userInfo) {
     return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center space-y-4 mb-10">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="text-center space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
                </div>
            </div>
      </div>
    );
  }


  return (
    <>
      <div className="container mx-auto px-4 py-8">
        
          <div className="flex flex-col items-center space-y-4 mb-10">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              <AvatarFallback>{userInfo.name?.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h1 className="font-headline text-3xl font-bold">{userInfo.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-prose">{userInfo.bio}</p>
              <a href={`mailto:${userInfo.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mt-2">
                  <Mail className="h-4 w-4" />
                  {userInfo.email}
              </a>
            </div>
            <div className="flex items-center gap-4 mt-2">
              {userInfo.twitter && <a href={userInfo.twitter} target="_blank" rel="noopener noreferrer"><XIcon className="h-5 w-5 text-muted-foreground hover:text-primary fill-current"/></a>}
              {userInfo.instagram && <a href={userInfo.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
              {userInfo.github && <a href={userInfo.github} target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
              {userInfo.youtube && <a href={userInfo.youtube} target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
              {userInfo.facebook && <a href={userInfo.facebook} target="_blank" rel="noopener noreferrer"><Facebook className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
            </div>
            <div className="flex gap-2">
              {isMyProfile ? (
                 <>
                    <Button variant="outline" onClick={() => {
                        form.reset(userInfo);
                        setIsEditDialogOpen(true)
                      }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Palette className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          Dark
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setTheme("rainbow")}>
                            Rainbow
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          System
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </>
              ) : (
                isBlocked ? (
                    <Button variant="outline" onClick={handleUnblock}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Unblock User
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={handleBlock}>
                        <Shield className="mr-2 h-4 w-4" />
                        Block User
                    </Button>
                )
              )}
            </div>
          </div>
        
        {isBlocked && (
            <div className="text-center py-12 text-muted-foreground border bg-muted rounded-lg">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-xl font-semibold">User Blocked</h2>
                <p className="mt-2">You have blocked this user. Unblock them to see their content.</p>
            </div>
        )}
      </div>

       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} readOnly/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little bit about yourself"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Avatar</FormLabel>
                        <div className="flex items-start gap-4">
                            <Avatar className="h-24 w-24 border-2 border-dashed">
                                <AvatarImage src={field.value ?? undefined} alt="Avatar preview" />
                                <AvatarFallback>{userInfo.name?.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="w-full space-y-2">
                                <Input 
                                    placeholder="https://your-image-url.com/avatar.png" 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    onChange={(e) => {
                                        field.onChange(e);
                                        setCroppedImageBlob(null);
                                    }}
                                />
                                <p className="text-xs text-center text-muted-foreground">OR</p>
                                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    Upload from Device
                                </Button>
                                <Input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp, image/gif"
                                    className="hidden"
                                    onChange={handleAvatarFileChange}
                                />
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
              />

               <h3 className="text-sm font-medium pt-2">Social Links</h3>
                <FormField
                control={form.control}
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>X (Twitter)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://x.com/username" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/username" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="github"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/username" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/@username" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input placeholder="https://facebook.com/username" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <DialogFooter className="!mt-8 sticky bottom-0 bg-background py-4">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save changes
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCropDialogOpen} onOpenChange={(open) => {
          if(!open) {
              setImgSrc('');
              setIsCropDialogOpen(false);
              setIsEditDialogOpen(true);
          }
      }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Adjust Your Avatar</DialogTitle>
                  <DialogDescription>Move and resize the image to fit the circle.</DialogDescription>
              </DialogHeader>
              {imgSrc && (
                 <div className="relative h-80 z-50">
                     <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        circularCrop
                        >
                        <Image
                            src={imgSrc}
                            alt="Crop me"
                            onLoad={onImageLoad}
                            fill
                            style={{objectFit: 'contain'}}
                        />
                    </ReactCrop>
                 </div>
                )}
              <DialogFooter>
                   <Button variant="secondary" onClick={() => {
                        setIsCropDialogOpen(false);
                        setIsEditDialogOpen(true);
                        setImgSrc('');
                   }}>Cancel</Button>
                   <Button onClick={handleCropSave}>Save Crop</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
