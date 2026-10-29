"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        await apiRequest("/auth/me", {
          cache: "no-store",
        });

        if (active) {
          router.replace("/dashboard");
        }
      } catch {
        if (active) {
          router.replace("/login");
        }
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">
        Checking your session...
      </p>
    </main>
  );
}