// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProductCard } from "@/components/product-card";
import { AdCard } from "@/components/ad-card";
import { db } from "@/lib/firebase";
import { Product, Ad } from "@/types";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, PlusCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";


// Mock function to get ads. In a real app, this would come from an ad service.
async function getAds(): Promise<Ad[]> {
  return [
    {
      id: 'ad-1',
      title: 'Streamline Your Workflow',
      description: 'The ultimate tool for designers and developers. Try it now!',
      imageUrl: 'https://placehold.co/600x600.png',
      ctaText: 'Learn More',
      ctaUrl: '#',
      dataAiHint: 'modern office',
    },
    {
      id: 'ad-2',
      title: 'Sustainable Fashion',
      description: 'Discover eco-friendly clothing that looks as good as it feels.',
      imageUrl: 'https://placehold.co/600x600.png',
      ctaText: 'Shop Collection',
      ctaUrl: '#',
      dataAiHint: 'sustainable fashion',
    }
  ];
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


export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });
  
  useEffect(() => {
    setLoading(true);
    const productsCol = collection(db, "products");
    const unsubscribe = onSnapshot(productsCol, (snapshot) => {
        const productList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
        setProducts(productList);
        setLoading(false);
    }, (error) => {
        console.error("Firestore snapshot error:", error);
        // This might happen if rules deny access. We still want to stop loading.
        setLoading(false);
    });

    getAds().then(setAds);

    return () => unsubscribe();
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

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const items = [];
  let adIndex = 0;
  for (let i = 0; i < filteredProducts.length; i++) {
    items.push({ type: 'product', data: filteredProducts[i] });
    // Insert an ad after every 3 products
    if ((i + 1) % 3 === 0 && adIndex < ads.length) {
      items.push({ type: 'ad', data: ads[adIndex] });
      adIndex++;
    }
  }

  return (
    <>
    <div className="py-8">
      
       <section className="text-center py-12 md:py-20 px-4">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">
          Find Your Niche.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore a universe of unique products, hand-picked and shared by a community of passionate curators. Your next favorite thing is just a click away.
        </p>
      </section>
        
      {isAdmin && (
        <div className="mb-6 px-4 flex justify-center">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add New Product
            </Button>
        </div>
      )}

      <div className="relative mb-6 px-4 max-w-lg mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
        placeholder="Search for products by name..."
        className="pl-10 text-base h-12"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        />
       </div>

      {loading ? (
         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
         </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-4">
          {items.map((item) => {
            if (item.type === 'product') {
              const product = item.data as Product;
              return (
                <div key={product.id} className="relative group">
                  <ProductCard product={product} />
                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="outline" className="bg-background/80" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                  )}
                </div>
              );
            } else {
              return <AdCard key={item.data.id} ad={item.data as Ad} />;
            }
          })}
        </div>
      ) : (
        <div className="text-center py-20 px-4">
            <h2 className="text-2xl font-semibold mb-2">No Products Found</h2>
            <p className="text-muted-foreground">
                {searchTerm ? `Your search for "${searchTerm}" did not match any products.` : 'No products have been added yet. Come back soon!'}
            </p>
        </div>
      )}
    </div>

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
                    <Input type="number" placeholder="e.g. 2500" {...field} />
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
                     <div className="flex items-center justify-between">
                        <FormLabel>Description</FormLabel>
                    </div>
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
    </>
  );
}
