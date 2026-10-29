
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  Clock3,
  AlertTriangle,
  RefreshCw,
  Search,
  CreditCard,
  CalendarDays,
  ArrowUpRight,
  ReceiptText,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type Summary = {
  totalAgreed?: number | string;
  lifetimeCollected?: number | string;
  collectedInPeriod?: number | string;
  outstanding?: number | string;
  installmentOutstanding?: number | string;
  overdueCount?: number | string;
  overdueBalance?: number | string;
};

type Payment = {
  id: string;
  paymentCode?: string;
  amount: number | string;
  paymentDate?: string;
  method?: string;
  reference?: string | null;
  notes?: string | null;
  booking?: {
    id?: string;
    bookingCode?: string;
    bookingNumber?: string;
    customer?: {
      name?: string;
      phone?: string;
    };
    customerName?: string;
  };
  installment?: {
    id?: string;
    installmentNo?: number;
    title?: string;
    status?: string;
  };
  receivedBy?: {
    name?: string;
  };
};

type Installment = {
  id: string;
  installmentNo?: number;
  title?: string;
  amount: number | string;
  dueDate?: string;
  status: string;
  payments?: { amount: number | string }[];
  booking?: {
    bookingCode?: string;
    bookingNumber?: string;
    customer?: {
      name?: string;
    };
    unit?: {
      unitNumber?: string;
    };
  };
};

type Tab = "overview" | "payments" | "installments";

function extractList<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];

  if (!result || typeof result !== "object") return [];

  const obj = result as Record<string, unknown>;

  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.payments)) return obj.payments as T[];
  if (Array.isArray(obj.installments)) return obj.installments as T[];

  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;

    if (Array.isArray(nested.items)) return nested.items as T[];
    if (Array.isArray(nested.payments)) return nested.payments as T[];
    if (Array.isArray(nested.installments))
      return nested.installments as T[];
  }

  return [];
}

function extractSummary(result: unknown): Summary {
  if (!result || typeof result !== "object") return {};

  const obj = result as Record<string, unknown>;

  const nested =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;

  const candidate =
    nested.summary && typeof nested.summary === "object"
      ? (nested.summary as Record<string, unknown>)
      : nested;

  return candidate as Summary;
}

function money(value?: number | string) {
  return `৳${Number(value ?? 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function statusStyle(status: string) {
  switch (status.toUpperCase()) {
    case "PAID":
      return "bg-green-50 text-green-700";
    case "PARTIALLY_PAID":
      return "bg-blue-50 text-blue-700";
    case "OVERDUE":
      return "bg-red-50 text-red-700";
    case "CANCELLED":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function getPaidAmount(installment: Installment) {
  return (installment.payments ?? []).reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0,
  );
}

function getRemaining(installment: Installment) {
  return Math.max(
    0,
    Number(installment.amount) - getPaidAmount(installment),
  );
}

function getBookingCode(payment: Payment) {
  return (
    payment.booking?.bookingCode ||
    payment.booking?.bookingNumber ||
    "—"
  );
}

function getCustomerName(payment: Payment) {
  return (
    payment.booking?.customer?.name ||
    payment.booking?.customerName ||
    "—"
  );
}

export default function FinancePage() {
  const [summary, setSummary] = useState<Summary>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayMs, setTodayMs] = useState(0);
  const [thisMonth, setThisMonth] = useState("");
  useEffect(() => {
    const d = new Date();
    setTodayMs(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
    setThisMonth(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  }, []);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError("");

    const paymentParams = new URLSearchParams({
      page: "1",
      limit: "100",
      sortOrder: "desc",
    });

    if (method) paymentParams.set("method", method);
    if (fromDate) paymentParams.set("from", fromDate);
    if (toDate) paymentParams.set("to", toDate);

    try {
      const [summaryResult, paymentResult, installmentResult] =
        await Promise.all([
          apiRequest<unknown>("/finance-reports/summary"),
          apiRequest<unknown>(`/payments?${paymentParams.toString()}`),
          apiRequest<unknown>(
            "/installments?page=1&limit=100&sortOrder=desc",
          ),
        ]);

      setSummary(extractSummary(summaryResult));
      setPayments(extractList<Payment>(paymentResult));
      setInstallments(extractList<Installment>(installmentResult));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load finance data.",
      );
    } finally {
      setLoading(false);
    }
  }, [method, fromDate, toDate]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const visiblePayments = payments.filter((payment) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      payment.paymentCode,
      getBookingCode(payment),
      getCustomerName(payment),
      payment.method,
      payment.reference,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  const visibleInstallments = installments.filter((item) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      item.title,
      item.booking?.bookingCode,
      item.booking?.bookingNumber,
      item.booking?.customer?.name,
      item.booking?.unit?.unitNumber,
      item.status,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  const paidThisMonth = Number(summary.collectedInPeriod ?? 0);
  const lifetimeCollected = Number(summary.lifetimeCollected ?? 0);
  const outstanding = Number(
    summary.installmentOutstanding ?? summary.outstanding ?? 0,
  );
  const overdueBalance = Number(summary.overdueBalance ?? 0);
  const overdueCount = Number(summary.overdueCount ?? 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payments" },
    { id: "installments", label: "Installments" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Wallet size={16} />
                Financial Management
              </p>

              <h1 className="text-3xl font-bold tracking-tight">
                Finance
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Monitor collections, outstanding installments and payment records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadFinance()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh data
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div>
                <p className="font-semibold">Finance data could not be loaded</p>
                <p className="mt-1">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => void loadFinance()}
                aria-label="Retry loading finance data"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
            {tabs.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  tab === item.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {(tab === "overview" || tab === "payments") && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payment code, booking or customer..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                aria-label="Filter by payment method"
              >
                <option value="">All payment methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="Payments from date"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />

              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="Payments to date"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
          )}

          {tab === "overview" && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Collected"
                  value={money(lifetimeCollected)}
                  subtitle="All recorded payments"
                  icon={Wallet}
                  iconClass="bg-blue-50 text-blue-700"
                />

                <MetricCard
                  title="This Month"
                  value={money(paidThisMonth)}
                  subtitle={thisMonth}
                  icon={TrendingUp}
                  iconClass="bg-green-50 text-green-700"
                />

                <MetricCard
                  title="Outstanding"
                  value={money(outstanding)}
                  subtitle="Remaining installment balance"
                  icon={Clock3}
                  iconClass="bg-amber-50 text-amber-700"
                />

                <MetricCard
                  title="Overdue Balance"
                  value={money(overdueBalance)}
                  subtitle={`${overdueCount} overdue installment(s)`}
                  icon={AlertTriangle}
                  iconClass="bg-red-50 text-red-700"
                />
              </div>

              <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">Recent Payments</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Latest recorded customer collections
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTab("payments")}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>

                  {loading ? (
                    <LoadingMessage />
                  ) : payments.length === 0 ? (
                    <EmptyMessage message="No payment records found." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[580px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="pb-3 pr-4">Payment</th>
                            <th className="pb-3 pr-4">Customer</th>
                            <th className="pb-3 pr-4">Date</th>
                            <th className="pb-3 text-right">Amount</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {payments.slice(0, 6).map((payment) => (
                            <tr key={payment.id}>
                              <td className="py-3 pr-4">
                                <p className="font-semibold">
                                  {payment.paymentCode || payment.id.slice(0, 8)}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {getBookingCode(payment)}
                                </p>
                              </td>

                              <td className="py-3 pr-4">
                                {getCustomerName(payment)}
                              </td>

                              <td className="py-3 pr-4 text-slate-500">
                                {formatDate(payment.paymentDate)}
                              </td>

                              <td className="py-3 text-right font-semibold text-green-700">
                                {money(payment.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                      <ReceiptText size={20} />
                    </div>

                    <div>
                      <h2 className="font-bold">Collection Summary</h2>
                      <p className="text-sm text-slate-500">
                        Current financial position
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SummaryLine
                      label="Total agreed sales"
                      value={money(Number(summary.totalAgreed ?? 0))}
                    />

                    <SummaryLine
                      label="Total collected"
                      value={money(lifetimeCollected)}
                      positive
                    />

                    <SummaryLine
                      label="Remaining balance"
                      value={money(outstanding)}
                    />

                    <div className="border-t border-slate-100 pt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Collection progress
                        </span>

                        <span className="font-semibold">
                          {Number(summary.totalAgreed ?? 0) > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (lifetimeCollected /
                                    Number(summary.totalAgreed)) *
                                    100,
                                ),
                              )
                            : 0}
                          %
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${
                              Number(summary.totalAgreed ?? 0) > 0
                                ? Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      (lifetimeCollected /
                                        Number(summary.totalAgreed)) *
                                        100,
                                    ),
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Installment Alerts</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Unpaid and overdue installment records
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTab("installments")}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    View installments
                  </button>
                </div>

                {loading ? (
                  <LoadingMessage />
                ) : installments.filter(
                    (item) =>
                      item.status === "PENDING" ||
                      item.status === "PARTIALLY_PAID" ||
                      item.status === "OVERDUE",
                  ).length === 0 ? (
                  <EmptyMessage message="No unpaid installments found in the loaded records." />
                ) : (
                  <div className="space-y-3">
                    {installments
                      .filter(
                        (item) =>
                          item.status === "PENDING" ||
                          item.status === "PARTIALLY_PAID" ||
                          item.status === "OVERDUE",
                      )
                      .slice(0, 5)
                      .map((item) => {
                        const overdue =
                          item.dueDate &&
                          new Date(item.dueDate).getTime() <
                            todayMs &&
                          getRemaining(item) > 0;

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-semibold">
                                {item.title ||
                                  `Installment ${item.installmentNo ?? ""}`}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.booking?.customer?.name || "Customer"}{" "}
                                ·{" "}
                                {item.booking?.bookingCode ||
                                  item.booking?.bookingNumber ||
                                  "Booking"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Due: {formatDate(item.dueDate)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <div className="text-right">
                                <p className="font-bold">
                                  {money(getRemaining(item))}
                                </p>

                                <p className="text-xs text-slate-500">
                                  Remaining
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  overdue
                                    ? statusStyle("OVERDUE")
                                    : statusStyle(item.status)
                                }`}
                              >
                                {overdue
                                  ? "OVERDUE"
                                  : item.status.replaceAll("_", " ")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "payments" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-bold">Payment History</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recorded payments from the finance API
                </p>
              </div>

              {loading ? (
                <LoadingMessage />
              ) : visiblePayments.length === 0 ? (
                <EmptyMessage message="No payments match your filters." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Payment</th>
                        <th className="px-5 py-4">Booking</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Method</th>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visiblePayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-semibold">
                            {payment.paymentCode || payment.id.slice(0, 8)}
                            {payment.reference && (
                              <span className="mt-1 block text-xs font-normal text-slate-400">
                                Ref: {payment.reference}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {getBookingCode(payment)}
                          </td>

                          <td className="px-5 py-4">
                            {getCustomerName(payment)}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                              {(payment.method || "OTHER").replaceAll(
                                "_",
                                " ",
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {formatDate(payment.paymentDate)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-green-700">
                            {money(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === "installments" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-bold">Installment Schedule</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Due amounts and remaining balances
                </p>
              </div>

              {loading ? (
                <LoadingMessage />
              ) : visibleInstallments.length === 0 ? (
                <EmptyMessage message="No installments match your search." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Installment</th>
                        <th className="px-5 py-4">Booking</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Due date</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                        <th className="px-5 py-4 text-right">Remaining</th>
                        <th className="px-5 py-4">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visibleInstallments.map((item) => {
                        const remaining = getRemaining(item);
                        const overdue =
                          item.dueDate &&
                          new Date(item.dueDate).getTime() <
                            todayMs &&
                          remaining > 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-semibold">
                              {item.title ||
                                `Installment ${item.installmentNo ?? ""}`}
                            </td>

                            <td className="px-5 py-4">
                              {item.booking?.bookingCode ||
                                item.booking?.bookingNumber ||
                                "—"}
                            </td>

                            <td className="px-5 py-4">
                              {item.booking?.customer?.name || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {formatDate(item.dueDate)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              {money(item.amount)}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold">
                              {money(remaining)}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  overdue
                                    ? statusStyle("OVERDUE")
                                    : statusStyle(item.status)
                                }`}
                              >
                                {overdue
                                  ? "OVERDUE"
                                  : item.status.replaceAll("_", " ")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-400">
            Financial totals are read from the backend reporting API.
            Payment and installment tables display the records returned by
            their respective endpoints. Expense and profit/loss accounting
            are not included until their backend models and APIs are implemented.
          </p>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={positive ? "font-semibold text-green-700" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
      <RefreshCw size={16} className="animate-spin" />
      Loading finance data...
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center p-10 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <CheckCircle2 size={23} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
