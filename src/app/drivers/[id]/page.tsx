"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [driver, setDriver] = useState<Record<string, unknown> | null>(null);
  const [vehicles, setVehicles] = useState<Array<{ id: string; make: string; model: string; plateNumber: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", nameAr: "", iqamaNumber: "", phone: "", nationality: "",
    licenseNumber: "", licenseExpiry: "", status: "ACTIVE", notes: "", vehicleId: "",
  });

  const load = () => {
    fetch(`/api/drivers/${id}`).then((r) => r.json()).then((data) => {
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
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/vehicles").then((r) => r.json()).then((v) => setVehicles(Array.isArray(v) ? v : []));
  }, [id]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></AppLayout>;
  if (!driver || !("name" in driver)) return <AppLayout><p>Driver not found</p></AppLayout>;

  const d = driver as {
    name: string; nameAr: string | null; iqamaNumber: string | null; phone: string | null;
    nationality: string | null; licenseNumber: string | null; licenseExpiry: string | null;
    status: string; notes: string | null;
    assignments: Array<{ isActive: boolean; assignedAt?: string; vehicle: { id?: string; vehicleType: string; make: string; model: string; plateNumber: string; vehicleId: string | null; registrationNumber: string | null; status: string } }>;
    rides: Array<{ id: string; rideNumber: string; date: string; pickup: string; destination: string; status: string }>;
  };

  const activeAssignment = d.assignments.find((a) => a.isActive);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/drivers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast("Driver updated", "success");
      setEditOpen(false);
      load();
    } else {
      const err = await res.json();
      toast(err.error || "Failed", "error");
    }
  };

  const deactivate = async () => {
    if (!window.confirm("Deactivate this driver?")) return;
    const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Driver deactivated", "success");
      load();
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={d.name}
        description={d.nationality || "Driver profile"}
        action={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
            {d.status === "ACTIVE" && <Button variant="outline" onClick={deactivate}>Deactivate</Button>}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Driver Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-500">Arabic Name</dt><dd className="font-medium">{d.nameAr || "—"}</dd></div>
              <div><dt className="text-slate-500">Iqama</dt><dd className="font-medium">{d.iqamaNumber || "—"}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{d.phone || "—"}</dd></div>
              <div><dt className="text-slate-500">Nationality</dt><dd className="font-medium">{d.nationality || "—"}</dd></div>
              <div><dt className="text-slate-500">License</dt><dd className="font-medium">{d.licenseNumber || "—"}</dd></div>
              <div><dt className="text-slate-500">License Expiry</dt><dd className="font-medium">{d.licenseExpiry ? formatDate(d.licenseExpiry) : "—"}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><Badge variant={d.status === "ACTIVE" ? "success" : "default"}>{d.status}</Badge></dd></div>
              {d.notes && <div className="col-span-2"><dt className="text-slate-500">Notes</dt><dd className="font-medium">{d.notes}</dd></div>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assigned Vehicle</CardTitle></CardHeader>
          <CardContent>
            {activeAssignment ? (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Vehicle</dt><dd className="font-medium">{activeAssignment.vehicle.make} {activeAssignment.vehicle.model}</dd></div>
                <div><dt className="text-slate-500">Plate</dt><dd className="font-medium">{activeAssignment.vehicle.plateNumber}</dd></div>
                <div><dt className="text-slate-500">Type</dt><dd className="font-medium">{activeAssignment.vehicle.vehicleType}</dd></div>
                <div><dt className="text-slate-500">Vehicle ID</dt><dd className="font-medium">{activeAssignment.vehicle.vehicleId || "—"}</dd></div>
                <div><dt className="text-slate-500">Registration</dt><dd className="font-medium">{activeAssignment.vehicle.registrationNumber || "—"}</dd></div>
                <div><dt className="text-slate-500">Status</dt><dd><Badge>{activeAssignment.vehicle.status}</Badge></dd></div>
              </dl>
            ) : <p className="text-sm text-slate-500">No vehicle assigned</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Ride History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {d.rides.length === 0 ? <p className="p-4 text-sm text-slate-500">No rides yet</p> :
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left">Ride #</th><th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Status</th>
                </tr></thead>
                <tbody>
                  {d.rides.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-4 py-2"><Link href={`/rides/${r.id}`} className="text-indigo-600 hover:underline">{r.rideNumber}</Link></td>
                      <td className="px-4 py-2">{formatDate(r.date)}</td>
                      <td className="px-4 py-2">{r.pickup} → {r.destination}</td>
                      <td className="px-4 py-2"><Badge>{r.status.replace("_", " ")}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>}
          </CardContent>
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Driver">
        <form onSubmit={save} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Arabic Name" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Iqama" value={form.iqamaNumber} onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Nationality" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="License Number" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
            <Input label="License Expiry" type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
          <Select label="Assigned Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            options={[{ value: "", label: "None" }, ...vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model} — ${v.plateNumber}` }))]} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
