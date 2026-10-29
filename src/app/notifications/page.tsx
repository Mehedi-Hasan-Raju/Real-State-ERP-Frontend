
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  CalendarDays,
  CreditCard,
  Building2,
  ClipboardList,
  Check,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
};

type NotificationResponse = {
  data?: NotificationItem[];
  pagination?: {
    totalPages?: number;
  };
};

function getIcon(type: string) {
  const value = type.toUpperCase();

  if (value.includes("PAYMENT") || value.includes("INSTALLMENT")) {
    return CreditCard;
  }

  if (value.includes("PROJECT") || value.includes("BUILDING")) {
    return Building2;
  }

  if (value.includes("BOOKING")) {
    return CalendarDays;
  }

  return ClipboardList;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<NotificationResponse>(
        "/notifications?page=1&limit=50",
      );

      setItems(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const visibleItems =
    filter === "UNREAD"
      ? items.filter((item) => !item.isRead)
      : items;

  async function markRead(item: NotificationItem) {
    if (item.isRead) return;

    setBusyId(item.id);
    setError("");

    try {
      await apiRequest(`/notifications/${item.id}/read`, {
        method: "PATCH",
      });

      setItems((current) =>
        current.map((n) =>
          n.id === item.id ? { ...n, isRead: true } : n,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update notification.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return;

    setBusyId("all");
    setError("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });

      setItems((current) =>
        current.map((n) => ({ ...n, isRead: true })),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not mark notifications as read.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Bell size={16} />
                Workspace
              </p>

              <h1 className="text-3xl font-bold">Notifications</h1>

              <p className="mt-2 text-sm text-slate-500">
                Stay updated on bookings, payments and projects.
              </p>
            </div>

            <button
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0 || busyId !== ""}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCheck size={17} />
              Mark all as read
            </button>
          </div>

          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total loaded</p>
              <p className="mt-2 text-3xl font-bold">{items.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Unread notifications</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {unreadCount}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                aria-label="Reload notifications"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("ALL")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    filter === "ALL"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  All
                </button>

                <button
                  onClick={() => setFilter("UNREAD")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    filter === "UNREAD"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Unread
                </button>
              </div>

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Refresh notifications"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex flex-col items-center p-12 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <Bell size={26} className="text-slate-400" />
                </div>

                <h2 className="font-semibold">You&apos;re all caught up</h2>

                <p className="mt-2 text-sm text-slate-500">
                  {filter === "UNREAD"
                    ? "There are no unread notifications."
                    : "New notifications will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const ItemIcon = getIcon(item.type);

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 p-4 transition hover:bg-slate-50 sm:gap-4 sm:p-5 ${
                        !item.isRead ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <ItemIcon size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {item.title}
                          </h3>

                          {!item.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {item.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {!item.isRead && (
                        <button
                          type="button"
                          disabled={busyId !== ""}
                          onClick={() => void markRead(item)}
                          title="Mark as read"
                          aria-label={`Mark ${item.title} as read`}
                          className="flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                        >
                          <Check size={15} />
                          <span className="hidden sm:inline">Read</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
