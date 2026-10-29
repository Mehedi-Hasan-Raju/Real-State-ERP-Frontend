
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Mail,
  Phone,
  MapPin,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function getCustomerList(result: unknown): Customer[] {
  if (Array.isArray(result)) return result as Customer[];

  if (!result || typeof result !== "object") return [];

  const data = result as Record<string, unknown>;

  if (Array.isArray(data.customers)) return data.customers as Customer[];
  if (Array.isArray(data.data)) return data.data as Customer[];

  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;
    if (Array.isArray(nested.customers)) {
      return nested.customers as Customer[];
    }
  }

  return [];
}

function getPagination(
  result: unknown,
  currentPage: number,
  limit: number,
): Pagination {
  const fallback: Pagination = {
    page: currentPage,
    limit,
    total: 0,
    totalPages: 1,
  };

  if (!result || typeof result !== "object") return fallback;

  const data = result as Record<string, unknown>;
  const pagination =
    data.pagination && typeof data.pagination === "object"
      ? (data.pagination as Record<string, unknown>)
      : data.data && typeof data.data === "object"
        ? ((data.data as Record<string, unknown>).pagination as
            | Record<string, unknown>
            | undefined)
        : undefined;

  if (!pagination) return fallback;

  const total = Number(pagination.total ?? 0);
  return {
    page: Number(pagination.page ?? currentPage),
    limit: Number(pagination.limit ?? limit),
    total,
    totalPages: Number(
      pagination.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    ),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());

      const result = await apiRequest<unknown>(
        `/customers?${params.toString()}`,
      );

      const list = getCustomerList(result);
      setCustomers(list);
      setPagination(getPagination(result, page, 10));
    } catch (err) {
      setError(getErrorMessage(err));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function openCreateModal() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof CustomerForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload: Record<string, string> = {
      name: form.name.trim(),
    };

    if (form.email.trim()) payload.email = form.email.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.address.trim()) payload.address = form.address.trim();

    try {
      if (editingCustomer) {
        await apiRequest(`/customers/${editingCustomer.id}`, {
          method: "PATCH",
          body: payload,
        });
        setSuccess("Customer updated successfully.");
      } else {
        await apiRequest("/customers", {
          method: "POST",
          body: payload,
        });
        setSuccess("Customer created successfully.");
        setPage(1);
      }

      setModalOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm);
      await loadCustomers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const firstItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-h-screen min-w-0 flex-1">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Users size={16} />
                <span>Customer Management</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Customers
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage your real estate customers and their contact information.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <Plus size={18} />
              Add Customer
            </button>
          </div>

          {/* Feedback */}
          {success && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>{success}</span>
              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Dismiss success message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {!modalOpen && error && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadCustomers()}
                className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Customers
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : pagination.total.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Users size={22} />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Customers in your organization
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Current Page
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {pagination.page}{" "}
                    <span className="text-lg font-medium text-slate-400">
                      / {pagination.totalPages}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <UserRound size={22} />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Browse the customer directory
              </p>
            </div>
          </div>

          {/* Customer table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Customer Directory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search and manage customer records.
                </p>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  void loadCustomers();
                }}
                className="flex w-full gap-2 sm:max-w-md"
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search customers..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold">Address</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="inline-flex items-center gap-3 text-slate-500">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          Loading customers...
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400">
                            <Users size={28} />
                          </div>
                          <p className="font-semibold text-slate-800">
                            No customers found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Add a customer or change your search.
                          </p>
                          <button
                            type="button"
                            onClick={openCreateModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            <Plus size={16} />
                            Add Customer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-semibold text-blue-700">
                              {(customer.name || "C")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {customer.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Customer
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {customer.email ? (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail
                                size={15}
                                className="shrink-0 text-slate-400"
                              />
                              <span>{customer.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not provided</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {customer.phone ? (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone
                                size={15}
                                className="shrink-0 text-slate-400"
                              />
                              <span>{customer.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not provided</span>
                          )}
                        </td>

                        <td className="max-w-[240px] px-6 py-4">
                          {customer.address ? (
                            <div className="flex items-start gap-2 text-slate-600">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <span className="line-clamp-2">
                                {customer.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not provided</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            aria-label={`Edit ${customer.name}`}
                            title="Edit customer"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {firstItem}–{lastItem}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.total}
                </span>{" "}
                customers
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="px-2 text-sm font-medium text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2
                  id="customer-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingCustomer
                    ? "Update the customer's contact information."
                    : "Enter the customer's details below."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 px-6 py-6">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="customer-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer-name"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    maxLength={150}
                    placeholder="e.g. Rahim Ahmed"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="customer-email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Email Address
                    </label>
                    <input
                      id="customer-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      maxLength={254}
                      placeholder="customer@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Phone Number
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      maxLength={30}
                      placeholder="+8801XXXXXXXXX"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="customer-address"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Address
                  </label>
                  <textarea
                    id="customer-address"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    maxLength={1000}
                    rows={3}
                    placeholder="Enter customer address"
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
