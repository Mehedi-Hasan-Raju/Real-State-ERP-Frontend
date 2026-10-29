
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  X,
  CalendarDays,
  Pencil,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type Option = {
  id: string;
  name?: string;
  email?: string;
  unitNumber?: string;
  code?: string;
};

type Booking = {
  id: string;
  bookingCode?: string;
  bookingNumber?: string;
  status: string;
  agreedPrice?: number | string;
  bookingAmount?: number | string;
  amount?: number | string;
  bookingDate?: string;
  notes?: string | null;
  customerId?: string;
  unitId?: string;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
  };
  unit?: {
    id?: string;
    unitNumber?: string;
    name?: string;
    floor?: {
      building?: {
        name?: string;
      };
    };
  };
};

const statuses = [
  "RESERVED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

function listOf<T>(result: unknown, key: string): T[] {
  if (Array.isArray(result)) return result as T[];

  if (result && typeof result === "object") {
    const obj = result as Record<string, unknown>;

    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj[key])) return obj[key] as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];

    if (
      obj.data &&
      typeof obj.data === "object" &&
      !Array.isArray(obj.data)
    ) {
      const nested = obj.data as Record<string, unknown>;

      if (Array.isArray(nested.items)) return nested.items as T[];
      if (Array.isArray(nested[key])) return nested[key] as T[];
    }
  }

  return [];
}

function money(value?: number | string) {
  return `৳${Number(value ?? 0).toLocaleString("en-BD")}`;
}

function dateForInput(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const emptyForm = {
  customerId: "",
  unitId: "",
  bookingDate: "",
  bookingCode: "",
  agreedPrice: "",
  bookingAmount: "",
  notes: "",
};

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(false);
  const [editingBooking, setEditingBooking] =
    useState<Booking | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      const result = await apiRequest<unknown>(
        `/bookings?${params.toString()}`,
      );

      setItems(listOf<Booking>(result, "bookings"));

      const obj =
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : {};

      const pagination =
        obj.pagination && typeof obj.pagination === "object"
          ? (obj.pagination as Record<string, unknown>)
          : obj.data &&
              typeof obj.data === "object" &&
              !Array.isArray(obj.data) &&
              (obj.data as Record<string, unknown>).pagination
            ? ((obj.data as Record<string, unknown>)
                .pagination as Record<string, unknown>)
            : undefined;

      setTotalPages(
        Math.max(1, Number(pagination?.totalPages ?? 1)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadFormOptions() {
    const [customerResult, unitResult] = await Promise.all([
      apiRequest<unknown>("/customers?page=1&limit=100"),
      apiRequest<unknown>("/units?page=1&limit=100"),
    ]);

    setCustomers(listOf<Option>(customerResult, "customers"));
    setUnits(listOf<Option>(unitResult, "units"));
  }

  async function openCreate() {
    setError("");
    setEditingBooking(null);
    setForm(emptyForm);

    try {
      await loadFormOptions();
      setModal(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load customer/unit options.",
      );
    }
  }

  async function openEdit(booking: Booking) {
    setError("");
    setEditingBooking(booking);

    setForm({
      customerId:
        booking.customerId || booking.customer?.id || "",
      unitId: booking.unitId || booking.unit?.id || "",
      bookingDate: dateForInput(booking.bookingDate),
      bookingCode:
        booking.bookingCode || booking.bookingNumber || "",
      agreedPrice: String(
        booking.agreedPrice ?? booking.amount ?? "",
      ),
      bookingAmount: String(booking.bookingAmount ?? ""),
      notes: booking.notes ?? "",
    });

    try {
      await loadFormOptions();
      setModal(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load customer/unit options.",
      );
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.customerId || !form.unitId) {
      setError("Please select both a customer and a unit.");
      return;
    }

    if (!Number.isFinite(Number(form.agreedPrice)) ||
        Number(form.agreedPrice) <= 0) {
      setError("Agreed price must be greater than zero.");
      return;
    }

    setSaving(true);
    setError("");

    const body = {
      bookingCode: form.bookingCode.trim(),
      customerId: form.customerId,
      unitId: form.unitId,
      agreedPrice: Number(form.agreedPrice),
      ...(form.bookingAmount !== ""
        ? { bookingAmount: Number(form.bookingAmount) }
        : {}),
      ...(form.bookingDate
        ? { bookingDate: form.bookingDate }
        : {}),
      notes: form.notes.trim(),
    };

    try {
      if (editingBooking) {
        await apiRequest(`/bookings/${editingBooking.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiRequest("/bookings", {
          method: "POST",
          body,
        });
      }

      setModal(false);
      setEditingBooking(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editingBooking
            ? "Could not update booking."
            : "Could not create booking.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateBookingStatus(
    booking: Booking,
    nextStatus: string,
  ) {
    if (booking.status === nextStatus) return;

    if (
      booking.status === "COMPLETED" ||
      booking.status === "CANCELLED"
    ) {
      setError(
        "Completed or cancelled bookings cannot be changed from this page.",
      );
      return;
    }

    let cancellationReason = "";

    if (nextStatus === "CANCELLED") {
      cancellationReason =
        window
          .prompt("Please enter the cancellation reason:")
          ?.trim() ?? "";

      if (!cancellationReason) {
        setError("A cancellation reason is required.");
        return;
      }
    }

    const previousItems = items;

    setError("");

    // Optimistic update: keep the interface responsive.
    setItems((current) =>
      current.map((item) =>
        item.id === booking.id
          ? { ...item, status: nextStatus }
          : item,
      ),
    );

    try {
      await apiRequest(`/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: {
          status: nextStatus,
          ...(nextStatus === "CANCELLED"
            ? { cancellationReason }
            : {}),
        },
      });

      await load();
    } catch (e) {
      setItems(previousItems);
      setError(
        e instanceof Error
          ? e.message
          : "Could not update booking status.",
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays size={16} />
                Sales Management
              </p>

              <h1 className="text-3xl font-bold">Bookings</h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage unit reservations and customer bookings.
              </p>
            </div>

            <button
              onClick={() => void openCreate()}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              New Booking
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                aria-label="Refresh bookings"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search bookings..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Booking</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Unit</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-12 text-center text-slate-500"
                      >
                        Loading bookings...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-12 text-center text-slate-500"
                      >
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    items.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold">
                          {b.bookingCode ||
                            b.bookingNumber ||
                            b.id.slice(0, 8)}
                        </td>

                        <td className="px-5 py-4">
                          {b.customer?.name || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {b.unit?.unitNumber ||
                            b.unit?.name ||
                            "—"}

                          {b.unit?.floor?.building?.name && (
                            <span className="block text-xs text-slate-400">
                              {b.unit.floor.building.name}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {b.bookingDate
                            ? new Date(
                                b.bookingDate,
                              ).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {money(b.agreedPrice ?? b.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              b.status === "COMPLETED"
                                ? "bg-green-50 text-green-700"
                                : b.status === "CANCELLED"
                                  ? "bg-red-50 text-red-700"
                                  : b.status === "CONFIRMED"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {b.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={b.status}
                              onChange={(e) =>
                                void updateBookingStatus(
                                  b,
                                  e.target.value,
                                )
                              }
                              disabled={
                                loading ||
                                b.status === "COMPLETED" ||
                                b.status === "CANCELLED"
                              }
                              aria-label={`Change status for ${
                                b.bookingCode ||
                                b.bookingNumber ||
                                b.id
                              }`}
                              className="max-w-[145px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              {statuses.map((s) => (
                                <option key={s} value={s}>
                                  {s.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => void openEdit(b)}
                              disabled={
                                b.status === "CANCELLED" ||
                                b.status === "COMPLETED"
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Edit booking"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>

              <div className="flex gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border px-3 py-2 disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border px-3 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
          <form
            onSubmit={submit}
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-lg font-bold">
                  {editingBooking ? "Edit Booking" : "Create Booking"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select the customer and unit.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModal(false);
                  setEditingBooking(null);
                  setError("");
                }}
                aria-label="Close booking form"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <label className="block text-sm font-medium">
                Customer *
                <select
                  required
                  value={form.customerId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      customerId: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.email || c.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Unit *
                <select
                  required
                  value={form.unitId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      unitId: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                >
                  <option value="">Select unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber || u.name || u.code || u.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Booking Code *
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  value={form.bookingCode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bookingCode: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                  placeholder="e.g. BK-2026-001"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Agreed Price *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.agreedPrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        agreedPrice: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    placeholder="0.00"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Booking Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.bookingAmount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingAmount: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Booking Date
                <input
                  type="date"
                  value={form.bookingDate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bookingDate: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      notes: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 p-5">
              <button
                type="button"
                onClick={() => {
                  setModal(false);
                  setEditingBooking(null);
                  setError("");
                }}
                className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingBooking
                    ? "Save Changes"
                    : "Create Booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
