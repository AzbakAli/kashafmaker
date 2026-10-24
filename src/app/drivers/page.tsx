"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, User, Phone, IdCard, Car, CheckCircle, XCircle, Trash2, ArrowRight } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface Driver {
  id: string;
  name: string;
  nameAr: string | null;
  iqamaNumber: string | null;
  phone: string | null;
  nationality: string | null;
  status: string;
  assignments: Array<{ vehicle: { id: string; make: string; model: string; plateNumber: string } }>;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
}

export default function DriversPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", nameAr: "", iqamaNumber: "", phone: "", nationality: "",
    licenseNumber: "", licenseExpiry: "", status: "ACTIVE", notes: "", vehicleId: "",
  });

  const fetchData = () => {
    Promise.all([
      fetch(`/api/drivers?q=${debouncedSearch}`).then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
    ]).then(([d, v]) => {
      setDrivers(Array.isArray(d) ? d : []);
      setVehicles(Array.isArray(v) ? v : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast("Driver created successfully", "success");
      setModalOpen(false);
      setForm({ name: "", nameAr: "", iqamaNumber: "", phone: "", nationality: "", licenseNumber: "", licenseExpiry: "", status: "ACTIVE", notes: "", vehicleId: "" });
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to create driver", "error");
    }
  };

  const deleteDriver = async (driverId: string) => {
    if (!window.confirm("Delete this driver? This action cannot be undone.")) return;
    const res = await fetch(`/api/drivers/${driverId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Driver deleted successfully", "success");
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to delete driver", "error");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Drivers"
        description="Manage driver profiles and vehicle assignments"
        action={
          <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Add Driver
          </Button>
        }
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          placeholder="Search drivers by name, iqama, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : drivers.length === 0 ? (
            <EmptyState
              title="No drivers found"
              description={search ? "Try a different search term" : "Get started by adding your first driver"}
              action={
                <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Driver
                </Button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Driver
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4" /> Iqama
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Contact
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Nationality</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" /> Vehicle
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-900">{d.name}</div>
                        {d.nameAr && <div className="text-xs text-slate-500">{d.nameAr}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                        {d.iqamaNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.nationality || "—"}</td>
                    <td className="px-4 py-3">
                      {d.assignments[0]?.vehicle ? (
                        <div className="text-xs">
                          <div className="font-medium text-slate-900">{d.assignments[0].vehicle.make} {d.assignments[0].vehicle.model}</div>
                          <div className="text-slate-500">{d.assignments[0].vehicle.plateNumber}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={d.status === "ACTIVE" ? "success" : "default"} className="font-medium">
                        {d.status === "ACTIVE" ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/drivers/${d.id}`}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                        >
                          View Details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 font-medium text-xs transition-colors"
                          onClick={() => deleteDriver(d.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Driver">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Enter driver's full name"
          />
          <Input
            label="Arabic Name"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            placeholder="الاسم بالعربية"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Iqama Number"
              value={form.iqamaNumber}
              onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
              placeholder="10-digit number"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
            />
          </div>
          <Input
            label="Nationality"
            value={form.nationality}
            onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            placeholder="Country of citizenship"
          />
          <Select
            label="Assign Vehicle"
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            options={[
              { value: "", label: "None (Assign later)" },
              ...vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model} — ${v.plateNumber}` }))
            ]}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              Save Driver
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
