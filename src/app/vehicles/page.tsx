"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Car, User, CheckCircle, XCircle, Calendar, Trash2, ArrowRight } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export default function VehiclesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Array<Record<string, unknown>>>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    vehicleType: "Van", make: "", model: "", plateNumber: "", registrationNumber: "",
    vehicleId: "", year: "", color: "", capacity: "", status: "AVAILABLE", notes: "", driverId: "",
  });

  const fetchData = () => {
    Promise.all([
      fetch(`/api/vehicles?q=${debouncedSearch}`).then((r) => r.json()),
      fetch("/api/drivers?status=ACTIVE").then((r) => r.json()),
    ]).then(([v, d]) => {
      setVehicles(Array.isArray(v) ? v : []);
      setDrivers(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        year: form.year ? Number(form.year) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined
      }),
    });
    if (res.ok) {
      toast("Vehicle created successfully", "success");
      setModalOpen(false);
      setForm({
        vehicleType: "Van", make: "", model: "", plateNumber: "", registrationNumber: "",
        vehicleId: "", year: "", color: "", capacity: "", status: "AVAILABLE", notes: "", driverId: "",
      });
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to create vehicle", "error");
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!window.confirm("Delete this vehicle? This action cannot be undone.")) return;
    const res = await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Vehicle deleted successfully", "success");
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to delete vehicle", "error");
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "success";
      case "ASSIGNED": return "info";
      case "MAINTENANCE": return "warning";
      case "INACTIVE": return "danger";
      default: return "default";
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Vehicles"
        description="Manage fleet vehicles and assignments"
        action={
          <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Add Vehicle
          </Button>
        }
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          placeholder="Search by plate number, make, or model..."
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
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles found"
              description={search ? "Try a different search term" : "Get started by adding your first vehicle"}
              action={
                <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Vehicle
                </Button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" /> Vehicle
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Make/Model</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Assigned Driver
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const vehicle = v as {
                    id: string;
                    plateNumber: string;
                    vehicleType: string;
                    make: string;
                    model: string;
                    year?: number;
                    color?: string;
                    capacity?: number;
                    status: string;
                    assignments: Array<{ driver: { name: string } }>;
                  };
                  return (
                    <tr key={vehicle.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded mr-2">
                              {vehicle.plateNumber}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {vehicle.year && <span>{vehicle.year} • </span>}
                            {vehicle.color && <span>{vehicle.color}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{vehicle.vehicleType}</td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{vehicle.make} {vehicle.model}</div>
                          {vehicle.capacity && (
                            <div className="text-xs text-slate-500">{vehicle.capacity} seats</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.assignments?.[0]?.driver?.name ? (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-900">{vehicle.assignments[0].driver.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(vehicle.status) as any} className="font-medium">
                          {vehicle.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/vehicles/${vehicle.id}`}
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                          >
                            View Details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 font-medium text-xs transition-colors"
                            onClick={() => deleteVehicle(vehicle.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Vehicle">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Make"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              required
              placeholder="e.g., Toyota, Hyundai"
            />
            <Input
              label="Model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
              placeholder="e.g., Camry, Staria"
            />
          </div>
          <Input
            label="Plate Number"
            value={form.plateNumber}
            onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
            required
            placeholder="e.g., ABC-1234"
          />
          <Input
            label="Vehicle Type"
            value={form.vehicleType}
            onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
            placeholder="e.g., Van, Sedan, SUV"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2023"
            />
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="White"
            />
            <Input
              label="Capacity"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="7"
            />
          </div>
          <Select
            label="Assign Driver"
            value={form.driverId}
            onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            options={[
              { value: "", label: "None (Assign later)" },
              ...drivers.map((d) => ({ value: d.id, label: d.name }))
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
              Save Vehicle
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
