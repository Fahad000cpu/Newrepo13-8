// src/components/ai-assistant.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Loader2, Sparkles, User, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { chatWithGoogle, type ChatMessage } from "@/app/actions/chat";
import { useAuth } from "@/context/auth-context";

const formSchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
});

type FormValues = z.infer<typeof formSchema>;

const CHAT_HISTORY_KEY = "ai-assistant-chat-history";

export function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });
  
  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        setMessages(JSON.parse(savedHistory));
      }
    } catch (error) {
        console.error("Failed to parse chat history from localStorage", error);
        // If parsing fails, start with a clean slate
        localStorage.removeItem(CHAT_HISTORY_KEY);
    }
  }, []);


  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };

  useEffect(() => {
    // Save history to localStorage whenever it changes
    try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (error) {
        console.error("Failed to save chat history to localStorage", error);
    }
    scrollToBottom();
  }, [messages]);
  
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  }

  async function onSubmit(data: FormValues) {
    const userMessage: ChatMessage = { role: "user", content: data.message };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    form.reset();
    setIsLoading(true);

    try {
      const aiResponse = await chatWithGoogle({
        history: messages,
        message: data.message,
      });
      const aiMessage: ChatMessage = { role: "model", content: aiResponse };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessage: ChatMessage = {
        role: "model",
        content: "Sorry, I'm having trouble connecting. Please try again later.",
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto py-4">
      <header className="text-center mb-6 relative">
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="text-primary"/>
            AI Assistant
        </h1>
        <p className="text-muted-foreground mt-2">Ask me anything about Flow v3!</p>
        {messages.length > 0 && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-1/2 -translate-y-1/2 right-0"
                onClick={handleClearChat}
                aria-label="Clear chat history"
            >
                <Trash2 className="h-5 w-5 text-muted-foreground"/>
            </Button>
        )}
      </header>
      
      <ScrollArea className="flex-1 mb-4 pr-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground p-8">
              <p>No messages yet. Start the conversation!</p>
               <p className="text-xs mt-2">Your chat history is saved in your browser.</p>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={cn("flex items-start gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
              {message.role === 'model' && (
                <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Sparkles className="h-5 w-5"/></AvatarFallback>
                </Avatar>
              )}
               <div className={cn("max-w-sm md:max-w-md rounded-lg px-3 py-2", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
               {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3 justify-start">
                 <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Sparkles className="h-5 w-5"/></AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                </div>
             </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="mt-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Type your message..." {...field} autoComplete="off" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
