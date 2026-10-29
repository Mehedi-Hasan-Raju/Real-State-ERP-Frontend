
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { status, verifySession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    verifySession().then((user) => {
      if (!active) return;

      if (!user) {
        const next = encodeURIComponent(pathname);
        router.replace(`/login?next=${next}`);
        return;
      }

      setChecked(true);
    });

    return () => {
      active = false;
    };
  }, [verifySession, router, pathname]);

  if (!checked || status === "loading" || status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Checking session...</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
