
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Plus,
  X,
  CalendarDays,
  Wallet,
  AlertCircle,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
};

type Unit = {
  id: string;
  unitNumber: string;
  building?: {
    name?: string;
    project?: { name?: string };
  };
  floor?: {
    floorNumber?: number;
    building?: {
      name?: string;
      project?: { name?: string };
    };
  };
};

type Booking = {
  id: string;
  bookingCode: string;
  status: string;
  agreedPrice: number | string;
  customer?: Customer | null;
  unit?: Unit | null;
};

type Installment = {
  id: string;
  installmentNo: number;
  title: string;
  amount: number | string;
  dueDate: string;
  status: string;
  notes?: string | null;
  booking?: Booking;
  payments?: { amount: number | string }[];
};

type ListResponse<T> = {
  success?: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const money = (value: number | string | undefined) =>
  `৳${Number(value ?? 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB");
};

function projectName(unit?: Unit | null) {
  return (
    unit?.floor?.building?.project?.name ??
    unit?.building?.project?.name ??
    "—"
  );
}

function buildingName(unit?: Unit | null) {
  return unit?.floor?.building?.name ?? unit?.building?.name ?? "—";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function InstallmentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [installmentNo, setInstallmentNo] = useState("1");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const selectedBooking = bookings.find(
    (booking) => booking.id === bookingId
  );

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);

    try {
      const result = await apiRequest<ListResponse<Booking>>(
        "/bookings?page=1&limit=100&sortOrder=desc"
      );

      const eligibleBookings = (result.data ?? []).filter((booking) =>
        ["CONFIRMED", "COMPLETED"].includes(
          String(booking.status).toUpperCase()
        )
      );

      setBookings(eligibleBookings);
    } catch (err) {
      setError(`Could not load bookings: ${errorMessage(err)}`);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const loadInstallments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortOrder: "desc",
      });

      if (statusFilter) query.set("status", statusFilter);

      const result = await apiRequest<ListResponse<Installment>>(
        `/installments?${query.toString()}`
      );

      setInstallments(result.data ?? []);
      setTotalPages(
        Math.max(1, result.pagination?.totalPages ?? 1)
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    void loadInstallments();
  }, [loadInstallments]);

  const resetForm = () => {
    setBookingId("");
    setInstallmentNo("1");
    setTitle("");
    setAmount("");
    setDueDate("");
    setNotes("");
  };

  const createInstallment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedBooking) {
      setError("Select a confirmed or completed booking.");
      return;
    }

    const number = Number(installmentNo);
    const numericAmount = Number(amount);

    if (!Number.isInteger(number) || number < 1) {
      setError("Installment number must be a positive whole number.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!dueDate) {
      setError("Select a due date.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/installments", {
        method: "POST",
        body: {
          bookingId,
          installmentNo: number,
          title: title.trim(),
          amount: numericAmount,
          dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });

      setSuccess("Installment created successfully.");
      resetForm();
      setShowForm(false);
      setPage(1);

      // Refresh the history and the booking data.
      await Promise.all([loadInstallments(), loadBookings()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const totalOnPage = installments.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Finance / Installments
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Installments
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Create payment schedules and track customer dues.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  void Promise.all([loadBookings(), loadInstallments()])
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus size={17} />
                Create installment
              </button>
            </div>
          </header>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              {success}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Installments on this page
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {installments.length}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <CalendarDays size={23} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Scheduled amount on this page
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {money(totalOnPage)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <Wallet size={23} />
                </div>
              </div>
            </div>
          </section>

          {showForm && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-bold">Create installment</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a confirmed booking before entering the schedule.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close form"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                onSubmit={createInstallment}
                className="space-y-5 p-5 sm:p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Booking *
                  </label>

                  <select
                    required
                    value={bookingId}
                    onChange={(event) => setBookingId(event.target.value)}
                    disabled={loadingBookings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingBookings
                        ? "Loading bookings..."
                        : "Select a confirmed booking"}
                    </option>

                    {bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.bookingCode} —{" "}
                        {booking.customer?.name ?? "Customer"} — Unit{" "}
                        {booking.unit?.unitNumber ?? "—"}
                      </option>
                    ))}
                  </select>

                  {!loadingBookings && bookings.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No eligible bookings were returned. A booking must be
                      CONFIRMED or COMPLETED before installments can be
                      created.
                    </p>
                  )}
                </div>

                {selectedBooking && (
                  <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">Booking code</p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedBooking.bookingCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedBooking.customer?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedBooking.customer?.phone ?? ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Project / Unit</p>
                      <p className="mt-1 text-sm font-semibold">
                        {projectName(selectedBooking.unit)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {buildingName(selectedBooking.unit)} /{" "}
                        {selectedBooking.unit?.unitNumber ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Agreed price</p>
                      <p className="mt-1 text-sm font-semibold">
                        {money(selectedBooking.agreedPrice)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Installment number *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={installmentNo}
                      onChange={(event) =>
                        setInstallmentNo(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Title *
                    </label>
                    <input
                      required
                      minLength={1}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Down payment"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Amount (৳) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="Enter installment amount"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {selectedBooking && (
                      <p className="mt-2 text-xs text-slate-500">
                        Booking agreed price:{" "}
                        <strong>
                          {money(selectedBooking.agreedPrice)}
                        </strong>
                        . All non-cancelled installments combined cannot
                        exceed this price.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Due date *
                    </label>
                    <input
                      required
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Optional installment notes"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      loadingBookings ||
                      !selectedBooking
                    }
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Create installment"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold">Installment history</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Installments associated with your organization&apos;s bookings.
                </p>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially paid</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <RefreshCw size={17} className="animate-spin" />
                Loading installments...
              </div>
            ) : installments.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto w-fit rounded-2xl bg-slate-100 p-4 text-slate-500">
                  <CalendarDays size={28} />
                </div>
                <h3 className="mt-4 font-semibold">No installments found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create an installment for an eligible booking to see it here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Installment</th>
                      <th className="px-5 py-4 font-semibold">Booking</th>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold">Due date</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {installments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            #{item.installmentNo} — {item.title}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {item.booking?.bookingCode ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.booking?.unit?.unitNumber
                              ? `Unit ${item.booking.unit.unitNumber}`
                              : "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {item.booking?.customer?.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(item.dueDate)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "CANCELLED"
                                  ? "bg-slate-100 text-slate-600"
                                  : item.status === "PARTIALLY_PAID"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {item.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold">
                          {money(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
