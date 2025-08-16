// src/components/user-profile.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit, Mail, Link as LinkIcon, Twitter, Instagram, Github, Palette, Youtube, Facebook, Shield, ShieldOff, UploadCloud, X, Loader2, Star, BadgeCheck, Crown } from "lucide-react";
import { useTheme } from "next-themes";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Switch } from "./ui/switch";
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
import { Badge } from "./ui/badge";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/lib/cloudinary';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  bio: z.string().max(160, { message: "Bio cannot be more than 160 characters." }).optional(),
  email: z.string().email({ message: "Please enter a valid email address." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL." }).optional(),
  isPrivate: z.boolean().default(false),
  twitter: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  instagram: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  github: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  youtube: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  facebook: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  totalLikes: z.number().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

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

const XIcon = (props: any) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
);

const ProfileInfoRow = ({ icon, label, value, isLink=false }: { icon: React.ReactNode, label: string, value: string | undefined | null, isLink?: boolean }) => {
    if (!value) return null;
    return (
        <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 w-24 text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            {isLink ? (
                 <a href={value} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">
                    {value.replace(/^(https?:\/\/)?(www\.)?/i, '')}
                </a>
            ) : (
                <span className="text-foreground">{value}</span>
            )}
           
        </div>
    )
}

export function UserProfile({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme()
  const { user, userData: authUserData, blockUser, unblockUser } = useAuth();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null)

  const [userInfo, setUserInfo] = useState<ProfileFormValues | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        isPrivate: false,
    }
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
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob | null> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
  
    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          }
        }, "image/png", 1);
    });
  }

  const handleCropSave = async () => {
    if (!completedCrop || !imgRef.current) return;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "File upload is not configured correctly. Please contact support.",
        });
        return;
    }
    setIsUploading(true);

    try {
        const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
        if(!croppedBlob) throw new Error('Cropping failed');

        const croppedFile = new File([croppedBlob], "avatar.png", { type: "image/png"});
        
        const formData = new FormData();
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
        const newAvatarUrl = cloudinaryData.secure_url;

        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { avatarUrl: newAvatarUrl }, { merge: true });

        toast({
            title: "Avatar Updated!",
            description: "Your new avatar has been saved.",
        });

        setIsCropDialogOpen(false);
        setImgSrc('');

    } catch (error: any) {
        console.error("Error updating avatar:", error);
        toast({
            title: "Error",
            description: error.message || "Could not update your avatar. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsUploading(false);
    }
  }


  async function onSubmit(data: ProfileFormValues) {
    if (!isMyProfile) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", userId);
      const { avatarUrl, ...otherData } = data;
      await setDoc(userRef, otherData, { merge: true });

      toast({
        title: "Profile Updated",
        description: "Your information has been successfully saved.",
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
       toast({
        title: "Error",
        description: "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
        setIsSubmitting(false);
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

  const LEGEND_THRESHOLD = 1000;
  const isLegend = (userInfo.totalLikes ?? 0) >= LEGEND_THRESHOLD;
  const progressValue = Math.min(((userInfo.totalLikes ?? 0) / LEGEND_THRESHOLD) * 100, 100);

  return (
    <>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              <AvatarFallback>{userInfo.name?.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <h1 className="font-headline text-3xl font-bold">{userInfo.name}</h1>
                 {isLegend && <Badge variant="destructive" className="gap-1.5 pr-3"><Crown className="h-4 w-4"/> Legend</Badge>}
              </div>
              <p className="text-muted-foreground mt-1 max-w-prose">{userInfo.bio}</p>
              
               <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
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
        </div>
        
        {isBlocked ? (
            <div className="text-center py-12 text-muted-foreground border bg-muted rounded-lg">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-xl font-semibold">User Blocked</h2>
                <p className="mt-2">You have blocked this user. Unblock them to see their content.</p>
            </div>
        ) : userInfo.isPrivate && !isMyProfile ? (
            <div className="text-center py-12 text-muted-foreground border bg-muted rounded-lg">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-xl font-semibold">This Account is Private</h2>
                <p className="mt-2">Follow this account to see their content.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>About</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <ProfileInfoRow icon={<Mail className="h-4 w-4"/>} label="Email" value={userInfo.email} />
                            <ProfileInfoRow icon={<XIcon className="h-4 w-4 fill-current"/>} label="X (Twitter)" value={userInfo.twitter} isLink />
                            <ProfileInfoRow icon={<Instagram className="h-4 w-4"/>} label="Instagram" value={userInfo.instagram} isLink />
                            <ProfileInfoRow icon={<Github className="h-4 w-4"/>} label="GitHub" value={userInfo.github} isLink />
                            <ProfileInfoRow icon={<Youtube className="h-4 w-4"/>} label="YouTube" value={userInfo.youtube} isLink />
                            <ProfileInfoRow icon={<Facebook className="h-4 w-4"/>} label="Facebook" value={userInfo.facebook} isLink />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Reputation</CardTitle>
                            <CardDescription>Reach 1,000 likes to achieve Legend status!</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-2">
                                <Progress value={progressValue} className="h-2"/>
                                <p className="text-sm text-muted-foreground text-right">{userInfo.totalLikes ?? 0} / {LEGEND_THRESHOLD} Likes</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                     <h2 className="text-2xl font-bold mb-4">Content</h2>
                    {/* Placeholder for user's shared products or content */}
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed bg-muted rounded-lg">
                        <p>No content shared yet.</p>
                    </div>
                </div>
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
              
               <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <div className="flex items-center gap-4">
                      <Avatar className="h-24 w-24 border-2 border-dashed">
                          <AvatarImage src={userInfo.avatarUrl ?? undefined} alt="Avatar preview" />
                          <AvatarFallback>{userInfo.name?.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="w-full">
                          <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('avatar-upload')?.click()}>
                              <UploadCloud className="mr-2 h-4 w-4" />
                              Upload New Avatar
                          </Button>
                          <p className="text-xs text-center text-muted-foreground mt-2">Recommended: Square image under 5MB</p>
                          <Input
                              id="avatar-upload"
                              type="file"
                              accept="image/png, image/jpeg, image/webp, image/gif"
                              className="hidden"
                              onChange={handleAvatarFileChange}
                          />
                      </div>
                  </div>
              </FormItem>
              
               <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Private Account</FormLabel>
                            <p className="text-xs text-muted-foreground">
                                If enabled, your content will only be visible to your followers.
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
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
                        <img
                            ref={imgRef}
                            src={imgSrc}
                            alt="Crop me"
                            onLoad={onImageLoad}
                            style={{ maxHeight: '70vh' }}
                        />
                    </ReactCrop>
                 </div>
                )}
              <DialogFooter>
                   <Button variant="secondary" onClick={() => {
                        setIsCropDialogOpen(false);
                        setImgSrc('');
                   }}>Cancel</Button>
                   <Button onClick={handleCropSave} disabled={isUploading}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save and Upload</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
