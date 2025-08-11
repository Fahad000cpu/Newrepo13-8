import { ChatList } from "@/components/chat-list";

export default function ChatsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-headline text-3xl font-bold tracking-tight">Your Conversations</h1>
          <p className="text-muted-foreground mt-2">Manage your ongoing chats and start new ones.</p>
        </div>
        <ChatList />
      </div>
    </div>
  );
}
