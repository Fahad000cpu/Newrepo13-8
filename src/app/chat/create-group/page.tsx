// src/app/chat/create-group/page.tsx
import { CreateGroupForm } from "@/components/create-group-form";

export default function CreateGroupPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Create a New Group</h1>
            <p className="text-muted-foreground mt-2">Bring your friends together for a conversation.</p>
        </div>
        <CreateGroupForm />
      </div>
    </div>
  );
}
