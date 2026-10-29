
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type BuildingStatus =
  | "PLANNING"
  | "UNDER_CONSTRUCTION"
  | "ON_HOLD"
  | "COMPLETED";

type ProjectOption = {
  id: string;
  name: string;
  code: string;
};

type Building = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  address?: string | null;
  totalFloors?: number | null;
  status: BuildingStatus;
  projectId: string;
  project?: ProjectOption;
  archivedAt?: string | null;
  archiveReason?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type PaginatedBuildings = {
  buildings: Building[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type BuildingForm = {
  projectId: string;
  name: string;
  code: string;
  description: string;
  address: string;
  totalFloors: string;
  status: BuildingStatus;
};

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: BuildingStatus; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "UNDER_CONSTRUCTION", label: "Under construction" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
];

const EMPTY_FORM: BuildingForm = {
  projectId: "",
  name: "",
  code: "",
  description: "",
  address: "",
  totalFloors: "",
  status: "PLANNING",
};

function statusLabel(status: BuildingStatus) {
  return (
    STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

function statusClasses(status: BuildingStatus) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "UNDER_CONSTRUCTION":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    case "ON_HOLD":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);

  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [form, setForm] = useState<BuildingForm>(EMPTY_FORM);

  const [archiveTarget, setArchiveTarget] = useState<Building | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectFilter),
    [projects, projectFilter],
  );

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const result = await apiRequest<{
        projects?: ProjectOption[];
        data?: ProjectOption[] | { projects?: ProjectOption[] };
      }>("/projects?page=1&limit=100&sortBy=name&sortOrder=asc", {
        method: "GET",
        cache: "no-store",
      });

      let list: ProjectOption[] = [];

      if (Array.isArray(result.projects)) {
        list = result.projects;
      } else if (Array.isArray(result.data)) {
        list = result.data;
      } else if (
        result.data &&
        !Array.isArray(result.data) &&
        Array.isArray(result.data.projects)
      ) {
        list = result.data.projects;
      }

      setProjects(list);
    } catch (err) {
      setError(`Could not load projects: ${getErrorMessage(err)}`);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadBuildings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (showArchived) {
        const result = await apiRequest<{ buildings: Building[] }>(
          "/buildings/archived",
          { method: "GET", cache: "no-store" },
        );

        let list = Array.isArray(result.buildings) ? result.buildings : [];

        if (projectFilter) {
          list = list.filter((building) => building.projectId === projectFilter);
        }

        if (statusFilter) {
          list = list.filter((building) => building.status === statusFilter);
        }

        if (search.trim()) {
          const term = search.trim().toLowerCase();
          list = list.filter((building) =>
            [
              building.name,
              building.code,
              building.address ?? "",
              building.project?.name ?? "",
              building.project?.code ?? "",
            ].some((value) => value.toLowerCase().includes(term)),
          );
        }

        const total = list.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const safePage = Math.min(page, Math.max(1, totalPages));
        setPage(safePage);
        setBuildings(list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE));
        setPagination({
          page: safePage,
          limit: PAGE_SIZE,
          total,
          totalPages,
        });
      } else {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (search.trim()) params.set("search", search.trim());
        if (statusFilter) params.set("status", statusFilter);
        if (projectFilter) params.set("projectId", projectFilter);

        const result = await apiRequest<PaginatedBuildings>(
          `/buildings?${params.toString()}`,
          { method: "GET", cache: "no-store" },
        );

        setBuildings(result.buildings ?? []);
        setPagination(
          result.pagination ?? {
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          },
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  }, [page, projectFilter, search, showArchived, statusFilter]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadBuildings();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadBuildings]);

  function openCreateModal() {
    setEditingBuilding(null);
    setForm({
      ...EMPTY_FORM,
      projectId: projectFilter || projects[0]?.id || "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(building: Building) {
    setEditingBuilding(building);
    setForm({
      projectId: building.projectId,
      name: building.name,
      code: building.code,
      description: building.description ?? "",
      address: building.address ?? "",
      totalFloors:
        building.totalFloors == null ? "" : String(building.totalFloors),
      status: building.status,
    });
    setError("");
    setModalOpen(true);
  }

  function updateForm<K extends keyof BuildingForm>(
    key: K,
    value: BuildingForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submitBuilding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...(editingBuilding ? {} : { projectId: form.projectId }),
      name: form.name.trim(),
      code: form.code.trim(),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : editingBuilding
          ? { description: null }
          : {}),
      ...(form.address.trim()
        ? { address: form.address.trim() }
        : editingBuilding
          ? { address: null }
          : {}),
      totalFloors: form.totalFloors ? Number(form.totalFloors) : null,
      status: form.status,
    };

    try {
      if (editingBuilding) {
        await apiRequest(
          `/buildings/${encodeURIComponent(editingBuilding.id)}`,
          { method: "PATCH", body: payload },
        );
        setNotice("Building updated successfully.");
      } else {
        await apiRequest("/buildings", { method: "POST", body: payload });
        setNotice("Building created successfully.");
      }

      setModalOpen(false);
      setPage(1);
      await loadBuildings();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!archiveTarget) return;

    setActionId(archiveTarget.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/buildings/${encodeURIComponent(archiveTarget.id)}/archive`,
        {
          method: "POST",
          body: { reason: archiveReason.trim() },
        },
      );

      setArchiveTarget(null);
      setArchiveReason("");
      setNotice("Building archived successfully.");
      await loadBuildings();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function restoreBuilding(building: Building) {
    const confirmed = window.confirm(
      `Restore "${building.name}"? It will return to the active buildings list.`,
    );
    if (!confirmed) return;

    setActionId(building.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/buildings/${encodeURIComponent(building.id)}/restore`,
        { method: "POST" },
      );
      setNotice("Building restored successfully.");
      await loadBuildings();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const activeCountOnPage = buildings.filter((item) => !item.archivedAt).length;
  const completedCountOnPage = buildings.filter(
    (item) => item.status === "COMPLETED",
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="h-4 w-4" />
                EstateFlow / Property Management
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Buildings
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage buildings, floors and construction status across your projects.
              </p>
            </div>

            {!showArchived && (
              <button
                onClick={openCreateModal}
                disabled={projectsLoading || projects.length === 0}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add building
              </button>
            )}
          </header>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="rounded p-1 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>{notice}</span>
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
                className="rounded p-1 hover:bg-emerald-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {showArchived ? "Archived buildings" : "Buildings on this page"}
                </p>
                <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold">
                {loading ? "—" : pagination.total}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {showArchived ? "Matching archived records" : "Matching active records"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Completed on this page
                </p>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold">
                {loading ? "—" : completedCountOnPage}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Buildings with completed status
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Active records on this page
                </p>
                <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700">
                  <RefreshCw className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold">
                {loading ? "—" : activeCountOnPage}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Based on the current result page
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:px-5">
              <div>
                <h2 className="font-semibold">
                  {showArchived ? "Archived buildings" : "All buildings"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search and filter your building records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowArchived(false);
                    setPage(1);
                    setError("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    !showArchived
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => {
                    setShowArchived(true);
                    setPage(1);
                    setError("");
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    showArchived
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Archive className="h-4 w-4" />
                  Archived
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:px-5">
              <label className="relative block">
                <span className="sr-only">Search buildings</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, code, address..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="sr-only">Filter by project</span>
                <select
                  value={projectFilter}
                  onChange={(event) => {
                    setProjectFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => void loadBuildings()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {selectedProject && (
              <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-3 text-sm text-blue-800">
                Project filter: <strong>{selectedProject.name}</strong>
                <button
                  onClick={() => {
                    setProjectFilter("");
                    setPage(1);
                  }}
                  className="ml-3 underline underline-offset-2"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Building</th>
                    <th className="px-5 py-4 font-semibold">Project</th>
                    <th className="px-5 py-4 font-semibold">Floors</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Created</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                        <p className="mt-3 text-sm text-slate-500">
                          Loading buildings...
                        </p>
                      </td>
                    </tr>
                  ) : buildings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <Building2 className="mx-auto h-9 w-9 text-slate-300" />
                        <p className="mt-3 font-medium text-slate-700">
                          No buildings found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing the filters or add a new building.
                        </p>
                        {!showArchived && projects.length > 0 && (
                          <button
                            onClick={openCreateModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add building
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    buildings.map((building) => (
                      <tr key={building.id} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {building.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {building.code}
                              </p>
                              {building.address && (
                                <p className="mt-1 max-w-64 truncate text-xs text-slate-500">
                                  {building.address}
                                </p>
                              )}
                              {building.archiveReason && showArchived && (
                                <p className="mt-1 max-w-64 truncate text-xs text-amber-700">
                                  Reason: {building.archiveReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">
                            {building.project?.name ?? "Project"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {building.project?.code ?? building.projectId}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {building.totalFloors ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(building.status)}`}
                          >
                            {statusLabel(building.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(building.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {showArchived ? (
                              <button
                                onClick={() => void restoreBuilding(building)}
                                disabled={actionId === building.id}
                                title="Restore building"
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              >
                                {actionId === building.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                                Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEditModal(building)}
                                  title="Edit building"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setArchiveTarget(building);
                                    setArchiveReason("");
                                  }}
                                  disabled={actionId === building.id}
                                  title="Archive building"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                                >
                                  {actionId === building.id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {pagination.total === 0
                  ? "No records"
                  : `Showing ${(pagination.page - 1) * PAGE_SIZE + 1}–${Math.min(
                      pagination.page * PAGE_SIZE,
                      pagination.total,
                    )} of ${pagination.total}`}
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="mr-2 text-sm text-slate-500">
                  Page {pagination.totalPages === 0 ? 0 : pagination.page} of{" "}
                  {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={loading || page <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1),
                    )
                  }
                  disabled={
                    loading ||
                    pagination.totalPages === 0 ||
                    page >= pagination.totalPages
                  }
                  aria-label="Next page"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="building-modal-title"
            className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="building-modal-title" className="text-lg font-bold">
                  {editingBuilding ? "Edit building" : "Create building"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the building information below.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitBuilding} className="space-y-5 p-5 sm:p-6">
              {!editingBuilding && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Project <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={form.projectId}
                    onChange={(event) => updateForm("projectId", event.target.value)}
                    disabled={projectsLoading || projects.length === 0}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                  </select>
                  {projects.length === 0 && !projectsLoading && (
                    <span className="mt-1 block text-xs text-amber-700">
                      No available projects. Create a project first or check your permissions.
                    </span>
                  )}
                </label>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Building name <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    minLength={2}
                    maxLength={150}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Tower A"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Building code <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    maxLength={50}
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value)}
                    placeholder="e.g. TOWER-A"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Must be unique within the selected project.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Total floors
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    step={1}
                    value={form.totalFloors}
                    onChange={(event) => updateForm("totalFloors", event.target.value)}
                    placeholder="e.g. 12"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value as BuildingStatus)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Address
                </span>
                <input
                  maxLength={500}
                  value={form.address}
                  onChange={(event) => updateForm("address", event.target.value)}
                  placeholder="Building address"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Optional building details"
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {error && (
                <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (!editingBuilding && !form.projectId)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingBuilding
                      ? "Save changes"
                      : "Create building"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {archiveTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <Archive className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h2 id="archive-modal-title" className="font-bold">
                  Archive building?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  You are archiving <strong>{archiveTarget.name}</strong>. You can restore it later.
                </p>
              </div>
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={actionId === archiveTarget.id}
                aria-label="Close archive dialog"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={confirmArchive} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Reason <span className="text-red-500">*</span>
                </span>
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  rows={3}
                  value={archiveReason}
                  onChange={(event) => setArchiveReason(event.target.value)}
                  placeholder="Explain why this building is being archived."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveTarget(null)}
                  disabled={actionId === archiveTarget.id}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionId === archiveTarget.id || archiveReason.trim().length < 3}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {actionId === archiveTarget.id && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  Archive building
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
