
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  Plus,
  X,
  Wallet,
  CalendarDays,
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
  floor?: {
    floorNumber?: number;
    building?: {
      name?: string;
      project?: { name?: string };
    };
  };
  building?: { name?: string; project?: { name?: string } };
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
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  payments?: { amount: number | string }[];
  booking?: Booking;
};

type Payment = {
  id: string;
  paymentCode: string;
  amount: number | string;
  paymentDate: string;
  method: string;
  reference?: string | null;
  booking?: Booking | null;
  installment?: Installment | null;
  receivedBy?: { name?: string } | null;
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

const dateText = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB");
};

const getError = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

function getProjectName(unit?: Unit | null) {
  return (
    unit?.floor?.building?.project?.name ??
    unit?.building?.project?.name ??
    "—"
  );
}

function getBuildingName(unit?: Unit | null) {
  return unit?.floor?.building?.name ?? unit?.building?.name ?? "—";
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [paymentResult, bookingResult] = await Promise.all([
        apiRequest<ListResponse<Payment>>(
          `/payments?page=${page}&limit=10&sortOrder=desc`
        ),
        apiRequest<ListResponse<Booking>>(
          "/bookings?page=1&limit=100&sortOrder=desc"
        ),
      ]);

      setPayments(paymentResult.data ?? []);
      setTotalPages(
        Math.max(1, paymentResult.pagination?.totalPages ?? 1)
      );

      // Only confirmed/completed bookings can receive payments.
      setBookings(
        (bookingResult.data ?? []).filter((booking) =>
          ["CONFIRMED", "COMPLETED"].includes(
            String(booking.status).toUpperCase()
          )
        )
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedBooking = bookings.find(
    (booking) => booking.id === bookingId
  );

  const selectedInstallment = installments.find(
    (installment) => installment.id === installmentId
  );

  const paidForInstallment = (installment: Installment) =>
    (installment.payments ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

  const remainingForInstallment = (installment: Installment) =>
    Math.max(
      0,
      Number(installment.amount) - paidForInstallment(installment)
    );

  const loadInstallments = async (selectedBookingId: string) => {
    setBookingId(selectedBookingId);
    setInstallmentId("");
    setInstallments([]);
    setAmount("");
    setError("");
    setSuccess("");

    if (!selectedBookingId) return;

    setLoadingInstallments(true);

    try {
      // The backend filters installments by bookingId and organization.
      const result = await apiRequest<ListResponse<Installment>>(
        `/installments?bookingId=${encodeURIComponent(
          selectedBookingId
        )}&page=1&limit=100&sortOrder=asc`
      );

      const payable = (result.data ?? []).filter((item) =>
        ["PENDING", "PARTIALLY_PAID"].includes(
          String(item.status).toUpperCase()
        )
      );

      setInstallments(payable);
    } catch (err) {
      setError(`Could not load installments: ${getError(err)}`);
    } finally {
      setLoadingInstallments(false);
    }
  };

  const resetForm = () => {
    setPaymentCode("");
    setBookingId("");
    setInstallmentId("");
    setInstallments([]);
    setAmount("");
    setReference("");
    setNotes("");
    setMethod("CASH");
    setError("");
    setSuccess("");
  };

  const createPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedBooking) {
      setError("Please select a booking.");
      return;
    }

    if (!selectedInstallment) {
      setError("Please select an unpaid installment.");
      return;
    }

    const numericAmount = Number(amount);
    const remaining = remainingForInstallment(selectedInstallment);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid payment amount greater than zero.");
      return;
    }

    if (numericAmount > remaining) {
      setError(`The maximum payable balance is ${money(remaining)}.`);
      return;
    }

    if (!paymentCode.trim()) {
      setError("Payment code is required.");
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("/payments", {
        method: "POST",
        body: {
          paymentCode: paymentCode.trim(),
          installmentId,
          amount: numericAmount,
          paymentDate: paymentDate
            ? new Date(`${paymentDate}T12:00:00`).toISOString()
            : undefined,
          method,
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });

      setSuccess("Payment recorded successfully.");
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      payment.paymentCode?.toLowerCase().includes(query) ||
      payment.booking?.bookingCode?.toLowerCase().includes(query) ||
      payment.booking?.customer?.name?.toLowerCase().includes(query) ||
      payment.installment?.title?.toLowerCase().includes(query);

    const matchesMethod = !methodFilter || payment.method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalOnPage = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
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
                Finance / Payments
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Payments
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Record customer payments and track received amounts.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus size={17} />
                Record payment
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
                    Payments on this page
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {payments.length}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <CreditCard size={23} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Amount received on this page
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
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
                  <h2 className="font-bold text-slate-900">
                    Record a payment
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a booking first, then choose one of its unpaid
                    installments.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close payment form"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={createPayment} className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Payment code *
                    </label>
                    <input
                      required
                      minLength={2}
                      maxLength={40}
                      value={paymentCode}
                      onChange={(e) => setPaymentCode(e.target.value)}
                      placeholder="e.g. PAY-2026-001"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Booking *
                    </label>
                    <select
                      required
                      value={bookingId}
                      onChange={(e) => void loadInstallments(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select a confirmed booking</option>
                      {bookings.map((booking) => (
                        <option key={booking.id} value={booking.id}>
                          {booking.bookingCode} —{" "}
                          {booking.customer?.name ?? "Customer"} —{" "}
                          {booking.unit?.unitNumber ?? "Unit"}
                        </option>
                      ))}
                    </select>
                    {bookings.length === 0 && !loading && (
                      <p className="mt-2 text-xs text-amber-700">
                        No confirmed or completed bookings were returned.
                        Confirm a booking and create its installments first.
                      </p>
                    )}
                  </div>
                </div>

                {selectedBooking && (
                  <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      <p className="text-xs text-slate-500">Project</p>
                      <p className="mt-1 text-sm font-semibold">
                        {getProjectName(selectedBooking.unit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Building / Unit</p>
                      <p className="mt-1 text-sm font-semibold">
                        {getBuildingName(selectedBooking.unit)} /{" "}
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
                      Installment *
                    </label>
                    <select
                      required
                      value={installmentId}
                      disabled={!bookingId || loadingInstallments}
                      onChange={(e) => {
                        setInstallmentId(e.target.value);
                        setAmount("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {loadingInstallments
                          ? "Loading installments..."
                          : !bookingId
                            ? "Select a booking first"
                            : installments.length
                              ? "Select an unpaid installment"
                              : "No unpaid installments found"}
                      </option>
                      {installments.map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.installmentNo} — {item.title} — Balance{" "}
                          {money(remainingForInstallment(item))}
                        </option>
                      ))}
                    </select>
                    {bookingId &&
                      !loadingInstallments &&
                      installments.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          This booking has no pending installments. Check the
                          Installments page to create or review them.
                        </p>
                      )}
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
                      max={
                        selectedInstallment
                          ? remainingForInstallment(selectedInstallment)
                          : undefined
                      }
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={!selectedInstallment}
                      placeholder="Enter amount"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                    {selectedInstallment && (
                      <p className="mt-2 text-xs text-slate-500">
                        Outstanding balance:{" "}
                        <strong>
                          {money(remainingForInstallment(selectedInstallment))}
                        </strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Payment date *
                    </label>
                    <input
                      required
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Payment method *
                    </label>
                    <select
                      required
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="ONLINE">Online</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Reference
                    </label>
                    <input
                      maxLength={150}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Transaction ID / cheque no."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Notes
                    </label>
                    <input
                      maxLength={2000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      loadingInstallments ||
                      !selectedBooking ||
                      !selectedInstallment
                    }
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Recording..." : "Save payment"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Payment history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  View recorded payments and associated booking details.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search payments..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-56"
                  />
                </div>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">All methods</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <RefreshCw size={17} className="animate-spin" />
                Loading payments...
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                  <CreditCard size={28} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">
                  No payments found
                </h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Payments will appear here after a successful payment
                  submission.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Payment</th>
                      <th className="px-5 py-4 font-semibold">Booking</th>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold">Installment</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold">Method</th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {payment.paymentCode}
                          </p>
                          {payment.reference && (
                            <p className="mt-1 text-xs text-slate-500">
                              Ref: {payment.reference}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {payment.booking?.bookingCode ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.booking?.unit?.unitNumber
                              ? `Unit ${payment.booking.unit.unitNumber}`
                              : "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {payment.booking?.customer?.name ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.booking?.customer?.phone ?? ""}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-slate-800">
                            {payment.installment?.title ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.installment
                              ? `#${payment.installment.installmentNo}`
                              : ""}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="text-slate-400"
                            />
                            {dateText(payment.paymentDate)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {payment.method.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-900">
                          {money(payment.amount)}
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
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
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
