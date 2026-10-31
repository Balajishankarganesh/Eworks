"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<"CUSTOMER" | "PARTNER" | "ADMIN">;
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if tokens exist in localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    if (!token && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      if (user.role === "PARTNER") {
        router.replace("/dashboard/partner");
      } else if (user.role === "CUSTOMER") {
        router.replace("/dashboard/customer");
      } else {
        router.replace("/");
      }
      return;
    }

    setChecking(false);
  }, [user, isAuthenticated, allowedRoles, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
        <p className="text-sm font-medium">Authenticating session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
