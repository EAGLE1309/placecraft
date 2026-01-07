"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !isAuthorized) {
        router.push("/login");
        return;
      }
      if (role !== "admin") {
        router.push("/lounge");
      }
    }
  }, [user, loading, isAuthorized, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || !isAuthorized || role !== "admin") {
    return null;
  }

  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
