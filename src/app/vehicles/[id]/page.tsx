"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner, Modal, ConfirmDialog, StatusDot,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import {
  Car, User, ArrowLeft, Edit, Trash2, Power, PowerOff, Calendar, MapPin,
} from "lucide-react";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    vehicleType: "Van",
    make: "",
    model: "",
    plateNumber: "",
    registrationNumber: "",
    vehicleId: "",
    year: "",
    color: "",
    capacity: "",
    status: "AVAILABLE",
    notes: "",
    driverId: "",
  });

  const load = () => {
    fetch(`/api/vehicles/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setVehicle(data);
        const active = (data.assignments || []).find((a: { isActive: boolean }) => a.isActive);
        setForm({
          vehicleType: data.vehicleType || "Van",
          make: data.make || "",
          model: data.model || "",
          plateNumber: data.plateNumber || "",
          registrationNumber: data.registrationNumber || "",
          vehicleId: data.vehicleId || "",
          year: data.year ? String(data.year) : "",
          color: data.color || "",
          capacity: data.capacity ? String(data.capacity) : "",
          status: data.status || "AVAILABLE",
          notes: data.notes || "",
          driverId: active?.driver?.id || "",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/drivers?status=ACTIVE", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDrivers(Array.isArray(d) ? d : []));
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!vehicle || !("make" in vehicle)) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <p className="text-slate-500 mb-4">Vehicle not found</p>
          <Button href="/vehicles" variant="outline">Back to Vehicles</Button>
        </div>
      </AppLayout>
    );
  }

  const v = vehicle as {
    vehicleType: string;
    make: string;
    model: string;
    plateNumber: string;
    registrationNumber: string | null;
    vehicleId: string | null;
    year: number | null;
    color: string | null;
    capacity: number | null;
    status: string;
    notes: string | null;
    assignments: Array<{
      isActive: boolean;
      assignedAt: string;
      driver: { id: string; name: string };
    }>;
    rides: Array<{
      id: string;
      rideNumber: string;
      date: string;
      pickup: string;
      destination: string;
      status: string;
      driver: { name: string } | null;
    }>;
  };

  const activeDriver = v.assignments?.find((a) => a.isActive)?.driver;
  const isInactive = v.status === "INACTIVE";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year: form.year ? Number(form.year) : undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
        }),
      });
      if (res.ok) {
        toast("Vehicle updated successfully", "success");
        setEditOpen(false);
        load();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to update vehicle", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle Disable / Enable
  const handleToggleStatus = async () => {
    const nextStatus = isInactive ? "AVAILABLE" : "INACTIVE";
    setToggling(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        toast(
          nextStatus === "INACTIVE"
            ? "Vehicle disabled (will not appear in rides)"
            : "Vehicle enabled (available for rides)",
          "success"
        );
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update status", "error");
      }
    } finally {
      setToggling(false);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Vehicle permanently deleted", "success");
        router.push("/vehicles");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete vehicle", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={`${v.make} ${v.model}`}
        description={`Plate: ${v.plateNumber} • ${v.vehicleType}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>

            <Button onClick={() => setEditOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Edit className="h-4 w-4 mr-1.5" /> Edit Vehicle
            </Button>

            {/* Disable / Enable Toggle Button */}
            {!isInactive ? (
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                disabled={toggling}
                className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                <PowerOff className="h-4 w-4 mr-1.5" />
                {toggling ? "Updating…" : "Disable Vehicle"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                disabled={toggling}
                className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              >
                <Power className="h-4 w-4 mr-1.5" />
                {toggling ? "Updating…" : "Enable Vehicle"}
              </Button>
            )}

            {/* Permanent Delete Button */}
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        {!isInactive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
            <StatusDot status="success" /> Active Vehicle ({v.status}) • Visible in Rides
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
            <StatusDot status="warning" /> Disabled / Inactive • Hidden from Rides
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Vehicle Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
                <Car className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base truncate">{v.make} {v.model}</h3>
                <p className="text-xs font-mono font-semibold text-indigo-700 mt-0.5">{v.plateNumber}</p>
                <p className="text-xs text-slate-500">{v.vehicleType} {v.year ? `• ${v.year}` : ""}</p>
              </div>
            </div>

            <CardContent className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Plate Number</p>
                  <p className="font-mono text-sm font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {v.plateNumber}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle Type</p>
                  <p className="text-sm font-medium text-slate-800 p-2">{v.vehicleType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Color</p>
                  <p className="text-sm font-medium text-slate-800">{v.color || "—"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Capacity</p>
                  <p className="text-sm font-medium text-slate-800">{v.capacity ? `${v.capacity} Passengers` : "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Registration #</p>
                  <p className="text-sm font-mono text-slate-800">{v.registrationNumber || "—"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle ID</p>
                  <p className="text-sm font-mono text-slate-800">{v.vehicleId || "—"}</p>
                </div>
              </div>

              {v.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{v.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Driver Card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" /> Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {activeDriver ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {activeDriver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{activeDriver.name}</p>
                    <Link href={`/drivers/${activeDriver.id}`} className="text-xs text-indigo-600 hover:underline">
                      View Driver Profile →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No driver assigned to this vehicle</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ride History Card */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" /> Trip History ({v.rides?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!v.rides || v.rides.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No trips completed by this vehicle yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ride #</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Driver</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Route</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {v.rides.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-bold font-mono text-indigo-600 text-xs">
                            <Link href={`/rides/${r.id}`} className="hover:underline">
                              {r.rideNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            {formatDate(r.date)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-800 font-medium">
                            {r.driver?.name || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-800">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {r.pickup} → {r.destination}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Vehicle Modal */}
      <Modal open={editOpen} onClose={() => !saving && setEditOpen(false)} title="Edit Vehicle Details" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Make *"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              required
            />
            <Input
              label="Model *"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plate Number *"
              value={form.plateNumber}
              onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
              required
            />
            <Select
              label="Vehicle Type"
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              options={[
                { value: "Van", label: "Van" },
                { value: "Bus", label: "Bus" },
                { value: "Sedan", label: "Sedan" },
                { value: "SUV", label: "SUV" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
            <Input
              label="Passenger Capacity"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assign Driver"
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              options={[
                { value: "", label: "No driver assigned" },
                ...drivers.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "AVAILABLE", label: "Available" },
                { value: "ASSIGNED", label: "Assigned" },
                { value: "MAINTENANCE", label: "Maintenance" },
                { value: "INACTIVE", label: "Disabled / Inactive" },
              ]}
            />
          </div>

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onConfirm={handlePermanentDelete}
        loading={deleting}
        title={`Permanently Delete Vehicle "${v.make} ${v.model} (${v.plateNumber})"?`}
        message={`Are you sure you want to permanently delete this vehicle from the database? This cannot be undone.\n\nTip: If you only want to temporarily prevent this vehicle from appearing in rides, click Cancel and choose "Disable Vehicle" instead.`}
      />
    </AppLayout>
  );
}
