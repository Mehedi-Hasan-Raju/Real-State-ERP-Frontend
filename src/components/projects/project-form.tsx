
"use client";

import { useState, type FormEvent } from "react";
import {
  createProject,
  type CreateProjectInput,
  type ProjectType,
  type ProjectStatus,
} from "@/lib/api/projects";
import ProjectManagerSelect from "@/components/projects/project-manager-select";



type ProjectFormProps = {
  onCancel: () => void;
  onCreated: () => void;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "text-sm font-medium text-slate-700";

function toIsoDate(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export default function ProjectForm({
  onCancel,
  onCreated,
}: ProjectFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<ProjectType>("RESIDENTIAL");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [projectManagerId, setProjectManagerId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Project name must contain at least 2 characters.");
      return;
    }

    if (!/^[A-Za-z0-9_-]{2,30}$/.test(code.trim())) {
      setError(
        "Project code must be 2–30 characters and use only letters, numbers, _ or -.",
      );
      return;
    }

    if (budget.trim() && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) {
      setError("Enter a valid non-negative budget.");
      return;
    }

    if (
      startDate &&
      expectedEndDate &&
      new Date(startDate) > new Date(expectedEndDate)
    ) {
      setError("Expected end date must be on or after the start date.");
      return;
    }

    const input: CreateProjectInput = {
      name: name.trim(),
      code: code.trim(),
      type,
      status,
      description: description.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      startDate: toIsoDate(startDate),
      expectedEndDate: toIsoDate(expectedEndDate),
      budget: budget.trim() ? Number(budget) : null,
      projectManagerId: projectManagerId.trim() || null,
    };

    setSaving(true);

    try {
      await createProject(input);
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create the project. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Project name *
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Green Valley Residence"
            minLength={2}
            maxLength={150}
            required
          />
        </label>

        <label className={labelClass}>
          Project code *
          <input
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. GVR-001"
            minLength={2}
            maxLength={30}
            pattern="[A-Za-z0-9_-]+"
            title="Use letters, numbers, underscores or hyphens."
            required
          />
        </label>

        <label className={labelClass}>
          Project type
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as ProjectType)}
          >
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="MIXED_USE">Mixed use</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label className={labelClass}>
          Status
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            <option value="PLANNING">Planning</option>
            <option value="ONGOING">Ongoing</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>

        <label className={labelClass}>
          City
          <input
            className={inputClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Dhaka"
            maxLength={100}
          />
        </label>

        <label className={labelClass}>
          Address
          <input
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Project location"
            maxLength={300}
          />
        </label>

        <label className={labelClass}>
          Start date
          <input
            className={inputClass}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className={labelClass}>
          Expected end date
          <input
            className={inputClass}
            type="date"
            value={expectedEndDate}
            onChange={(e) => setExpectedEndDate(e.target.value)}
          />
        </label>

        <label className={labelClass}>
          Budget
          <input
            className={inputClass}
            type="number"
            min="0"
            max="9999999999999.99"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 50000000"
          />
        </label>

        <div>
          <ProjectManagerSelect
            value={projectManagerId}
            onChange={setProjectManagerId}
          />
        </div>
      </div>

      <label className={`${labelClass} block`}>
        Description
        <textarea
          className={inputClass}
          rows={3}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add project details..."
        />
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating project..." : "Create project"}
        </button>
      </div>
    </form>
  );
}
