
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/protected-route";
import {
  createEmployee,
  getEmployees,
  type Employee,
  type EmployeeRole,
} from "@/lib/api/employees";

const roles: { value: EmployeeRole; label: string }[] = [
  { value: "ADMIN", label: "Administrator" },
  { value: "MANAGER", label: "Project Manager" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "SALES", label: "Sales Executive" },
  { value: "CONSTRUCTION", label: "Construction Staff" },
  { value: "VIEWER", label: "Viewer (Read-only)" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function EmployeesContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<EmployeeRole>("MANAGER");

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getEmployees(1, 100);
      setEmployees(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load employees.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await createEmployee({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      setSuccess(result.message || "Employee account created.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("MANAGER");
      setShowForm(false);

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create employee account.",
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      `${employee.name} ${employee.email}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "ALL" || employee.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <span aria-hidden="true">←</span>
              Back to dashboard
            </Link>
            <p className="text-sm font-medium text-blue-600">
              Organization / Team
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Employee Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create accounts and manage your organization’s team.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm((value) => !value);
            }}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {showForm ? "Close form" : "+ Add employee"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {showForm && (
          <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-900">
              Create employee account
            </h2>

            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Full name *
                <input
                  className={`${inputClass} mt-2`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="name"
                  placeholder="Employee full name"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Email address *
                <input
                  className={`${inputClass} mt-2`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="employee@company.com"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Temporary password *
                <input
                  className={`${inputClass} mt-2`}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                  placeholder="8–128 characters"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Employee role *
                <select
                  className={`${inputClass} mt-2`}
                  value={role}
                  onChange={(e) => setRole(e.target.value as EmployeeRole)}
                  required
                >
                  {roles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating account..." : "Create account"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Share the initial password securely with the employee. A
              password-change flow can be added separately.
            </p>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              aria-label="Search employees"
            />

            <select
              className={inputClass}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter employees by role"
            >
              <option value="ALL">All roles</option>
              {roles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
            {filteredEmployees.length} employee(s)
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Loading employees...
            </p>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="font-semibold text-slate-800">
                No employees found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Create a Manager or Accountant account to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Employee</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {employee.name}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {employee.email}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {roles.find((item) => item.value === employee.role)?.label
                            ?? employee.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <EmployeesContent />
    </ProtectedRoute>
  );
}
