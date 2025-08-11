// src/app/profile/page.tsx
"use client";

import { UserProfile } from "@/components/user-profile";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center space-y-4 mb-10">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="text-center space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
            </div>
      </div>
    );
  }

  return <UserProfile userId={user.uid} />;
}
