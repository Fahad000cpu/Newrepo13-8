
"use client";

import Link from "next/link";
import { UserCircle, Menu, MessageSquare, Shield, Camera, Link2, Home, LogOut, LogIn, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Notifications } from "./notifications";

export function Header() {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/status", label: "Status", icon: Camera },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/profile", label: "Profile", icon: UserCircle },
    { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    { href: "https://browserleaks.com/ip", label: "Check IP", icon: Link2, external: true },
  ];
  
  const adminEmail = 'fahadkhanamrohivi@gmail.com';
  const isAdmin = user?.email === adminEmail;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="md:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>

        <Link href="/" className="mr-6 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
            <rect width="256" height="256" fill="none"></rect>
            <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,1,1-48-48,48,48,0,0,1,48,48Z" fill="currentColor" className="text-primary-foreground/80"></path>
          </svg>
          <span className="font-headline text-lg font-bold">LinkShare</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden flex-1 items-center space-x-6 text-sm font-medium md:flex">
          {navLinks.map(({ href, label, icon: Icon, external, adminOnly }) => {
            if (adminOnly && !isAdmin) return null;

            const isActive =
              !external && (href === "/" ? pathname === href : pathname.startsWith(href));

            if (external) {
                 return (
                     <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 transition-colors text-foreground/60 hover:text-foreground/80"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {label}
                    </a>
                 )
            }
            
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "flex items-center gap-2 transition-colors hover:text-foreground/80",
                  isActive ? "text-foreground" : "text-foreground/60"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          {loading ? (
             <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-6 w-6 animate-pulse" />
              </Button>
          ) : user ? (
            <>
              <Notifications />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"}/>
                      <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserCircle className="mr-2"/>
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2"/>
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2"/>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link href="/auth/signin">
                <LogIn className="mr-2"/>
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
