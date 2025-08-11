// src/app/status/page.tsx
import { StatusList } from "@/components/status-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatusPage() {

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-headline text-3xl font-bold tracking-tight">Status Updates</h1>
          <p className="text-muted-foreground mt-2">See what your friends are up to.</p>
        </div>
        <StatusList />
      </div>
    </div>
  );
}
