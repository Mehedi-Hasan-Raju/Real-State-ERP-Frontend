
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  FolderKanban,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/protected-route";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";
import { getEmployees, type Employee } from "@/lib/api/employees";
import type {
  Project as ProjectActionItem,
  ProjectStatus,
  ProjectType,
} from "@/lib/api/projects";
import ProjectForm from "@/components/projects/project-form";
import ProjectActions from "@/components/projects/project-actions";

type Project = {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  city?: string | null;
  budget?: number | string | null;
  createdAt?: string;
  projectManagerId?: string | null;
};

type ProjectResponse = {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const PAGE_SIZE = 10;

const PROJECT_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "ONGOING",
  "ON_HOLD",
  "COMPLETED",
];

const PROJECT_TYPES: ProjectType[] = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "MIXED_USE",
  "OTHER",
];

const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

function formatBudget(value: Project["budget"]) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return String(value);

  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PLANNING":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "ON_HOLD":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function toProjectActionItem(project: Project): ProjectActionItem {
  return {
    id: project.id,
    name: project.name,
    code: project.code,
    type: project.type,
    status: project.status,
    city: project.city,
    budget:
      project.budget == null ? null : Number(project.budget),
  };
}

function dateToStart(value: string) {
  return value ? `${value}T00:00:00.000Z` : "";
}

function dateToEnd(value: string) {
  return value ? `${value}T23:59:59.999Z` : "";
}

function ProjectsContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Debounce search to avoid sending a request for every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Loading managers is independent of project loading.
  useEffect(() => {
    let active = true;

    getEmployees(1, 100)
      .then((employees) => {
        if (active) {
          setManagers(
            employees.filter((employee) => employee.role === "MANAGER"),
          );
        }
      })
      .catch(() => {
        if (active) setManagers([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy,
      sortOrder,
      archived: String(archived),
    });

    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (managerFilter) params.set("projectManagerId", managerFilter);
    if (dateFrom) params.set("startDateFrom", dateToStart(dateFrom));
    if (dateTo) params.set("startDateTo", dateToEnd(dateTo));

    try {
      const response = await apiRequest<ProjectResponse>(
        `/projects?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      setProjects(response.projects ?? []);
      setTotal(response.pagination?.total ?? 0);
      setTotalPages(response.pagination?.totalPages ?? 0);
    } catch (err) {
      setProjects([]);
      setTotal(0);
      setTotalPages(0);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    statusFilter,
    typeFilter,
    managerFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    archived,
  ]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setManagerFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  }

  function changeArchiveView(nextArchived: boolean) {
    setArchived(nextArchived);
    setPage(1);
  }

  const inProgressCount = projects.filter(
    (project) => project.status === "ONGOING",
  ).length;

  const completedCount = projects.filter(
    (project) => project.status === "COMPLETED",
  ).length;

  return (
    <div className="flex min-h-screen bg-[#f6f8fc]">
      <AppSidebar />

      <div className="min-w-0 flex-1">
        <main className="mx-auto min-h-screen max-w-[1600px] p-4 sm:p-7 lg:p-9">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                <Link href="/" className="hover:text-blue-700">
                  Dashboard
                </Link>
                <span>/</span>
                <span>Projects</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Projects
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage and monitor your property development projects.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadProjects()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {!archived && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  + New Project
                </button>
              )}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {archived ? "Archived projects" : "Matching projects"}
                </p>
                <FolderKanban size={19} className="text-blue-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? "—" : total}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Ongoing on this page
                </p>
                <ArrowUpRight size={19} className="text-emerald-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? "—" : inProgressCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Completed on this page
                </p>
                <Building2 size={19} className="text-violet-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? "—" : completedCount}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {archived ? "Archived projects" : "All projects"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Search and filter projects using server-side queries.
                  </p>
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => changeArchiveView(false)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      !archived
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() => changeArchiveView(true)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      archived
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search name or project code"
                    aria-label="Search projects"
                    className={`${inputClass} w-full pl-9`}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by status"
                  className={inputClass}
                >
                  <option value="">All statuses</option>
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by project type"
                  className={inputClass}
                >
                  <option value="">All project types</option>
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>

                <select
                  value={managerFilter}
                  onChange={(event) => {
                    setManagerFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by project manager"
                  className={inputClass}
                >
                  <option value="">All project managers</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>

                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Start date from
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setPage(1);
                    }}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Start date to
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setPage(1);
                    }}
                    className={inputClass}
                  />
                </label>

                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Sort projects by"
                  className={inputClass}
                >
                  <option value="createdAt">Created date</option>
                  <option value="updatedAt">Updated date</option>
                  <option value="name">Project name</option>
                  <option value="code">Project code</option>
                  <option value="startDate">Start date</option>
                  <option value="expectedEndDate">Expected end date</option>
                  <option value="budget">Budget</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Sort order"
                  className={inputClass}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </div>
            </div>

            {error && (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">
                  Could not load projects
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadProjects()}
                  className="mt-3 text-sm font-semibold text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4 font-semibold">Project</th>
                    <th className="px-4 py-4 font-semibold">Type</th>
                    <th className="px-4 py-4 font-semibold">Location</th>
                    <th className="px-4 py-4 font-semibold">Budget</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <LoaderCircle
                          className="mx-auto animate-spin text-blue-700"
                          size={24}
                        />
                        <p className="mt-3 text-sm text-slate-500">
                          Loading projects...
                        </p>
                      </td>
                    </tr>
                  ) : !error && projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <FolderKanban
                          className="mx-auto text-slate-300"
                          size={30}
                        />
                        <p className="mt-3 text-sm font-medium text-slate-700">
                          {archived
                            ? "No archived projects found"
                            : "No projects found"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Try changing the filters or create a new project.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <tr
                        key={project.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {project.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {project.code}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {project.type.replaceAll("_", " ")}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {project.city || "—"}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-700">
                          {formatBudget(project.budget)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(project.status)}`}
                          >
                            {project.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <ProjectActions
                            project={toProjectActionItem(project)}
                            archived={archived}
                            onChanged={() => void loadProjects()}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                {loading
                  ? "Loading results..."
                  : total === 0
                    ? "No results"
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                        (page - 1) * PAGE_SIZE + projects.length,
                        total,
                      )} of ${total} projects`}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-20 text-center text-sm text-slate-600">
                  Page {totalPages === 0 ? 0 : page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={loading || page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          {showCreateForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setShowCreateForm(false);
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-project-title"
                className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="create-project-title"
                      className="text-xl font-bold text-slate-900"
                    >
                      Create new project
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Enter the project details below.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    aria-label="Close form"
                    className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                  >
                    ×
                  </button>
                </div>

                <ProjectForm
                  onCancel={() => setShowCreateForm(false)}
                  onCreated={() => {
                    setShowCreateForm(false);
                    setPage(1);
                    void loadProjects();
                  }}
                />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}
