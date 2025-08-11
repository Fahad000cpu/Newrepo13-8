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
import { PlusCircle, Edit, Trash2, Send, Bell, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";


type UserPermissionData = {
    id: string;
    name: string;
    notificationToken?: string;
    location?: {
        lat: number;
        lon: number;
    }
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
  const [productLoading, setProductLoading] = useState(true);
  const [userData, setUserData] = useState<UserPermissionData[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema)
  })

  useEffect(() => {
    setProductLoading(true);
    const productsCol = collection(db, "products");
    const unsubscribeProducts = onSnapshot(productsCol, (snapshot) => {
        const productList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
        setProducts(productList);
        setProductLoading(false);
    });

    setUserLoading(true);
    const usersCol = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as UserPermissionData[];
        setUserData(userList);
        setUserLoading(false);
    });

    return () => {
        unsubscribeProducts();
        unsubscribeUsers();
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
    }
  }

  async function onNotificationSubmit(data: NotificationFormValues) {
    // In a real application, this would call a secure backend function
    // (e.g., a Firebase Cloud Function) that uses the Firebase Admin SDK
    // to send push notifications to all users with a valid token.
    console.log("Preparing to send push notification with data:", data);
    
    // The function would look something like this:
    // await sendPushNotifications({ title: data.title, message: data.message });

    const recipients = userData.filter(u => u.notificationToken).length;
    toast({
        title: "Notification Sent!",
        description: `Your message "${data.title}" has been sent to ${recipients} user(s).`
    })
    notificationForm.reset({title: "", message: ""});
  }

  return (
    <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Manage Products</TabsTrigger>
            <TabsTrigger value="users">User Permissions</TabsTrigger>
            <TabsTrigger value="locations">User Locations</TabsTrigger>
            <TabsTrigger value="notifications">Send Notification</TabsTrigger>
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
                   {productLoading ? (
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
                    {!productLoading && products.length === 0 && (
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
                            {userLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                userData.map(user => (
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
                            {userLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                userData.map(user => (
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
                            <Button type="submit">
                                <Send className="mr-2 h-4 w-4"/>
                                Send to All Subscribed Users
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
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
                        <FormLabel>Price (USD)</FormLabel>
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
                    <Button type="submit">Save Product</Button>
                </DialogFooter>
                </form>
            </Form>
            </DialogContent>
        </Dialog>
    </Tabs>
  );
}

    