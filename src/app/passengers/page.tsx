"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, EmptyState, LoadingSpinner, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, User, Phone, IdCard, Globe, ArrowRight, Trash2 } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { VisaImportButton } from "@/components/passengers/visa-import";
import { applyVisaFieldsToPassengerForm } from "@/lib/visa/apply-fields";

interface Passenger {
  id: string;
  fullName: string;
  passportNumber: string | null;
  nationality: string | null;
  gender: string | null;
  visaType: string | null;
  phone: string | null;
}

const EMPTY_FORM = {
  fullName: "",
  passportNumber: "",
  nationality: "",
  gender: "",
  visaType: "",
  iqamaNumber: "",
  phone: "",
  notes: "",
};

export default function PassengersPage() {
  const { toast } = useToast();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = () => {
    fetch(`/api/passengers?q=${debouncedSearch}`)
      .then((r) => r.json())
      .then((data) => setPassengers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch]);

  const openBlankForm = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleImportMultiple = async (items: import("@/lib/visa/apply-fields").PassengerVisaFields[]) => {
    try {
      const promises = items.map(async (data) => {
        const res = await fetch("/api/passengers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: data.fullName.trim() || "Unknown",
            passportNumber: data.passportNumber.trim() || undefined,
            nationality: data.nationality.trim() || undefined,
            visaType: data.visaType.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to create ${data.fullName}`);
        }
        return res.json();
      });

      await Promise.all(promises);
      fetchData();
      toast(`Successfully imported ${items.length} passenger(s)!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import passengers", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          gender: form.gender || undefined,
        }),
      });
      if (res.ok) {
        toast("Passenger created successfully", "success");
        setModalOpen(false);
        setForm(EMPTY_FORM);
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to create passenger", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const deletePassenger = async (passengerId: string) => {
    if (!window.confirm("Delete this passenger? This action cannot be undone.")) return;
    const res = await fetch(`/api/passengers/${passengerId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Passenger deleted successfully", "success");
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to delete passenger", "error");
    }
  };

  const getGenderIcon = (gender: string | null) => {
    switch (gender) {
      case "MALE":
        return "♂";
      case "FEMALE":
        return "♀";
      default:
        return "—";
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Passengers"
        description="Store traveler details once, then reuse them on rides and Kashaf documents."
        action={
          <div className="flex flex-wrap gap-2">
            <VisaImportButton
              onConfirm={(fields) => {
                setForm((current) => applyVisaFieldsToPassengerForm(current, fields));
                setModalOpen(true);
              }}
              onConfirmMultiple={handleImportMultiple}
            />
            <Button onClick={openBlankForm}>
              <Plus className="h-4 w-4" /> Add Passenger
            </Button>
          </div>
        }
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          placeholder="Search passengers by name, passport, or nationality..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : passengers.length === 0 ? (
            <EmptyState
              title="No passengers found"
              description={search ? "Try a different search term" : "Add a passenger manually or import the four visa fields from a PDF or photo."}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <VisaImportButton
                    onConfirm={(fields) => {
                      setForm((current) => applyVisaFieldsToPassengerForm(current, fields));
                      setModalOpen(true);
                    }}
                    onConfirmMultiple={handleImportMultiple}
                  />
                  <Button onClick={openBlankForm}>
                    <Plus className="h-4 w-4" /> Add Passenger
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Passenger
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <IdCard className="h-4 w-4" /> Passport
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Nationality
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Gender</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Visa Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Contact
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                            {p.fullName.charAt(0).toUpperCase()}
                          </div>
                          <Link href={`/passengers/${p.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                            {p.fullName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{p.passportNumber || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.nationality || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600">
                          {getGenderIcon(p.gender)} {p.gender || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.visaType || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/passengers/${p.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors">
                            View Details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 font-medium text-xs transition-colors"
                            onClick={() => deletePassenger(p.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title="Add New Passenger">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
            <p className="mb-2 text-sm font-medium text-indigo-950">Have a visa file?</p>
            <VisaImportButton
              disabled={saving}
              onConfirm={(fields) => {
                setForm((current) => applyVisaFieldsToPassengerForm(current, fields));
              }}
              onConfirmMultiple={async (passengers) => {
                await handleImportMultiple(passengers);
                setModalOpen(false);
              }}
            />
            <p className="mt-2 text-xs text-indigo-800">
              Import fills name, passport, nationality, and visa type only. Save still happens with the button below.
            </p>
          </div>
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            placeholder="Enter passenger's full name"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Passport Number"
              value={form.passportNumber}
              onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
              placeholder="Travel document number"
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              placeholder="Country of citizenship"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { value: "", label: "Select gender" },
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <Input
              label="Visa Type"
              value={form.visaType}
              onChange={(e) => setForm({ ...form, visaType: e.target.value })}
              placeholder="e.g., Umrah, Tourism Visit"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Iqama Number"
              value={form.iqamaNumber}
              onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
              placeholder="Saudi residence ID"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
            />
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional information"
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Passenger"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
