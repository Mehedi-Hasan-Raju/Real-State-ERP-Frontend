
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type FloorStatus = "ACTIVE" | "INACTIVE";

type BuildingOption = {
  id: string;
  name: string;
  code: string;
  projectId?: string;
};

type Floor = {
  id: string;
  floorNumber: number;
  name?: string | null;
  description?: string | null;
  status: FloorStatus;
  buildingId: string;
  building?: BuildingOption;
  units?: unknown[];
  _count?: { units: number };
  createdAt?: string;
  archivedAt?: string | null;
};

type FloorForm = {
  buildingId: string;
  floorNumber: string;
  name: string;
  description: string;
  status: FloorStatus;
  initialUnitNumber: string;
  initialUnitName: string;
};

const PAGE_SIZE = 10;
const EMPTY_FORM: FloorForm = {
  buildingId: "",
  floorNumber: "",
  name: "",
  description: "",
  status: "ACTIVE",
  initialUnitNumber: "",
  initialUnitName: "",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function FloorsPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [form, setForm] = useState<FloorForm>(EMPTY_FORM);

  const loadBuildings = useCallback(async () => {
    setBuildingsLoading(true);
    try {
      const result = await apiRequest<{
        buildings?: BuildingOption[];
      }>("/buildings?page=1&limit=100&sortBy=name&sortOrder=asc", {
        method: "GET",
        cache: "no-store",
      });
      setBuildings(Array.isArray(result.buildings) ? result.buildings : []);
    } catch (err) {
      setError(`Could not load buildings: ${errorMessage(err)}`);
    } finally {
      setBuildingsLoading(false);
    }
  }, []);

  const loadFloors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (search.trim()) params.set("search", search.trim());
      if (buildingFilter) params.set("buildingId", buildingFilter);
      if (statusFilter) params.set("status", statusFilter);

      const result = await apiRequest<{
        items?: Floor[];
        floors?: Floor[];
        pagination?: {
          page: number;
          total: number;
          totalPages: number;
        };
      }>(`/floors?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const list = Array.isArray(result.items)
        ? result.items
        : Array.isArray(result.floors)
          ? result.floors
          : [];
      setFloors(list);
      setTotal(result.pagination?.total ?? list.length);
      setTotalPages(result.pagination?.totalPages ?? (list.length ? 1 : 0));
    } catch (err) {
      setError(errorMessage(err));
      setFloors([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, buildingFilter, statusFilter]);

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadFloors(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadFloors]);

  function openCreate() {
    setEditingFloor(null);
    setForm({
      ...EMPTY_FORM,
      buildingId: buildingFilter || buildings[0]?.id || "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(floor: Floor) {
    setEditingFloor(floor);
    setForm({
      buildingId: floor.buildingId,
      floorNumber: String(floor.floorNumber),
      name: floor.name ?? "",
      description: floor.description ?? "",
      status: floor.status,
      initialUnitNumber: "",
      initialUnitName: "",
    });
    setError("");
    setModalOpen(true);
  }

  function changeForm<K extends keyof FloorForm>(
    key: K,
    value: FloorForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submitFloor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const hasInitialUnit =
      form.initialUnitNumber.trim() !== "" ||
      form.initialUnitName.trim() !== "";

    if (hasInitialUnit && !form.initialUnitNumber.trim()) {
      setError("Enter a unit number to create the initial unit.");
      return;
    }

    setSaving(true);

    const payload = {
      ...(editingFloor ? {} : { buildingId: form.buildingId }),
      floorNumber: Number(form.floorNumber),
      ...(form.name.trim() ? { name: form.name.trim() } : {}),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
      ...(!editingFloor && hasInitialUnit
        ? {
            initialUnit: {
              unitNumber: form.initialUnitNumber.trim(),
              ...(form.initialUnitName.trim()
                ? { name: form.initialUnitName.trim() }
                : {}),
            },
          }
        : {}),
      status: form.status,
    };

    try {
      if (editingFloor) {
        await apiRequest(`/floors/${encodeURIComponent(editingFloor.id)}`, {
          method: "PATCH",
          body: payload,
        });
        setNotice("Floor updated successfully.");
      } else {
        await apiRequest("/floors", {
          method: "POST",
          body: payload,
        });
        setNotice("Floor created successfully.");
      }

      setModalOpen(false);
      setPage(1);
      await loadFloors();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const activeCount = floors.filter((floor) => floor.status === "ACTIVE").length;
  const unitCount = floors.reduce(
    (count, floor) => count + (floor.units?.length ?? 0),
    0,
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Layers3 className="h-4 w-4" />
                EstateFlow / Property Management
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Floors
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage floor numbers and details for each building.
              </p>
            </div>

            <button
              onClick={openCreate}
              disabled={buildingsLoading || buildings.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add floor
            </button>
          </header>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="flex-1">{error}</p>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss message">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Matching floors</p>
              <p className="mt-3 text-3xl font-bold">
                {loading ? "—" : total}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Based on current filters
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Active on this page</p>
              <p className="mt-3 text-3xl font-bold">
                {loading ? "—" : activeCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Floors currently marked active
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Units returned</p>
              <p className="mt-3 text-3xl font-bold">
                {loading ? "—" : unitCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Only included if the API returns unit data
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <h2 className="font-semibold">Floor directory</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search floors and narrow results by building or status.
              </p>
            </div>

            <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:px-5">
              <label className="relative block">
                <span className="sr-only">Search floors</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search floor name or number"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="sr-only">Filter by building</span>
                <select
                  value={buildingFilter}
                  onChange={(event) => {
                    setBuildingFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name} ({building.code})
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
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              <button
                onClick={() => void loadFloors()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Floor</th>
                    <th className="px-5 py-4 font-semibold">Building</th>
                    <th className="px-5 py-4 font-semibold">Description</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Units</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                        <p className="mt-3 text-sm text-slate-500">
                          Loading floors...
                        </p>
                      </td>
                    </tr>
                  ) : floors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <Layers3 className="mx-auto h-9 w-9 text-slate-300" />
                        <p className="mt-3 font-medium text-slate-700">
                          No floors found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Change your filters or add a floor to a building.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    floors.map((floor) => (
                      <tr key={floor.id} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                              {floor.floorNumber}
                            </span>
                            <div>
                              <p className="font-semibold">
                                {floor.name || `Floor ${floor.floorNumber}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Floor #{floor.floorNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">
                            {floor.building?.name ??
                              buildings.find((b) => b.id === floor.buildingId)?.name ??
                              "Building"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {floor.building?.code ??
                              buildings.find((b) => b.id === floor.buildingId)?.code ??
                              floor.buildingId}
                          </p>
                        </td>
                        <td className="max-w-xs px-5 py-4 text-slate-500">
                          <span className="block truncate">
                            {floor.description || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              floor.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {floor.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {floor._count?.units ?? floor.units?.length ?? 0}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openEdit(floor)}
                            title="Edit floor"
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {total === 0
                  ? "No records"
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                      page * PAGE_SIZE,
                      total,
                    )} of ${total}`}
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="mr-2 text-sm text-slate-500">
                  Page {totalPages === 0 ? 0 : page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={loading || page <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={loading || totalPages === 0 || page >= totalPages}
                  aria-label="Next page"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="floor-modal-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="floor-modal-title" className="text-lg font-bold">
                  {editingFloor ? "Edit floor" : "Create floor"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Provide the floor information.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitFloor} className="space-y-5 p-5 sm:p-6">
              {!editingFloor && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Building <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={form.buildingId}
                    onChange={(event) =>
                      changeForm("buildingId", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select a building</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} ({building.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Floor number <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    max={300}
                    step={1}
                    value={form.floorNumber}
                    onChange={(event) =>
                      changeForm("floorNumber", event.target.value)
                    }
                    placeholder="e.g. 1"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Floor name
                  </span>
                  <input
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => changeForm("name", event.target.value)}
                    placeholder="e.g. First Floor"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              {!editingFloor && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      First unit (optional)
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Add an initial unit to this floor. A unit number is required
                      when adding a unit name.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Unit number
                      </span>
                      <input
                        maxLength={50}
                        value={form.initialUnitNumber}
                        onChange={(event) =>
                          changeForm("initialUnitNumber", event.target.value)
                        }
                        placeholder="e.g. A-101"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Unit name
                      </span>
                      <input
                        maxLength={100}
                        value={form.initialUnitName}
                        onChange={(event) =>
                          changeForm("initialUnitName", event.target.value)
                        }
                        placeholder="e.g. Corner Suite"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) =>
                    changeForm("description", event.target.value)
                  }
                  placeholder="Optional floor details"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    changeForm("status", event.target.value as FloorStatus)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.floorNumber ||
                    (!editingFloor && !form.buildingId)
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingFloor
                      ? "Save changes"
                      : "Create floor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
