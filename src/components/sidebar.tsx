
// src/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserCircle, MessageSquare, Shield, Camera, Link2, FileText, Share2, Copy, Star, Users, Sparkles, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, signOut, isAdmin } = useAuth();
  
  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/status", label: "Status", icon: Camera },
    { href: "/chat", label: "Chat", icon: MessageSquare, auth: true },
    { href: "/chat/create-group", label: "Create Group", icon: Users, auth: true },
    { href: "/profile", label: "Profile", icon: UserCircle, auth: true },
    { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    { href: "/terms", label: "Terms", icon: FileText },
    { href: "/privacy", label: "Privacy", icon: FileText },
    { href: "https://browserleaks.com/ip", label: "Check IP", icon: Link2, external: true },
    { href: "https://amropedia.wordpress.com", label: "Ad Website", icon: Star, external: true },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({
      title: "Link Copied!",
      description: "The app link has been copied to your clipboard.",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Flow V6",
          text: "Check out Flow V6, where you can discover and share amazing products!",
          url: window.location.origin,
        });
      } catch (error) {
        // We can ignore abort errors as they happen when the user closes the share sheet.
        if ((error as Error).name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback for browsers that do not support the Web Share API
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
            <rect width="256" height="256" fill="none"></rect>
            <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,1,1-48-48,48,48,0,0,1,48,48Z" fill="currentColor" className="text-primary-foreground/80"></path>
          </svg>
          <span className="font-bold text-lg">Flow V6</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
            <span className="sr-only">Share App</span>
        </Button>
      </div>
      <nav className="flex-grow p-4">
        <ul className="space-y-2">
          {navLinks.map(({ href, label, icon: Icon, external, adminOnly, auth: authRequired }) => {
            if (adminOnly && !isAdmin) return null;
            if (authRequired && !user) return null;

            const isActive = !external && (href === "/" ? pathname === href : pathname.startsWith(href));
            const linkContent = (
              <>
                <Icon className="h-4 w-4" />
                {label}
              </>
            );

            if (external) {
              return (
                 <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                      {linkContent}
                    </a>
                  </li>
              )
            }

            return (
              <li key={label}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  {linkContent}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto p-4 border-t">
         {user ? (
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/auth/signin">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
      </div>
    </div>
  );
}
