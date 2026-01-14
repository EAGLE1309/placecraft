"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Home, ArrowRight } from "lucide-react";

export default function LoungePage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role) {
      if (role === "student") {
        router.push("/student");
      } else if (role === "recruiter") {
        router.push("/recruiter");
      } else if (role === "admin") {
        router.push("/admin");
      }
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const handleNavigate = () => {
    if (role === "student") router.push("/student");
    else if (role === "recruiter") router.push("/recruiter");
    else if (role === "admin") router.push("/admin");
    else router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Home className="size-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>
            You&apos;re being redirected to your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            If you&apos;re not redirected automatically, click the button below.
          </p>
          <Button onClick={handleNavigate} className="w-full">
            Go to Dashboard
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
