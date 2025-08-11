import { FindFriends } from "@/components/find-friends";

export default function FindFriendsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Find New Friends</h1>
            <p className="text-muted-foreground mt-2">Connect with new people and start a conversation.</p>
        </div>
        <FindFriends />
      </div>
    </div>
  );
}
