"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Home,
  Users,
  Wallet,
  Bell,
  Settings,
  Layers3,
  Layers,
  UserRound,
  LoaderCircle,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import { logout } from "@/lib/api";

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Building2,
  },
  {
    label: "Buildings",
    href: "/buildings",
    icon: Layers3,
  },
  {
    label: "Floors",
    href: "/floors",
    icon: Layers,
  },
  {
    label: "Units",
    href: "/units",
    icon: Home,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: UserRound,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    label: "Installments",
    href: "/installments",
    icon: CalendarClock,
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-[#101b35] text-white">
      <Link
        href="/"
        className="flex h-20 items-center gap-3 border-b border-white/10 px-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
          <Building2 size={23} />
        </div>

        <div>
          <p className="text-lg font-bold tracking-wide">ReslState</p>
          <p className="text-xs text-slate-400">Real Estate ERP</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        {error && (
          <p className="mb-3 text-sm text-red-300">{error}</p>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
        >
          {loggingOut ? (
            <LoaderCircle className="animate-spin" size={19} />
          ) : (
            <LogOut size={19} />
          )}

          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}