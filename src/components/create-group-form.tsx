// src/components/create-group-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, UploadCloud, Users, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import Image from 'next/image';

const createGroupFormSchema = z.object({
    groupName: z.string().min(3, { message: "Group name must be at least 3 characters." }),
    groupIcon: z.any().optional(),
    members: z.array(z.string()).min(1, { message: "You must select at least one member." })
});

type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

type UserData = {
    id: string;
    name: string;
    avatarUrl: string;
}

export function CreateGroupForm() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);
    const [iconPreview, setIconPreview] = useState<string | null>(null);

    const form = useForm<CreateGroupFormValues>({
        resolver: zodResolver(createGroupFormSchema),
        defaultValues: {
            groupName: "",
            members: [],
        },
    });

    useEffect(() => {
        const fetchUsers = async () => {
            if (!currentUser) return;
            setIsFetchingUsers(true);
            try {
                const usersCol = collection(db, "users");
                const userSnapshot = await getDocs(usersCol);
                const userList = userSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as UserData))
                    .filter(u => u.id !== currentUser.uid);
                setAllUsers(userList);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
            } finally {
                setIsFetchingUsers(false);
            }
        };
        fetchUsers();
    }, [currentUser, toast]);
    
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

    async function onSubmit(data: CreateGroupFormValues) {
        if (!currentUser) return;
        setLoading(true);

        try {
            let groupIconUrl = `https://placehold.co/100x100.png?text=${data.groupName.charAt(0)}`;
            
            // Upload group icon if provided
            const iconFile = data.groupIcon?.[0];
            if (iconFile) {
                 if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
                    throw new Error("Cloudinary environment variables are not properly configured.");
                }
                const formData = new FormData();
                formData.append('file', iconFile);
                formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
                
                const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) throw new Error('Icon upload failed');
                const cloudinaryData = await uploadResponse.json();
                groupIconUrl = cloudinaryData.secure_url;
            }

            // Add the current user to the members list
            const members = [...data.members, currentUser.uid];

            // Create group document in Firestore
            const groupRef = await addDoc(collection(db, "groups"), {
                groupName: data.groupName,
                groupIconUrl,
                members,
                createdBy: currentUser.uid,
                createdAt: serverTimestamp(),
            });

            toast({ title: "Group Created!", description: "Your new group is ready." });
            router.push(`/chat/group/${groupRef.id}`);

        } catch (error: any) {
            console.error("Error creating group:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Could not create the group." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardContent className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="groupName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Group Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Study Buddies" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                         <FormField
                            control={form.control}
                            name="groupIcon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Group Icon</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={iconPreview || undefined} alt="Group Icon"/>
                                            <AvatarFallback><Users/></AvatarFallback>
                                        </Avatar>
                                        <Button type="button" variant="outline" onClick={() => document.getElementById('icon-upload')?.click()}>
                                            <ImageIcon className="mr-2 h-4 w-4" />
                                            Upload Icon
                                        </Button>
                                        <Input id="icon-upload" type="file" className="hidden" accept="image/*" onChange={handleIconChange} />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="members"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Select Members</FormLabel>
                                    {isFetchingUsers ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="animate-spin" />
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-72 w-full rounded-md border">
                                            <div className="p-4 space-y-4">
                                                {allUsers.map((user) => (
                                                    <FormField
                                                        key={user.id}
                                                        control={form.control}
                                                        name="members"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(user.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), user.id])
                                                                                : field.onChange(field.value?.filter((value) => value !== user.id));
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <div className="flex items-center gap-2">
                                                                     <Avatar className="h-8 w-8">
                                                                        <AvatarImage src={user.avatarUrl} alt={user.name}/>
                                                                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                                                                    </Avatar>
                                                                    <FormLabel className="font-normal">{user.name}</FormLabel>
                                                                </div>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={loading || isFetchingUsers}>
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            Create Group
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
