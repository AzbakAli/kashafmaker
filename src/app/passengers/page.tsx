"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardContent, EmptyState, LoadingSpinner, Modal, ConfirmDialog,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Search, UserCircle, Globe, Trash2, ArrowRight, Edit2, ScanSearch,
} from "lucide-react";
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

  // Modal state — null means create, string means edit that id
  const [editId, setEditId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = () => {
    fetch(`/api/passengers?q=${debouncedSearch}`)
      .then((r) => r.json())
      .then((data) => setPassengers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [debouncedSearch]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Passenger) => {
    setEditId(p.id);
    setForm({
      fullName: p.fullName,
      passportNumber: p.passportNumber || "",
      nationality: p.nationality || "",
      gender: p.gender || "",
      visaType: p.visaType || "",
      iqamaNumber: "",
      phone: p.phone || "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleImportMultiple = async (
    items: import("@/lib/visa/apply-fields").PassengerVisaFields[]
  ) => {
    try {
      const promises = items.map(async (data, idx) => {
        const res = await fetch("/api/passengers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName:
              data.fullName.trim() ||
              `Passenger ${idx + 1} (${data.passportNumber.trim() || "Visa"})`,
            passportNumber: data.passportNumber.trim() || undefined,
            nationality: data.nationality.trim() || undefined,
            visaType: data.visaType.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || `Failed to create ${data.fullName || `Passenger ${idx + 1}`}`
          );
        }
        return res.json();
      });
      await Promise.all(promises);
      fetchData();
      toast(`Imported ${items.length} passenger(s)!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import passengers", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = editId ? `/api/passengers/${editId}` : "/api/passengers";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, gender: form.gender || undefined }),
      });
      if (res.ok) {
        toast(editId ? "Passenger updated" : "Passenger created", "success");
        setModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to save passenger", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/passengers/${deleteTarget}`, { method: "DELETE" });
      if (res.ok) {
        toast("Passenger deleted", "success");
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to delete", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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
                setForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                setEditId(null);
                setModalOpen(true);
              }}
              onConfirmMultiple={handleImportMultiple}
              label="Scan Visa"
            />
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Passenger
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="mb-5 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          placeholder="Search by name, passport number, or nationality…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : passengers.length === 0 ? (
            <EmptyState
              title="No passengers yet"
              description={
                search
                  ? "Try a different search term"
                  : "Add passengers manually or import from a visa scan."
              }
              icon={<UserCircle className="h-12 w-12" />}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <VisaImportButton
                    onConfirm={(fields) => {
                      setForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                      setEditId(null);
                      setModalOpen(true);
                    }}
                    onConfirmMultiple={handleImportMultiple}
                  />
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add Passenger
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Passport
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                      Nationality
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                      Gender
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                      Visa Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">
                      Phone
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {passengers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {p.fullName.charAt(0).toUpperCase()}
                          </div>
                          <Link
                            href={`/passengers/${p.id}`}
                            className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors text-sm truncate max-w-[180px]"
                          >
                            {p.fullName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.passportNumber ? (
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                            {p.passportNumber}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {p.nationality ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Globe className="h-3.5 w-3.5 text-slate-300" />
                            {p.nationality}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 hidden md:table-cell">
                        {p.gender
                          ? p.gender.charAt(0) + p.gender.slice(1).toLowerCase()
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 hidden lg:table-cell">
                        {p.visaType || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 hidden xl:table-cell">
                        {p.phone || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <Link
                            href={`/passengers/${p.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editId ? "Edit Passenger" : "Add Passenger"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editId && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
              <p className="mb-2 text-sm font-medium text-indigo-900 flex items-center gap-1.5">
                <ScanSearch className="h-4 w-4" /> Have a visa file?
              </p>
              <VisaImportButton
                disabled={saving}
                onConfirm={(fields) => {
                  setForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                }}
                onConfirmMultiple={async (passengers) => {
                  await handleImportMultiple(passengers);
                  setModalOpen(false);
                }}
              />
              <p className="mt-2 text-xs text-indigo-700">
                Fills name, passport, nationality, and visa type automatically.
              </p>
            </div>
          )}
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
          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Add Passenger"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Passenger?"
        message="This will permanently remove the passenger and all associated records. This cannot be undone."
      />
    </AppLayout>
  );
}
