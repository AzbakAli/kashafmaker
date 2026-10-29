"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner, Modal, ConfirmDialog,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import {
  User, Globe, FileText, ArrowLeft, Edit, Trash2, Calendar, MapPin,
} from "lucide-react";

interface PassengerData {
  id: string;
  fullName: string;
  passportNumber: string | null;
  nationality: string | null;
  gender: string | null;
  visaType: string | null;
  iqamaNumber: string | null;
  phone: string | null;
  createdAt: string;
  ridePassengers: Array<{
    ride: {
      id: string;
      rideNumber: string;
      date: string;
      pickup: string;
      destination: string;
      status: string;
      driver: { name: string } | null;
    };
  }>;
}

export default function PassengerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [passenger, setPassenger] = useState<PassengerData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    passportNumber: "",
    nationality: "",
    gender: "",
    visaType: "",
    iqamaNumber: "",
    phone: "",
  });

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPassenger = () => {
    fetch(`/api/passengers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && "fullName" in data) {
          setPassenger(data);
          setForm({
            fullName: data.fullName || "",
            passportNumber: data.passportNumber || "",
            nationality: data.nationality || "",
            gender: data.gender || "",
            visaType: data.visaType || "",
            iqamaNumber: data.iqamaNumber || "",
            phone: data.phone || "",
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPassenger();
  }, [id]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/passengers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast("Passenger details updated", "success");
        setEditOpen(false);
        fetchPassenger();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update passenger", "error");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/passengers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Passenger deleted", "success");
        router.push("/passengers");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!passenger) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <p className="text-slate-500 mb-4">Passenger not found</p>
          <Button href="/passengers" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Passengers
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={passenger.fullName}
        description={`Passenger Profile • Added on ${formatDate(passenger.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/passengers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Button
              onClick={() => setEditOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Edit className="h-4 w-4 mr-1.5" /> Edit Passenger
            </Button>
            <Button
              onClick={() => setDeleteConfirm(true)}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Passenger Information Card */}
        <div className="lg:col-span-1">
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
                {passenger.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base truncate">{passenger.fullName}</h3>
                <p className="text-xs text-indigo-700 font-medium">
                  {passenger.visaType || "Passenger Record"}
                </p>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Passport Number
                </p>
                {passenger.passportNumber ? (
                  <span className="font-mono text-sm bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-semibold border border-slate-200">
                    {passenger.passportNumber}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 italic">Not provided</span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nationality
                </p>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-slate-400" />
                  {passenger.nationality || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Gender
                  </p>
                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {passenger.gender ? passenger.gender.toLowerCase() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Visa Type
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {passenger.visaType || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Iqama Number
                  </p>
                  <p className="text-sm font-mono text-slate-800">
                    {passenger.iqamaNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {passenger.phone || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ride History Card */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" /> Ride History ({passenger.ridePassengers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {passenger.ridePassengers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  This passenger has not been assigned to any rides yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ride #</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Route</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Driver</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {passenger.ridePassengers.map((rp) => (
                        <tr key={rp.ride.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-bold font-mono text-indigo-600 text-xs">
                            <Link href={`/rides/${rp.ride.id}`} className="hover:underline">
                              {rp.ride.rideNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            {formatDate(rp.ride.date)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-800 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {rp.ride.pickup} → {rp.ride.destination}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            {rp.ride.driver?.name || "Unassigned"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              href={`/rides/${rp.ride.id}`}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              View Ride →
                            </Link>
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

      {/* Edit Passenger Modal */}
      <Modal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit Passenger Details"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Full Name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            placeholder="e.g. MOHAMMED KHALID AL-HARBI"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Passport Number"
              value={form.passportNumber}
              onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
              placeholder="e.g. A12345678"
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              placeholder="e.g. Saudi Arabia, Pakistan"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { value: "", label: "Select gender..." },
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <Input
              label="Visa Type"
              value={form.visaType}
              onChange={(e) => setForm({ ...form, visaType: e.target.value })}
              placeholder="e.g. Umrah, Tourism"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Iqama Number"
              value={form.iqamaNumber}
              onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
              placeholder="10-digit Saudi ID"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => !deleting && setDeleteConfirm(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Passenger?"
        message="This will permanently delete this passenger record from your system."
      />
    </AppLayout>
  );
}
