// src/components/bottom-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserCircle, MessageSquare, Camera, Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/status", label: "Status", icon: Camera },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "https://browserleaks.com/ip", label: "Check IP", icon: Link2, external: true },
  // Admin link is not shown in bottom nav for space reasons
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navLinks.map(({ href, label, icon: Icon, external }) => {
          const isActive = !external && (href === "/" ? pathname === href : pathname.startsWith(href));
          
          const linkContent = (
            <>
              <Icon className={cn("w-6 h-6 mb-1", isActive ? "text-primary" : "text-gray-500 group-hover:text-primary")} />
              <span className="text-xs">{label}</span>
            </>
          );
          
           if (external) {
             return (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted-foreground/10 group text-muted-foreground"
                >
                 {linkContent}
                </a>
             );
           }

          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted-foreground/10 group",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {linkContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
