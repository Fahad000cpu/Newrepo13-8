// src/components/admin-dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import { ProductCard } from "./product-card";
import { PlusCircle, Edit, Trash2, Send, Bell, MapPin, Loader2, ExternalLink, Users, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "./ui/badge";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { sendNotificationsToAll } from "@/app/actions/send-notifications";
import Image from "next/image";

type UserData = {
    id: string;
    name: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
    notificationToken?: string;
    location?: {
        lat: number;
        lon: number;
    }
    totalLikes?: number;
}

type GroupData = {
    id: string;
    groupName: string;
    groupIconUrl: string;
    createdBy: string;
    members: string[];
}

type StatusData = {
    id: string;
    userId: string;
    username: string;
    avatarUrl: string;
    mediaUrl: string;
    type: 'image' | 'video';
    createdAt: any;
}


const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  imageUrl: z.string().url("Please enter a valid image URL."),
  dataAiHint: z.string().optional(),
  buyUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const notificationFormSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    message: z.string().min(10, "Message must be at least 10 characters.")
})

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [statuses, setStatuses] = useState<StatusData[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema)
  })

  useEffect(() => {
    setDataLoading(true);

    const unsubscribers = [
      onSnapshot(collection(db, "products"), (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[]);
      }),
      onSnapshot(collection(db, "users"), (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as UserData[];
        setUsers(userList);
        // Add creator names to groups when users are loaded
        setGroups(prevGroups => prevGroups.map(g => ({
            ...g,
            createdBy: userList.find(u => u.id === g.createdBy)?.name || g.createdBy
        })));
      }),
      onSnapshot(collection(db, "groups"), (snapshot) => {
        setGroups(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as GroupData[]);
      }),
      onSnapshot(collection(db, "statuses"), (snapshot) => {
        setStatuses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as StatusData[]);
      }),
    ];

    // A small delay to ensure all initial data is fetched
    const timer = setTimeout(() => setDataLoading(false), 1500);

    return () => {
        unsubscribers.forEach(unsub => unsub());
        clearTimeout(timer);
    }
  }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    productForm.reset(product);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    productForm.reset({
        name: "",
        price: 0,
        description: "",
        imageUrl: "https://placehold.co/600x600.png",
        dataAiHint: "",
        buyUrl: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }
    try {
        await deleteDoc(doc(db, "products", productId));
        toast({
            title: "Product Deleted",
            description: "The product has been successfully removed.",
            variant: "destructive"
        })
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({
            title: "Error",
            description: "There was a problem deleting the product.",
            variant: "destructive"
        });
    }
  }

  async function onProductSubmit(data: ProductFormValues) {
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        const productRef = doc(db, "products", editingProduct.id);
        const { id, ...updateData } = data;
        await updateDoc(productRef, updateData);
        toast({ title: "Product Updated", description: "The product details have been saved." });
      } else {
        const { id, ...createData } = data;
        await addDoc(collection(db, "products"), {
            ...createData,
            likes: 0,
            comments: 0,
            tags: [],
        });
        toast({ title: "Product Added", description: "The new product is now live." });
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
        console.error("Error saving product: ", error);
        toast({ title: "Error", description: "There was a problem saving the product.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onNotificationSubmit(data: NotificationFormValues) {
    setIsSending(true);
    try {
      const result = await sendNotificationsToAll({ title: data.title, message: data.message });
      if (result.success) {
        toast({
          title: "Notification Sent!",
          description: result.message
        });
        notificationForm.reset({ title: "", message: "" });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Error from notification action:", error);
      toast({
        title: "Failed to Send",
        description: error.message || "There was a problem sending notifications.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  }

  const DataExplorer = () => (
     <Card>
        <CardHeader>
            <CardTitle>Data Explorer</CardTitle>
            <CardDescription>Browse live data from your Firestore collections.</CardDescription>
        </CardHeader>
        <CardContent>
            {dataLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="users">
                    <AccordionTrigger>Users ({users.length})</AccordionTrigger>
                    <AccordionContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Avatar</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Bio</TableHead>
                                    <TableHead className="text-right">Likes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell><Avatar><AvatarImage src={user.avatarUrl} /><AvatarFallback>{user.name?.[0]}</AvatarFallback></Avatar></TableCell>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="max-w-xs truncate">{user.bio}</TableCell>
                                            <TableCell className="text-right">{user.totalLikes || 0}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                        No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="groups">
                    <AccordionTrigger>Groups ({groups.length})</AccordionTrigger>
                    <AccordionContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Icon</TableHead>
                                    <TableHead>Group Name</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead className="text-right">Members</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.length > 0 ? (
                                    groups.map(group => (
                                        <TableRow key={group.id}>
                                            <TableCell><Avatar><AvatarImage src={group.groupIconUrl} /><AvatarFallback><Users/></AvatarFallback></Avatar></TableCell>
                                            <TableCell className="font-medium">{group.groupName}</TableCell>
                                            <TableCell>{users.find(u => u.id === group.createdBy)?.name || group.createdBy}</TableCell>
                                            <TableCell className="text-right">{group.members.length}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                        No groups found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="statuses">
                    <AccordionTrigger>Statuses ({statuses.length})</AccordionTrigger>
                    <AccordionContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Media</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Posted At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {statuses.length > 0 ? (
                                    statuses.map(status => (
                                        <TableRow key={status.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8"><AvatarImage src={status.avatarUrl} /><AvatarFallback>{status.username?.[0]}</AvatarFallback></Avatar>
                                                    <span>{status.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {status.type === 'image' ? 
                                                        <Image src={status.mediaUrl} alt="Status media" width={40} height={40} className="rounded-md object-cover" /> 
                                                        : <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center"><ImageIcon/></div> }
                                                    <a href={status.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                        <ExternalLink className="h-4 w-4"/>
                                                    </a>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{status.type}</Badge></TableCell>
                                            <TableCell>{status.createdAt?.toDate().toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                        No statuses found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            )}
        </CardContent>
    </Card>
  )

  return (
    <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="explorer">Data Explorer</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Products</CardTitle>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add New Product
                    </Button>
                </CardHeader>
                <CardContent>
                   {dataLoading ? (
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
                     </div>
                   ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((product) => (
                        <div key={product.id} className="relative group">
                            <ProductCard product={product} />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="outline" className="bg-background/80" onClick={() => handleEdit(product)}>
                                    <Edit className="h-4 w-4"/>
                                </Button>
                                <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                        ))}
                    </div>
                   )}
                    {!dataLoading && products.length === 0 && (
                        <div className="text-center p-12 text-muted-foreground">
                            <p>No products found.</p>
                            <p>Add a new product to get started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="users">
            <Card>
                <CardHeader>
                    <CardTitle>User Permissions & Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Push Notification Token</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dataLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : users.length > 0 ? (
                                users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.notificationToken ? 'default' : 'secondary'} className={user.notificationToken ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>
                                                <Bell className="mr-1 h-3 w-3" />
                                                {user.notificationToken ? `Subscribed (${user.notificationToken.substring(0,20)}...)` : 'Not Subscribed'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                    No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="locations">
            <Card>
                <CardHeader>
                    <CardTitle>User Locations</CardTitle>
                    <p className="text-sm text-muted-foreground">This data is collected once when a user grants permission.</p>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dataLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : users.length > 0 ? (
                                users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>
                                            {user.location ? (
                                                <Badge variant="secondary" className="font-mono">
                                                    <MapPin className="mr-2 h-3 w-3" />
                                                    {user.location.lat.toFixed(4)}, {user.location.lon.toFixed(4)}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    Not Available
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                    No users with location data found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="notifications">
            <Card>
                <CardHeader>
                    <CardTitle>Send Push Notification</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...notificationForm}>
                        <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6 max-w-lg mx-auto">
                            <FormField control={notificationForm.control} name="title" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Notification Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. New Product Alert!" {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <FormField control={notificationForm.control} name="message" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Notification Message</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g. Check out the new collection of minimalist vases." {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <Button type="submit" disabled={isSending}>
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                Send to All Subscribed Users
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="explorer">
           <DataExplorer />
        </TabsContent>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <Form {...productForm}>
                <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                <FormField
                    control={productForm.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g. Ceramic Vase" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={productForm.control}
                    name="price"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price (INR)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g. 45.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={productForm.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Describe the product" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={productForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                        <Input placeholder="https://placehold.co/600x600.png" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={productForm.control}
                    name="dataAiHint"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>AI Hint</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g. ceramic vase" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={productForm.control}
                    name="buyUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Buy URL</FormLabel>
                        <FormControl>
                        <Input placeholder="https://example.com/product/123" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Product
                    </Button>
                </DialogFooter>
                </form>
            </Form>
            </DialogContent>
        </Dialog>
    </Tabs>
  );
}
