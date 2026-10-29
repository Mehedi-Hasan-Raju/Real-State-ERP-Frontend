
"use client";

import { useEffect, useState } from "react";
import {
  getEmployees,
  type Employee,
} from "@/lib/api/employees";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function ProjectManagerSelect({
  value,
  onChange,
  required = false,
}: Props) {
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadManagers() {
      try {
        const employees = await getEmployees(1, 100);

        if (active) {
          setManagers(
            employees.filter((employee) => employee.role === "MANAGER"),
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load project managers.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadManagers();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <label
        htmlFor="projectManagerId"
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        Project Manager
      </label>

      <select
        id="projectManagerId"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={loading || Boolean(error)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
      >
        <option value="">
          {loading ? "Loading managers..." : "No manager assigned"}
        </option>

        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.name} — {manager.email}
          </option>
        ))}
      </select>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {!loading && !error && managers.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">
          No Manager accounts found. Create a Manager account first.
        </p>
      )}
    </div>
  );
}
