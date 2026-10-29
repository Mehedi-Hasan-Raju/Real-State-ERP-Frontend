
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type RecordData = Record<string, any>;

type DashboardData = {
  projects: RecordData[];
  bookings: RecordData[];
  payments: RecordData[];
  installments: RecordData[];
  finance: RecordData | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  link?: string;
};

const INITIAL_DATA: DashboardData = {
  projects: [],
  bookings: [],
  payments: [],
  installments: [],
  finance: null,
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"];

function extractList(response: any): RecordData[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function extractSummary(response: any): RecordData | null {
  if (!response || typeof response !== "object") return null;
  const data = response.data ?? response;
  return data.summary ?? data;
}

function asNumber(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function money(value: unknown): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(asNumber(value));
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(value: unknown): string {
  return String(value ?? "UNKNOWN").replaceAll("_", " ");
}

function statusClass(value: unknown): string {
  const status = String(value ?? "").toUpperCase();

  if (
    ["PAID", "CONFIRMED", "COMPLETED", "ACTIVE"].includes(status)
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    ["CANCELLED", "OVERDUE", "REJECTED", "FAILED"].includes(status)
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    status.includes("PROGRESS") ||
    status.includes("PARTIALLY")
  ) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getCustomerName(item: RecordData): string {
  return (
    item.customer?.name ??
    item.booking?.customer?.name ??
    item.customerName ??
    "Customer"
  );
}

function getPaymentDate(payment: RecordData): string {
  return payment.paymentDate ?? payment.createdAt ?? "";
}

function getPaymentMethod(payment: RecordData): string {
  return String(payment.method ?? "OTHER").replaceAll("_", " ");
}

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function buildMonthlyCollections(payments: RecordData[], now: Date) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);

    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString("en-US", { month: "short" }),
      collection: 0,
      payments: 0,
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  for (const payment of payments) {
    const rawDate = getPaymentDate(payment);
    if (!rawDate) continue;

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = monthMap.get(key);

    if (month) {
      month.collection += asNumber(payment.amount);
      month.payments += 1;
    }
  }

  return months;
}

function buildPaymentMethods(payments: RecordData[]) {
  const totals = new Map<string, number>();

  for (const payment of payments) {
    const method = getPaymentMethod(payment);
    totals.set(method, (totals.get(method) ?? 0) + asNumber(payment.amount));
  }

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconClass: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className={`shrink-0 rounded-xl p-3 ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-700">
        View details
        <ArrowRight
          size={14}
          className="transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function SectionHeading({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          View all
        </Link>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
      <Activity className="mx-auto text-slate-300" size={26} />
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [userName, setUserName] = useState("Account");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const errors: string[] = [];

    const loadSection = async <T,>(
      label: string,
      endpoint: string,
      transform: (result: any) => T,
    ): Promise<T | null> => {
      try {
        const result = await apiRequest<any>(endpoint, {
          cache: "no-store",
        });
        return transform(result);
      } catch (error) {
        errors.push(
          `${label}: ${
            error instanceof Error ? error.message : "Request failed"
          }`,
        );
        return null;
      }
    };

    const [projects, bookings, payments, installments, finance] =
      await Promise.all([
        loadSection("Projects", "/projects?page=1&limit=100", extractList),
        loadSection("Bookings", "/bookings?page=1&limit=100", extractList),
        loadSection(
          "Payments",
          "/payments?page=1&limit=100&sortOrder=desc",
          extractList,
        ),
        loadSection(
          "Installments",
          "/installments?page=1&limit=100&sortOrder=asc",
          extractList,
        ),
        loadSection(
          "Finance summary",
          "/finance-reports/summary",
          extractSummary,
        ),
      ]);

    setData({
      projects: projects ?? [],
      bookings: bookings ?? [],
      payments: payments ?? [],
      installments: installments ?? [],
      finance,
    });

    setLoadErrors(errors);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    setNotificationError("");

    try {
      const response = await apiRequest<any>(
        "/notifications?page=1&limit=10",
        { cache: "no-store" },
      );

      const items = extractList(response).map((item) => ({
        id: String(item.id),
        title: String(item.title ?? "Notification"),
        message: String(item.message ?? ""),
        type: item.type,
        isRead: Boolean(item.isRead),
        createdAt: item.createdAt,
        link: item.link,
      }));

      setNotifications(items);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Could not load notifications.",
      );
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const response = await apiRequest<any>("/auth/me", {
        cache: "no-store",
      });

      const user = response?.data?.user ?? response?.user ?? response?.data ?? response;

      const name =
        user?.name ??
        user?.fullName ??
        user?.firstName ??
        user?.email ??
        "Account";

      setUserName(String(name));
      setUserEmail(String(user?.email ?? ""));
      setUserRole(String(user?.role ?? ""));
    } catch {
      // Keep the safe fallback label if the profile endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadNotifications();
    void loadUser();
  }, [loadDashboard, loadNotifications, loadUser]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const logout = async () => {
    setLogoutLoading(true);

    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      // Do not pretend the server session was cleared if the route is missing.
      setLogoutLoading(false);
      window.alert(
        error instanceof Error
          ? `Logout failed: ${error.message}. Check your backend logout endpoint.`
          : "Logout failed. Check your backend logout endpoint.",
      );
      return;
    }

    setLogoutLoading(false);
    router.replace("/login");
    router.refresh();
  };

  const markNotificationRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      if (notification.link) router.push(notification.link);
      return;
    }

    try {
      await apiRequest(`/notifications/${notification.id}/read`, {
        method: "PATCH",
      });

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );

      if (notification.link) router.push(notification.link);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Could not mark notification as read.",
      );
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });

      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );

      setNotificationError("");
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Could not mark notifications as read.",
      );
    }
  };

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const totalProjects = data.projects.length;

  const activeProjects = data.projects.filter((project) =>
    ["PLANNING", "UNDER_CONSTRUCTION", "IN_PROGRESS", "ACTIVE"].includes(
      String(project.status ?? "").toUpperCase(),
    ),
  ).length;

  const totalBookings = data.bookings.length;

  const confirmedBookings = data.bookings.filter((booking) =>
    ["CONFIRMED", "COMPLETED"].includes(
      String(booking.status ?? "").toUpperCase(),
    ),
  ).length;

  const totalCollected = asNumber(
    data.finance?.lifetimeCollected ??
      data.payments.reduce(
        (sum, payment) => sum + asNumber(payment.amount),
        0,
      ),
  );

  const collectedInPeriod = asNumber(data.finance?.collectedInPeriod);
  const outstanding = asNumber(
    data.finance?.installmentOutstanding ?? data.finance?.outstanding,
  );
  const overdueBalance = asNumber(data.finance?.overdueBalance);
  const overdueCount = asNumber(data.finance?.overdueCount);

  const monthlyCollections = useMemo(
    () => now ? buildMonthlyCollections(data.payments, now) : [],
    [data.payments, now],
  );

  const paymentMethods = useMemo(
    () => buildPaymentMethods(data.payments),
    [data.payments],
  );

  const recentPayments = useMemo(
    () =>
      [...data.payments]
        .sort(
          (a, b) =>
            new Date(getPaymentDate(b) || 0).getTime() -
            new Date(getPaymentDate(a) || 0).getTime(),
        )
        .slice(0, 5),
    [data.payments],
  );

  const recentBookings = useMemo(
    () =>
      [...data.bookings]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? b.bookingDate ?? 0).getTime() -
            new Date(a.createdAt ?? a.bookingDate ?? 0).getTime(),
        )
        .slice(0, 5),
    [data.bookings],
  );

  const pendingInstallments = useMemo(
    () =>
      data.installments
        .filter((item) =>
          ["PENDING", "PARTIALLY_PAID"].includes(
            String(item.status ?? "").toUpperCase(),
          ),
        )
        .sort(
          (a, b) =>
            new Date(a.dueDate ?? 0).getTime() -
            new Date(b.dueDate ?? 0).getTime(),
        ),
    [data.installments],
  );

  const searchResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return [];

    const items = [
      ...data.projects.map((item) => ({
        id: String(item.id ?? item.code ?? item.name),
        title: String(item.name ?? item.projectName ?? "Project"),
        subtitle: `Project · ${item.code ?? item.projectCode ?? "No code"}`,
        href: "/projects",
        search: `${item.name ?? ""} ${item.code ?? ""} ${item.projectCode ?? ""}`,
        icon: Building2,
      })),
      ...data.bookings.map((item) => ({
        id: String(item.id ?? item.bookingCode),
        title: String(item.bookingCode ?? "Booking"),
        subtitle: `Booking · ${getCustomerName(item)}`,
        href: "/bookings",
        search: `${item.bookingCode ?? ""} ${getCustomerName(item)} ${item.unit?.unitNumber ?? ""}`,
        icon: CalendarDays,
      })),
      ...data.payments.map((item) => ({
        id: String(item.id ?? item.paymentCode),
        title: String(item.paymentCode ?? "Payment"),
        subtitle: `Payment · ${getCustomerName(item)} · ${money(item.amount)}`,
        href: "/finance",
        search: `${item.paymentCode ?? ""} ${getCustomerName(item)} ${item.method ?? ""}`,
        icon: CreditCard,
      })),
    ];

    return items
      .filter((item) => item.search.toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchText, data]);

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        {/* Top navbar — sticky */}
        <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-sm shadow-blue-200">
                <LayoutDashboard size={21} />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  RealState
                </h1>
                <p className="text-xs text-slate-500">
                  Real Estate Management
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl lg:items-center lg:justify-end">
              {/* Search */}
              <div ref={searchRef} className="relative min-w-0 flex-1">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                  <Search size={17} className="shrink-0 text-slate-400" />

                  <input
                    value={searchText}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setSearchOpen(false);

                      if (event.key === "Enter" && searchResults[0]) {
                        router.push(searchResults[0].href);
                        setSearchOpen(false);
                      }
                    }}
                    placeholder="Search projects, bookings, payments..."
                    aria-label="Search dashboard records"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />

                  {searchText && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearchText("")}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {searchOpen && searchText.trim() && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Search results
                    </div>

                    {searchResults.length ? (
                      <div className="max-h-80 overflow-y-auto p-1.5">
                        {searchResults.map((result) => {
                          const ResultIcon = result.icon;

                          return (
                            <button
                              type="button"
                              key={`${result.href}-${result.id}`}
                              onClick={() => {
                                router.push(result.href);
                                setSearchOpen(false);
                                setSearchText("");
                              }}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-blue-50"
                            >
                              <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                                <ResultIcon size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-800">
                                  {result.title}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {result.subtitle}
                                </span>
                              </span>
                              <ArrowRight size={15} className="text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">
                        No matching records found in loaded data.
                      </p>
                    )}

                    <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                      Searches currently loaded records.
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div ref={notificationRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={notificationOpen}
                  onClick={() => {
                    setNotificationOpen((open) => !open);
                    setProfileOpen(false);
                    setSearchOpen(false);
                    if (!notificationOpen) void loadNotifications();
                  }}
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Bell size={19} />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Notifications
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {unreadCount} unread
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void markAllRead()}
                        disabled={unreadCount === 0}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <CheckCheck size={14} />
                        Mark all read
                      </button>
                    </div>

                    {notificationError && (
                      <div className="m-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                        {notificationError}
                      </div>
                    )}

                    {notificationLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw
                          size={20}
                          className="animate-spin text-blue-600"
                        />
                      </div>
                    ) : notifications.length ? (
                      <div className="max-h-[360px] overflow-y-auto p-2">
                        {notifications.map((notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() => void markNotificationRead(notification)}
                            className={`flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${
                              notification.isRead ? "" : "bg-blue-50/70"
                            }`}
                          >
                            <span
                              className={`mt-0.5 rounded-lg p-2 ${
                                notification.isRead
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              <Bell size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-800">
                                  {notification.title}
                                </span>
                                {!notification.isRead && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                )}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {notification.message}
                              </span>
                              <span className="mt-2 block text-[11px] text-slate-400">
                                {formatDate(notification.createdAt)}{" "}
                                {formatTime(notification.createdAt)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-9 text-center">
                        <Bell className="mx-auto text-slate-300" size={26} />
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          No notifications
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          You are all caught up.
                        </p>
                      </div>
                    )}

                    <Link
                      href="/notifications"
                      onClick={() => setNotificationOpen(false)}
                      className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-slate-50"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* User profile */}
              <div ref={profileRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={profileOpen}
                  onClick={() => {
                    setProfileOpen((open) => !open);
                    setNotificationOpen(false);
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left transition hover:border-blue-200 hover:bg-slate-50 sm:w-auto"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white">
                    {getUserInitials(userName)}
                  </span>

                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">
                      {userName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {userRole || "Signed in"}
                    </span>
                  </span>

                  <ChevronDown size={15} className="text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                          {getUserInitials(userName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {userName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {userEmail || "Signed-in account"}
                          </p>
                          {userRole && (
                            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              {userRole.replaceAll("_", " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                     
                     <button
                        type="button"
                        disabled={logoutLoading}
                        onClick={() => void logout()}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {logoutLoading ? (
                          <RefreshCw size={17} className="animate-spin" />
                        ) : (
                          <LogOut size={17} />
                        )}
                        {logoutLoading ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </header>

        {/* scrollable content */}
        <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-6 sm:px-6 lg:px-8">

          {/* Page title */}
          <section className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {now ? getGreeting(now) : "Welcome"}!
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Dashboard Overview
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Here&apos;s what&apos;s happening across your real estate business.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-slate-500">
                  Updated at {formatTime(lastUpdated)}
                </span>
              )}

              <button
                type="button"
                disabled={loading || refreshing}
                onClick={() => void loadDashboard(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh data
              </button>
            </div>
          </section>

          {loadErrors.length > 0 && !loading && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={19} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Some dashboard data could not be loaded
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Check the listed endpoints and your login session. Available
                  sections will continue to display.
                </p>
                <ul className="mt-2 list-inside list-disc text-xs leading-5 text-amber-800">
                  {loadErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="text-center">
                <RefreshCw
                  size={28}
                  className="mx-auto animate-spin text-blue-600"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Loading your dashboard...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Projects"
                  value={String(totalProjects)}
                  subtitle={`${activeProjects} active or in progress`}
                  icon={Building2}
                  iconClass="bg-blue-50 text-blue-700"
                  href="/projects"
                />

                <MetricCard
                  title="Total Bookings"
                  value={String(totalBookings)}
                  subtitle={`${confirmedBookings} confirmed or completed`}
                  icon={CalendarDays}
                  iconClass="bg-violet-50 text-violet-700"
                  href="/bookings"
                />

                <MetricCard
                  title="Total Collected"
                  value={money(totalCollected)}
                  subtitle="Lifetime recorded collections"
                  icon={Wallet}
                  iconClass="bg-emerald-50 text-emerald-700"
                  href="/finance"
                />

                <MetricCard
                  title="Outstanding Balance"
                  value={money(outstanding)}
                  subtitle={`${overdueCount} overdue installments`}
                  icon={CircleDollarSign}
                  iconClass="bg-orange-50 text-orange-700"
                  href="/finance"
                />
              </section>

              {/* Charts */}
              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                  <SectionHeading
                    title="Collection Overview"
                    subtitle="Monthly payments received over the last six months"
                    href="/finance"
                  />

                  <div className="mb-4 flex flex-wrap gap-5">
                    <div>
                      <p className="text-xs text-slate-500">
                        Lifetime collection
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {money(totalCollected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        Collected this period
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-700">
                        {money(collectedInPeriod)}
                      </p>
                    </div>
                  </div>

                  {data.payments.length === 0 ? (
                    <EmptyState message="No payment records are available to draw the chart." />
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={monthlyCollections}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="collectionGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#2563eb"
                                stopOpacity={0.24}
                              />
                              <stop
                                offset="95%"
                                stopColor="#2563eb"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            stroke="#e2e8f0"
                            strokeDasharray="4 4"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                            dy={8}
                          />

                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickFormatter={(value) =>
                              value >= 100000
                                ? `${(value / 100000).toFixed(1)}L`
                                : value >= 1000
                                  ? `${(value / 1000).toFixed(0)}k`
                                  : String(value)
                            }
                            width={48}
                          />

                          <Tooltip
                            formatter={(value) => [money(value), "Collection"]}
                            labelStyle={{
                              color: "#0f172a",
                              fontWeight: 600,
                            }}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                            }}
                          />

                          <Area
                            type="monotone"
                            dataKey="collection"
                            stroke="#2563eb"
                            strokeWidth={3}
                            fill="url(#collectionGradient)"
                            activeDot={{
                              r: 5,
                              strokeWidth: 2,
                              stroke: "#ffffff",
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-slate-400">
                    Monthly totals are calculated from payment records returned
                    by the API. The chart reflects the records currently loaded.
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeading
                    title="Payment Methods"
                    subtitle="Collection split by payment method"
                    href="/finance"
                  />

                  {paymentMethods.length === 0 ? (
                    <EmptyState message="Payment method data will appear after payments are recorded." />
                  ) : (
                    <>
                      <div className="h-[230px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentMethods}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={62}
                              outerRadius={90}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {paymentMethods.map((item, index) => (
                                <Cell
                                  key={item.name}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>

                            <Tooltip
                              formatter={(value) => money(value)}
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #e2e8f0",
                              }}
                            />

                            <Legend
                              verticalAlign="bottom"
                              iconType="circle"
                              iconSize={8}
                              formatter={(value) => (
                                <span className="text-xs text-slate-600">
                                  {value}
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 space-y-3">
                        {paymentMethods.slice(0, 4).map((method, index) => (
                          <div
                            key={method.name}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              />
                              <span className="truncate text-sm text-slate-600">
                                {method.name}
                              </span>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-slate-900">
                              {money(method.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Finance and quick actions */}
              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                  <SectionHeading
                    title="Financial Summary"
                    subtitle="A quick view of your receivables"
                    href="/finance"
                  />

                  {!data.finance ? (
                    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                      Finance summary is unavailable. Check the finance report
                      API.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <FileText size={15} />
                            Total Agreed
                          </div>
                          <p className="mt-3 break-words text-lg font-bold text-slate-900">
                            {money(data.finance.totalAgreed)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                            <Check size={15} />
                            Total Collected
                          </div>
                          <p className="mt-3 break-words text-lg font-bold text-emerald-900">
                            {money(totalCollected)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-medium text-red-700">
                            <Clock3 size={15} />
                            Overdue Balance
                          </div>
                          <p className="mt-3 break-words text-lg font-bold text-red-900">
                            {money(overdueBalance)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-600">
                            Collection progress
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {asNumber(data.finance.totalAgreed) > 0
                              ? `${Math.min(
                                  100,
                                  Math.round(
                                    (totalCollected /
                                      asNumber(data.finance.totalAgreed)) *
                                      100,
                                  ),
                                )}%`
                              : "—"}
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                            style={{
                              width: `${
                                asNumber(data.finance.totalAgreed) > 0
                                  ? Math.min(
                                      100,
                                      (totalCollected /
                                        asNumber(data.finance.totalAgreed)) *
                                        100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                          <span>Collected: {money(totalCollected)}</span>
                          <span>
                            Agreed: {money(data.finance.totalAgreed)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeading
                    title="Quick Actions"
                    subtitle="Shortcuts to common tasks"
                  />

                  <div className="space-y-3">
                    <Link
                      href="/projects"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                        <Building2 size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          Projects
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Manage development projects
                        </span>
                      </span>
                      <ArrowRight size={15} className="text-slate-400" />
                    </Link>

                    <Link
                      href="/bookings"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="rounded-lg bg-violet-50 p-2.5 text-violet-700">
                        <CalendarDays size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          Bookings
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Manage customer bookings
                        </span>
                      </span>
                      <ArrowRight size={15} className="text-slate-400" />
                    </Link>

                    <Link
                      href="/finance"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
                        <CreditCard size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          Finance
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Payments and installments
                        </span>
                      </span>
                      <ArrowRight size={15} className="text-slate-400" />
                    </Link>

                    <Link
                      href="/notifications"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
                        <Bell size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          Notifications
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Review system updates
                        </span>
                      </span>
                      <ArrowRight size={15} className="text-slate-400" />
                    </Link>
                  </div>
                </div>
              </section>

              {/* Recent payments */}
              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeading
                    title="Recent Payments"
                    subtitle="Latest recorded customer payments"
                    href="/finance"
                  />

                  {loadErrors.some((error) => error.startsWith("Payments:")) ? (
                    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                      Payment records could not be loaded.
                    </p>
                  ) : recentPayments.length === 0 ? (
                    <EmptyState message="No payments found yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                            <th className="pb-3 pr-3 font-medium">Payment</th>
                            <th className="pb-3 pr-3 font-medium">Date</th>
                            <th className="pb-3 pr-3 font-medium">Method</th>
                            <th className="pb-3 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentPayments.map((payment, index) => (
                            <tr
                              key={payment.id ?? payment.paymentCode ?? index}
                              className="border-b border-slate-50 last:border-0"
                            >
                              <td className="py-4 pr-3">
                                <p className="font-semibold text-slate-800">
                                  {payment.paymentCode ?? "Payment"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {getCustomerName(payment)}
                                </p>
                              </td>
                              <td className="py-4 pr-3 text-slate-500">
                                {formatDate(getPaymentDate(payment))}
                              </td>
                              <td className="py-4 pr-3 text-slate-600">
                                {getPaymentMethod(payment)}
                              </td>
                              <td className="py-4 text-right font-semibold text-slate-900">
                                {money(payment.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent bookings */}
                <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeading
                    title="Recent Bookings"
                    subtitle="Latest customer booking activity"
                    href="/bookings"
                  />

                  {loadErrors.some((error) => error.startsWith("Bookings:")) ? (
                    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                      Booking records could not be loaded.
                    </p>
                  ) : recentBookings.length === 0 ? (
                    <EmptyState message="No bookings found yet." />
                  ) : (
                    <div className="space-y-1">
                      {recentBookings.map((booking, index) => (
                        <div
                          key={booking.id ?? booking.bookingCode ?? index}
                          className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Building2 size={18} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {booking.bookingCode ?? "Booking"}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {getCustomerName(booking)} ·{" "}
                              {booking.unit?.unitNumber ??
                                booking.unit?.unitCode ??
                                "Unit not specified"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(booking.bookingDate ?? booking.createdAt)}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                                booking.status,
                              )}`}
                            >
                              {getStatus(booking.status)}
                            </span>
                            <p className="mt-2 text-sm font-bold text-slate-900">
                              {money(booking.agreedPrice ?? booking.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Installment follow-up */}
              <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeading
                  title="Installment Follow-up"
                  subtitle="Pending installments that may need attention"
                  href="/finance"
                />

                {loadErrors.some((error) =>
                  error.startsWith("Installments:"),
                ) ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    Installments could not be loaded.
                  </p>
                ) : pendingInstallments.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                    <Check className="shrink-0 text-emerald-700" size={20} />
                    <p className="text-sm text-emerald-800">
                      No pending or partially paid installments were returned.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[580px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                          <th className="pb-3 pr-3 font-medium">Installment</th>
                          <th className="pb-3 pr-3 font-medium">Booking</th>
                          <th className="pb-3 pr-3 font-medium">Due Date</th>
                          <th className="pb-3 pr-3 font-medium">Status</th>
                          <th className="pb-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingInstallments.slice(0, 5).map((item, index) => {
                          const dueDate = item.dueDate
                            ? new Date(item.dueDate)
                            : null;

                          const isOverdue =
                            dueDate !== null &&
                            !Number.isNaN(dueDate.getTime()) &&
                            dueDate.getTime() < Date.now();

                          return (
                            <tr
                              key={item.id ?? index}
                              className="border-b border-slate-50 last:border-0"
                            >
                              <td className="py-4 pr-3">
                                <p className="font-semibold text-slate-800">
                                  {item.title ??
                                    `Installment ${item.installmentNo ?? ""}`}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  #{item.installmentNo ?? "—"}
                                </p>
                              </td>
                              <td className="py-4 pr-3 text-slate-600">
                                {item.booking?.bookingCode ?? "—"}
                              </td>
                              <td className="py-4 pr-3">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <Clock3 size={14} />
                                  {formatDate(item.dueDate)}
                                </span>
                                {isOverdue && (
                                  <span className="mt-1 inline-block text-xs font-semibold text-red-600">
                                    Past due date
                                  </span>
                                )}
                              </td>
                              <td className="py-4 pr-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                    item.status,
                                  )}`}
                                >
                                  {getStatus(item.status)}
                                </span>
                              </td>
                              <td className="py-4 text-right font-semibold text-slate-900">
                                {money(item.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>RealState ERP · Business Dashboard</span>
                <span>
                  {lastUpdated
                    ? `Last refreshed ${formatDate(lastUpdated)} at ${formatTime(lastUpdated)}`
                    : "Dashboard"}
                </span>
              </footer>
            </>
          )}
        </div>{/* end scrollable content */}
      </main>
    </div>
  );
}
