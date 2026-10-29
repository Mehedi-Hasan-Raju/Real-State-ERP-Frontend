
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import AppSidebar from "@/components/layout/app-sidebar";
import { apiRequest } from "@/lib/api";

type UnitStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "SOLD";

type BuildingOption = {
  id: string;
  name: string;
  code: string;
};

type FloorOption = {
  id: string;
  floorNumber: number;
  name?: string | null;
  buildingId: string;
  building?: BuildingOption;
};

type Unit = {
  id: string;
  unitNumber: string;
  name?: string | null;
  description?: string | null;
  area?: number | string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | string | null;
  status: UnitStatus;
  floorId: string;
  floor?: FloorOption;
  createdAt?: string;
};

type UnitForm = {
  floorId: string;
  unitNumber: string;
  name: string;
  description: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  status: UnitStatus;
};

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: UnitStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "BOOKED", label: "Booked" },
  { value: "SOLD", label: "Sold" },
];

const EMPTY_FORM: UnitForm = {
  floorId: "",
  unitNumber: "",
  name: "",
  description: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  price: "",
  status: "AVAILABLE",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatPrice(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusStyle(status: UnitStatus) {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-50 text-emerald-700";
    case "RESERVED":
      return "bg-amber-50 text-amber-700";
    case "BOOKED":
      return "bg-blue-50 text-blue-700";
    case "SOLD":
      return "bg-slate-100 text-slate-600";
  }
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setError("");

    try {
      const [buildingResult, floorResult] = await Promise.all([
        apiRequest<{ buildings?: BuildingOption[] }>(
          "/buildings?page=1&limit=100&sortBy=name&sortOrder=asc",
          { method: "GET", cache: "no-store" },
        ),
        apiRequest<{ items?: FloorOption[]; floors?: FloorOption[] }>(
          "/floors?page=1&limit=100",
          { method: "GET", cache: "no-store" },
        ),
      ]);

      setBuildings(
        Array.isArray(buildingResult.buildings)
          ? buildingResult.buildings
          : [],
      );
      setFloors(
        Array.isArray(floorResult.items)
          ? floorResult.items
          : Array.isArray(floorResult.floors)
            ? floorResult.floors
            : [],
      );
    } catch (err) {
      setError(`Could not load buildings and floors: ${getErrorMessage(err)}`);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (search.trim()) params.set("search", search.trim());
      if (buildingFilter) params.set("buildingId", buildingFilter);
      if (floorFilter) params.set("floorId", floorFilter);
      if (statusFilter) params.set("status", statusFilter);

      const result = await apiRequest<{
        items?: Unit[];
        units?: Unit[];
        pagination?: {
          page: number;
          total: number;
          totalPages: number;
        };
      }>(`/units?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const list = Array.isArray(result.items)
        ? result.items
        : Array.isArray(result.units)
          ? result.units
          : [];

      setUnits(list);
      setTotal(result.pagination?.total ?? list.length);
      setTotalPages(
        result.pagination?.totalPages ?? (list.length > 0 ? 1 : 0),
      );
    } catch (err) {
      setError(getErrorMessage(err));
      setUnits([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, floorFilter, statusFilter, buildingFilter]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadUnits(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadUnits]);

  const visibleFloors = buildingFilter
    ? floors.filter((floor) => floor.buildingId === buildingFilter)
    : floors;

  function updateForm<K extends keyof UnitForm>(
    key: K,
    value: UnitForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function openCreate() {
    setEditingUnit(null);
    setForm({
      ...EMPTY_FORM,
      floorId: floorFilter || visibleFloors[0]?.id || "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditingUnit(unit);
    setForm({
      floorId: unit.floorId,
      unitNumber: unit.unitNumber,
      name: unit.name ?? "",
      description: unit.description ?? "",
      area: unit.area == null ? "" : String(unit.area),
      bedrooms: unit.bedrooms == null ? "" : String(unit.bedrooms),
      bathrooms: unit.bathrooms == null ? "" : String(unit.bathrooms),
      price: unit.price == null ? "" : String(unit.price),
      status: unit.status,
    });
    setError("");
    setModalOpen(true);
  }

  async function submitUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...(editingUnit ? {} : { floorId: form.floorId }),
      unitNumber: form.unitNumber.trim(),
      ...(form.name.trim() ? { name: form.name.trim() } : {}),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
      ...(form.area !== "" ? { area: Number(form.area) } : {}),
      ...(form.bedrooms !== "" ? { bedrooms: Number(form.bedrooms) } : {}),
      ...(form.bathrooms !== "" ? { bathrooms: Number(form.bathrooms) } : {}),
      ...(form.price !== "" ? { price: Number(form.price) } : {}),
      status: form.status,
    };

    try {
      if (editingUnit) {
        await apiRequest(`/units/${encodeURIComponent(editingUnit.id)}`, {
          method: "PATCH",
          body: payload,
        });
        setNotice("Unit updated successfully.");
      } else {
        await apiRequest("/units", { method: "POST", body: payload });
        setNotice("Unit created successfully.");
      }

      setModalOpen(false);
      setPage(1);
      await loadUnits();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const availableCount = units.filter(
    (unit) => unit.status === "AVAILABLE",
  ).length;

  const selectedBuilding = buildings.find(
    (building) => building.id === buildingFilter,
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Home className="h-4 w-4" />
                EstateFlow / Property Management
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Units
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage apartment details, pricing and availability.
              </p>
            </div>

            <button
              onClick={openCreate}
              disabled={optionsLoading || floors.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add unit
            </button>
          </header>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <span className="flex-1">{error}</span>
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
              <p className="text-sm font-medium text-slate-500">Matching units</p>
              <p className="mt-3 text-3xl font-bold">
                {loading ? "—" : total}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Units matching your filters
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Available on this page
              </p>
              <p className="mt-3 text-3xl font-bold">
                {loading ? "—" : availableCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Units currently available
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Buildings</p>
              <p className="mt-3 text-3xl font-bold">
                {optionsLoading ? "—" : buildings.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Buildings available to your account
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <h2 className="font-semibold">Unit directory</h2>
              <p className="mt-1 text-sm text-slate-500">
                Find units by number, floor, building or status.
              </p>
            </div>

            <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:px-5">
              <label className="relative block">
                <span className="sr-only">Search units</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search unit number..."
                  className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="sr-only">Filter by building</span>
                <select
                  value={buildingFilter}
                  onChange={(event) => {
                    setBuildingFilter(event.target.value);
                    setFloorFilter("");
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
                <span className="sr-only">Filter by floor</span>
                <select
                  value={floorFilter}
                  onChange={(event) => {
                    setFloorFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All floors</option>
                  {visibleFloors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name || `Floor ${floor.floorNumber}`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                <label className="min-w-0 flex-1">
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
                  onClick={() => void loadUnits()}
                  disabled={loading}
                  title="Refresh units"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {selectedBuilding && (
              <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-3 text-sm text-blue-800">
                Building: <strong>{selectedBuilding.name}</strong>
                <button
                  onClick={() => {
                    setBuildingFilter("");
                    setFloorFilter("");
                    setPage(1);
                  }}
                  className="ml-3 underline underline-offset-2"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Unit</th>
                    <th className="px-5 py-4 font-semibold">Building / Floor</th>
                    <th className="px-5 py-4 font-semibold">Area</th>
                    <th className="px-5 py-4 font-semibold">Bedrooms / Baths</th>
                    <th className="px-5 py-4 font-semibold">Price</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                        <p className="mt-3 text-sm text-slate-500">
                          Loading units...
                        </p>
                      </td>
                    </tr>
                  ) : units.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <Home className="mx-auto h-9 w-9 text-slate-300" />
                        <p className="mt-3 font-medium text-slate-700">
                          No units found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Change the filters or add a unit to a floor.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => {
                      const floor =
                        unit.floor ?? floors.find((item) => item.id === unit.floorId);
                      const building =
                        floor?.building ??
                        buildings.find((item) => item.id === floor?.buildingId);

                      return (
                        <tr key={unit.id} className="transition hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <Home className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="font-semibold">
                                  {unit.name || `Unit ${unit.unitNumber}`}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Unit #{unit.unitNumber}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-700">
                              {building?.name ?? "Building"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {floor?.name || (floor ? `Floor ${floor.floorNumber}` : "Floor")}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {unit.area == null ? "—" : `${unit.area} sq ft`}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {(unit.bedrooms ?? "—") + " / " + (unit.bathrooms ?? "—")}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-700">
                            {formatPrice(unit.price)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(unit.status)}`}
                            >
                              {STATUS_OPTIONS.find((item) => item.value === unit.status)?.label ?? unit.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => openEdit(unit)}
                              title="Edit unit"
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
            aria-labelledby="unit-modal-title"
            className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="unit-modal-title" className="text-lg font-bold">
                  {editingUnit ? "Edit unit" : "Create unit"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter apartment details and pricing.
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

            <form onSubmit={submitUnit} className="space-y-5 p-5 sm:p-6">
              {!editingUnit && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Floor <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={form.floorId}
                    onChange={(event) => updateForm("floorId", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select a floor</option>
                    {floors.map((floor) => {
                      const building =
                        floor.building ??
                        buildings.find((item) => item.id === floor.buildingId);

                      return (
                        <option key={floor.id} value={floor.id}>
                          {building?.name ?? "Building"} —{" "}
                          {floor.name || `Floor ${floor.floorNumber}`}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Unit number <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    maxLength={50}
                    value={form.unitNumber}
                    onChange={(event) => updateForm("unitNumber", event.target.value)}
                    placeholder="e.g. A-101"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Display name
                  </span>
                  <input
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Corner Apartment"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Area (sq ft)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.area}
                    onChange={(event) => updateForm("area", event.target.value)}
                    placeholder="e.g. 1250"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Price (BDT)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.price}
                    onChange={(event) => updateForm("price", event.target.value)}
                    placeholder="e.g. 8500000"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Bedrooms
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={form.bedrooms}
                    onChange={(event) => updateForm("bedrooms", event.target.value)}
                    placeholder="e.g. 3"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Bathrooms
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={form.bathrooms}
                    onChange={(event) => updateForm("bathrooms", event.target.value)}
                    placeholder="e.g. 2"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  rows={3}
                  maxLength={1500}
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Optional unit details"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Availability status
                </span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value as UnitStatus)
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
                  disabled={saving || (!editingUnit && !form.floorId)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingUnit
                      ? "Save changes"
                      : "Create unit"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
