// src/app/admin/page.tsx
import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-8">Admin Dashboard</h1>
      <AdminDashboard />
    </div>
  );
}
