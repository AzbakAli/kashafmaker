"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { VisaImportButton } from "@/components/passengers/visa-import";
import { applyVisaFieldsToPassengerForm } from "@/lib/visa/apply-fields";

interface Driver {
  id: string;
  name: string;
  assignments: Array<{ vehicle: { id: string; make: string; model: string; plateNumber: string } }>;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
}

interface Passenger {
  id: string;
  fullName: string;
  passportNumber: string | null;
  nationality: string | null;
  gender: string | null;
  visaType: string | null;
}

interface RideFormProps {
  rideId?: string;
  initial?: {
    date: string;
    pickup: string;
    destination: string;
    intermediateStops: string;
    tripType: string;
    notes: string;
    status: string;
    driverId: string;
    vehicleId: string;
    passengers: Passenger[];
  };
}

export function RideForm({ rideId, initial }: RideFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
  const [selectedPassengers, setSelectedPassengers] = useState<Passenger[]>(initial?.passengers || []);
  const [passengerSearch, setPassengerSearch] = useState("");
  const [newPassenger, setNewPassenger] = useState({
    fullName: "",
    passportNumber: "",
    nationality: "",
    gender: "",
    visaType: "",
  });
  const [showNewPassenger, setShowNewPassenger] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPassenger, setSavingPassenger] = useState(false);
  const skipAutoVehicle = useRef(Boolean(initial?.vehicleId));

  const [form, setForm] = useState({
    date: initial?.date || new Date().toISOString().slice(0, 10),
    pickup: initial?.pickup || "",
    destination: initial?.destination || "",
    intermediateStops: initial?.intermediateStops || "",
    tripType: initial?.tripType || "",
    notes: initial?.notes || "",
    status: initial?.status || "SCHEDULED",
    driverId: initial?.driverId || "",
    vehicleId: initial?.vehicleId || "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers?status=ACTIVE").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
      fetch("/api/passengers").then((r) => r.json()),
    ]).then(([d, v, p]) => {
      setDrivers(Array.isArray(d) ? d : []);
      setVehicles(Array.isArray(v) ? v : []);
      setAllPassengers(Array.isArray(p) ? p : []);
    });
  }, []);

  const assignedVehicle = drivers.find((d) => d.id === form.driverId)?.assignments[0]?.vehicle;

  useEffect(() => {
    if (skipAutoVehicle.current) {
      skipAutoVehicle.current = false;
      return;
    }
    if (assignedVehicle) {
      setForm((f) => ({ ...f, vehicleId: assignedVehicle.id }));
    }
  }, [form.driverId, assignedVehicle?.id]);

  const createPassenger = async () => {
    if (!newPassenger.fullName || savingPassenger) return;
    setSavingPassenger(true);
    try {
      const res = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPassenger,
          gender: newPassenger.gender || undefined,
        }),
      });
      if (!res.ok) {
        toast("Could not add passenger", "error");
        return;
      }
      const created = await res.json();
      setAllPassengers((prev) => [...prev, created]);
      addPassenger(created);
      setNewPassenger({ fullName: "", passportNumber: "", nationality: "", gender: "", visaType: "" });
      setShowNewPassenger(false);
      toast("Passenger added", "success");
    } finally {
      setSavingPassenger(false);
    }
  };

  const addPassenger = (passenger: Passenger) => {
    setSelectedPassengers((prev) =>
      prev.find((p) => p.id === passenger.id) ? prev : [...prev, passenger]
    );
    setPassengerSearch("");
  };

  const removePassenger = (id: string) => {
    setSelectedPassengers((prev) => prev.filter((p) => p.id !== id));
  };

  const movePassenger = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedPassengers.length) return;
    setSelectedPassengers((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(rideId ? `/api/rides/${rideId}` : "/api/rides", {
        method: rideId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          passengerIds: selectedPassengers.map((p) => p.id),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const ride = await res.json();
      toast(rideId ? "Ride updated" : "Ride created successfully", "success");
      router.push(`/rides/${ride.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save ride", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredPassengers = allPassengers.filter(
    (p) =>
      !selectedPassengers.find((sp) => sp.id === p.id) &&
      (passengerSearch
        ? p.fullName.toLowerCase().includes(passengerSearch.toLowerCase()) ||
          p.passportNumber?.toLowerCase().includes(passengerSearch.toLowerCase())
        : false)
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-slate-900">Basic Information</h3>
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Input label="Pickup Location" value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} required />
            <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
            <Input label="Intermediate Stops" value={form.intermediateStops} onChange={(e) => setForm({ ...form, intermediateStops: e.target.value })} />
            <Input label="Trip Type" value={form.tripType} onChange={(e) => setForm({ ...form, tripType: e.target.value })} placeholder="e.g. Umrah Transfer" />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "SCHEDULED", label: "Scheduled" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
            />
            <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="font-semibold text-slate-900">Driver &amp; Vehicle</h3>
              <Select
                label="Driver"
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value, vehicleId: "" })}
                options={[
                  { value: "", label: "Select driver..." },
                  ...drivers.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
              {form.driverId && !assignedVehicle && (
                <p className="text-sm text-amber-600">No vehicle assigned to this driver.</p>
              )}
              <Select
                label="Vehicle"
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                options={[
                  { value: "", label: "Select vehicle..." },
                  ...vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.make} ${v.model} — ${v.plateNumber}`,
                  })),
                ]}
              />
              {assignedVehicle && form.vehicleId === assignedVehicle.id && (
                <p className="text-xs text-emerald-600">Auto-selected from driver assignment</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Passengers</h3>
                <div className="flex flex-wrap gap-2">
                  <VisaImportButton
                    onConfirm={(fields) => {
                      setNewPassenger((current) => applyVisaFieldsToPassengerForm(current, fields));
                      setShowNewPassenger(true);
                    }}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewPassenger((v) => !v)}>
                    <Plus className="h-4 w-4" /> Add new
                  </Button>
                </div>
              </div>

              {showNewPassenger && (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <Input
                    placeholder="Full name"
                    value={newPassenger.fullName}
                    onChange={(e) => setNewPassenger({ ...newPassenger, fullName: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Passport"
                      value={newPassenger.passportNumber}
                      onChange={(e) => setNewPassenger({ ...newPassenger, passportNumber: e.target.value })}
                    />
                    <Input
                      placeholder="Nationality"
                      value={newPassenger.nationality}
                      onChange={(e) => setNewPassenger({ ...newPassenger, nationality: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={newPassenger.gender}
                      onChange={(e) => setNewPassenger({ ...newPassenger, gender: e.target.value })}
                      options={[
                        { value: "", label: "Gender" },
                        { value: "MALE", label: "Male" },
                        { value: "FEMALE", label: "Female" },
                      ]}
                    />
                    <Input
                      placeholder="Visa type"
                      value={newPassenger.visaType}
                      onChange={(e) => setNewPassenger({ ...newPassenger, visaType: e.target.value })}
                    />
                  </div>
                  <Button type="button" size="sm" onClick={createPassenger} disabled={savingPassenger}>
                    {savingPassenger ? "Saving..." : "Save passenger"}
                  </Button>
                </div>
              )}
              <div className="relative">
                <Input
                  placeholder="Search existing passengers by name or passport..."
                  value={passengerSearch}
                  onChange={(e) => setPassengerSearch(e.target.value)}
                />
                {filteredPassengers.length > 0 && passengerSearch && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-40 overflow-y-auto">
                    {filteredPassengers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                        onClick={() => addPassenger(p)}
                      >
                        {p.fullName} — {p.passportNumber || "No passport"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPassengers.length === 0 ? (
                <p className="text-sm text-slate-500">No passengers added yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedPassengers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border p-3">
                      <div className="flex flex-col">
                        <button type="button" onClick={() => movePassenger(i, -1)} className="text-slate-400 hover:text-slate-700" aria-label="Move up">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => movePassenger(i, 1)} className="text-slate-400 hover:text-slate-700" aria-label="Move down">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{i + 1}. {p.fullName}</p>
                        <p className="text-xs text-slate-500">
                          Passport: {p.passportNumber || "—"} | {p.nationality || "—"} | {p.gender || "—"} | {p.visaType || "—"}
                        </p>
                      </div>
                      <button type="button" onClick={() => removePassenger(p.id)}>
                        <X className="h-4 w-4 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : rideId ? "Update Ride" : "Save Ride"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
