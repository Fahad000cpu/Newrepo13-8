// src/components/find-friends.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, LocateFixed, User, Loader2, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "./ui/skeleton";

type UserData = {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  location?: {
      lat: number;
      lon: number;
  };
  distance?: number;
}

// Haversine distance formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2-lat1);
  const dLon = deg2rad(lon2-lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}


export function FindFriends() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "sorted" | "denied">("idle");


  useEffect(() => {
    const fetchUsers = async () => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const usersCol = collection(db, "users");
            const userSnapshot = await getDocs(usersCol);
            let userList = userSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as UserData))
                .filter(u => u.id !== currentUser?.uid); // Filter out the current user


            if ("geolocation" in navigator) {
                setLocationStatus("loading");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        const sortedUsers = [...userList]
                            .map(user => ({
                            ...user,
                            distance: user.location ? getDistance(latitude, longitude, user.location.lat, user.location.lon) : undefined
                            }))
                            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
                        
                        setUsers(sortedUsers);
                        setLocationStatus("sorted");
                    },
                    () => {
                        setUsers(userList);
                        setLocationStatus("denied");
                    }
                );
            } else {
                 setUsers(userList);
                 setLocationStatus("denied");
            }
        } catch(error) {
            console.error("Error fetching users:", error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }
    fetchUsers();
  }, [currentUser]);

  const filteredUsers = users.filter((user) =>
    user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for friends by name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {locationStatus === 'sorted' && (
            <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2 p-2 bg-muted rounded-md">
                <LocateFixed className="h-4 w-4 text-primary"/>
                <p>Showing users closest to you first. Distances are approximate.</p>
            </div>
        )}
         {locationStatus === 'denied' && (
            <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2 p-2 bg-muted rounded-md">
                <LocateFixed className="h-4 w-4"/>
                <p>Allow location access to see friends closest to you.</p>
            </div>
        )}
        <div className="grid gap-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
                 <div key={i} className="flex items-center justify-between gap-4 p-2">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="space-y-2">
                             <Skeleton className="h-4 w-[150px]" />
                             <Skeleton className="h-4 w-[200px]" />
                        </div>
                    </div>
                     <Skeleton className="h-10 w-[90px]" />
                </div>
            ))
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.bio}</p>
                    {user.distance !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">{Math.round(user.distance)} km away</p>
                    )}
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/chat/${user.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground col-span-full">
                 <User className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Other Users Found</h3>
                <p className="mt-1">Be the first to sign up and invite your friends!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
