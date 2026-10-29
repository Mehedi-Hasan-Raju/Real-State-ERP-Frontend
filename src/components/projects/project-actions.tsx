
"use client";

import { useState } from "react";
import {
  archiveProject,
  restoreProject,
  updateProject,
  type Project,
  type ProjectStatus,
  type ProjectType,
} from "@/lib/api/projects";

type Props = {
  project: Project;
  archived?: boolean;
  onChanged: () => void;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function ProjectActions({
  project,
  archived = false,
  onChanged,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [type, setType] = useState<ProjectType>(project.type);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [city, setCity] = useState(project.city ?? "");
  const [budget, setBudget] = useState(
    project.budget == null ? "" : String(project.budget),
  );

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanCode = code.trim();

    if (cleanName.length < 2 || cleanCode.length < 2) {
      setError("Project name and code must contain at least 2 characters.");
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(cleanCode)) {
      setError("Code may contain letters, numbers, underscores and hyphens.");
      return;
    }

    const numericBudget =
      budget.trim() === "" ? null : Number(budget);

    if (
      numericBudget !== null &&
      (!Number.isFinite(numericBudget) || numericBudget < 0)
    ) {
      setError("Enter a valid non-negative budget.");
      return;
    }

    setBusy(true);

    try {
      await updateProject(project.id, {
        name: cleanName,
        code: cleanCode,
        type,
        status,
        city: city.trim() || null,
        budget: numericBudget,
      });

      setEditing(false);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update project.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    const reason = window.prompt(
      `Why are you archiving "${project.name}"?`,
    );

    if (reason === null) return;

    if (reason.trim().length < 3) {
      setError("Please provide an archive reason of at least 3 characters.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await archiveProject(project.id, reason.trim());
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not archive project.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!window.confirm(`Restore "${project.name}"?`)) return;

    setBusy(true);
    setError("");

    try {
      await restoreProject(project.id);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not restore project.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError("");
          setEditing((value) => !value);
        }}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {editing ? "Cancel edit" : "Edit"}
      </button>

      {archived ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRestore()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Please wait..." : "Restore"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleArchive()}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? "Please wait..." : "Archive"}
        </button>
      )}

      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="mt-3 grid w-full gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium text-slate-700">
            Project name
            <input
              className={`${fieldClass} mt-1`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={150}
              required
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Project code
            <input
              className={`${fieldClass} mt-1`}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              minLength={2}
              maxLength={30}
              required
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Project type
            <select
              className={`${fieldClass} mt-1`}
              value={type}
              onChange={(event) => setType(event.target.value as ProjectType)}
            >
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="MIXED_USE">Mixed use</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              className={`${fieldClass} mt-1`}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProjectStatus)
              }
            >
              <option value="PLANNING">Planning</option>
              <option value="ONGOING">Ongoing</option>
              <option value="ON_HOLD">On hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            City
            <input
              className={`${fieldClass} mt-1`}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={100}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Budget
            <input
              className={`${fieldClass} mt-1`}
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
            />
          </label>

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
