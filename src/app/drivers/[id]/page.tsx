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
  User, Car, ArrowLeft, Edit, Trash2, Power, PowerOff, Phone, IdCard, Calendar, MapPin,
} from "lucide-react";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [driver, setDriver] = useState<Record<string, unknown> | null>(null);
  const [vehicles, setVehicles] = useState<Array<{ id: string; make: string; model: string; plateNumber: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    iqamaNumber: "",
    phone: "",
    nationality: "",
    licenseNumber: "",
    licenseExpiry: "",
    status: "ACTIVE",
    notes: "",
    vehicleId: "",
  });

  const load = () => {
    fetch(`/api/drivers/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setDriver(data);
        const active = (data.assignments || []).find((a: { isActive: boolean }) => a.isActive);
        setForm({
          name: data.name || "",
          nameAr: data.nameAr || "",
          iqamaNumber: data.iqamaNumber || "",
          phone: data.phone || "",
          nationality: data.nationality || "",
          licenseNumber: data.licenseNumber || "",
          licenseExpiry: data.licenseExpiry ? String(data.licenseExpiry).slice(0, 10) : "",
          status: data.status || "ACTIVE",
          notes: data.notes || "",
          vehicleId: active?.vehicle?.id || "",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/vehicles?excludeInactive=true", { cache: "no-store" })
      .then((r) => r.json())
      .then((v) => setVehicles(Array.isArray(v) ? v : []));
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

  if (!driver || !("name" in driver)) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <p className="text-slate-500 mb-4">Driver not found</p>
          <Button href="/drivers" variant="outline">Back to Drivers</Button>
        </div>
      </AppLayout>
    );
  }

  const d = driver as {
    name: string;
    nameAr: string | null;
    iqamaNumber: string | null;
    phone: string | null;
    nationality: string | null;
    licenseNumber: string | null;
    licenseExpiry: string | null;
    status: string;
    notes: string | null;
    assignments: Array<{
      isActive: boolean;
      assignedAt?: string;
      vehicle: {
        id?: string;
        vehicleType: string;
        make: string;
        model: string;
        plateNumber: string;
        status: string;
      };
    }>;
    rides: Array<{
      id: string;
      rideNumber: string;
      date: string;
      pickup: string;
      destination: string;
      status: string;
    }>;
  };

  const activeAssignment = d.assignments?.find((a) => a.isActive);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/drivers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast("Driver updated successfully", "success");
        setEditOpen(false);
        load();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to update driver", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle Disable / Enable
  const handleToggleStatus = async () => {
    const nextStatus = d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setToggling(true);
    try {
      const res = await fetch(`/api/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        toast(
          nextStatus === "INACTIVE"
            ? "Driver disabled (will not appear in rides)"
            : "Driver enabled (available for rides)",
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
      const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Driver permanently deleted", "success");
        router.push("/drivers");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete driver", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={d.name}
        description={d.nameAr ? `${d.nameAr} • ${d.nationality || "Driver"}` : d.nationality || "Driver profile"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/drivers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>

            <Button onClick={() => setEditOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Edit className="h-4 w-4 mr-1.5" /> Edit Driver
            </Button>

            {/* Disable / Enable Toggle Button */}
            {d.status === "ACTIVE" ? (
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                disabled={toggling}
                className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                <PowerOff className="h-4 w-4 mr-1.5" />
                {toggling ? "Updating…" : "Disable Driver"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                disabled={toggling}
                className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              >
                <Power className="h-4 w-4 mr-1.5" />
                {toggling ? "Updating…" : "Enable Driver"}
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
        {d.status === "ACTIVE" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
            <StatusDot status="success" /> Active Driver (Visible in Rides)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
            <StatusDot status="warning" /> Disabled / Inactive (Hidden from Rides)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Driver Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
                {d.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base truncate">{d.name}</h3>
                {d.nameAr && <p className="text-xs text-slate-500">{d.nameAr}</p>}
                <p className="text-xs text-indigo-700 font-medium mt-0.5">{d.nationality || "Fleet Driver"}</p>
              </div>
            </div>

            <CardContent className="p-6 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Iqama / National ID</p>
                <p className="font-mono text-sm font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {d.iqamaNumber || "—"}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {d.phone || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">License Number</p>
                  <p className="text-sm font-medium text-slate-800">{d.licenseNumber || "—"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">License Expiry</p>
                  <p className="text-sm font-medium text-slate-800">
                    {d.licenseExpiry ? formatDate(d.licenseExpiry) : "—"}
                  </p>
                </div>
              </div>

              {d.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{d.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Vehicle Card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Car className="h-4 w-4 text-indigo-600" /> Currently Assigned Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {activeAssignment ? (
                <div className="space-y-2">
                  <p className="font-bold text-slate-900 text-sm">
                    {activeAssignment.vehicle.make} {activeAssignment.vehicle.model}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded font-bold border border-slate-200 text-slate-800">
                      {activeAssignment.vehicle.plateNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      {activeAssignment.vehicle.vehicleType}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No vehicle currently assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ride History Card */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" /> Recent Trip History ({d.rides?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!d.rides || d.rides.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No trips completed by this driver yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ride #</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Route</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {d.rides.map((r) => (
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
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {r.pickup} → {r.destination}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge>{r.status.replace("_", " ")}</Badge>
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

      {/* Edit Driver Modal */}
      <Modal open={editOpen} onClose={() => !saving && setEditOpen(false)} title="Edit Driver Details" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Arabic Name"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Iqama / National ID"
              value={form.iqamaNumber}
              onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "ACTIVE", label: "Active (Available for rides)" },
                { value: "INACTIVE", label: "Disabled / Inactive" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="License Number"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            />
            <Input
              label="License Expiry"
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
            />
          </div>
          <Select
            label="Assigned Vehicle"
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            options={[
              { value: "", label: "No vehicle assigned" },
              ...vehicles.map((v) => ({
                value: v.id,
                label: `${v.make} ${v.model} (${v.plateNumber})`,
              })),
            ]}
          />
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
        title={`Permanently Delete Driver "${d.name}"?`}
        message={`Are you sure you want to permanently delete this driver from the database? This cannot be undone.\n\nTip: If you only want to temporarily prevent this driver from appearing in rides, click Cancel and choose "Disable Driver" instead.`}
      />
    </AppLayout>
  );
}
