import { AddStatus } from "@/components/add-status";

export default function AddStatusPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Add to Your Story</h1>
            <p className="text-muted-foreground mt-2">Upload an image and share it with your friends for 24 hours.</p>
        </div>
        <AddStatus />
      </div>
    </div>
  );
}
