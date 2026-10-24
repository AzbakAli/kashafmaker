"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, EmptyState, LoadingSpinner, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, User, Phone, IdCard, Globe, UserCircle, CheckCircle, XCircle, Trash2, ArrowRight, FileText, Upload } from "lucide-react";

interface Passenger {
  id: string;
  fullName: string;
  passportNumber: string | null;
  nationality: string | null;
  gender: string | null;
  visaType: string | null;
  phone: string | null;
}

interface VisaExtractedData {
  fullName: string;
  passportNumber: string;
  nationality: string;
  visaType: string;
  confidence: {
    fullName: 'high' | 'medium' | 'low';
    passportNumber: 'high' | 'medium' | 'low';
    nationality: 'high' | 'medium' | 'low';
    visaType: 'high' | 'medium' | 'low';
  };
}

export default function PassengersPage() {
  const { toast } = useToast();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [visaModalOpen, setVisaModalOpen] = useState(false);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<VisaExtractedData | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    passportNumber: "",
    nationality: "",
    gender: "",
    visaType: "",
    iqamaNumber: "",
    phone: "",
    notes: "",
  });

  const fetchData = () => {
    fetch(`/api/passengers?q=${search}`)
      .then((r) => r.json())
      .then((data) => setPassengers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setForm({
        fullName: "",
        passportNumber: "",
        nationality: "",
        gender: "",
        visaType: "",
        iqamaNumber: "",
        phone: "",
        notes: "",
      });
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to create passenger", "error");
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

  const handleVisaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast("Please upload a PDF file", "error");
      return;
    }

    setVisaFile(file);
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract-visa', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to extract visa information');
      }

      const data = await res.json();
      setExtractedData(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to extract visa information', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const confirmAndFill = () => {
    if (!extractedData) return;

    setForm({
      ...form,
      fullName: extractedData.fullName,
      passportNumber: extractedData.passportNumber,
      nationality: extractedData.nationality,
      visaType: extractedData.visaType,
    });

    setVisaModalOpen(false);
    setModalOpen(true);
    setExtractedData(null);
    setVisaFile(null);
  };

  const getGenderIcon = (gender: string | null) => {
    switch (gender) {
      case "MALE": return "♂";
      case "FEMALE": return "♀";
      default: return "—";
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Passengers"
        description="Manage passenger and customer records"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setVisaModalOpen(true)} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <FileText className="h-4 w-4 mr-2" /> Import from Visa PDF
            </Button>
            <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add Passenger
            </Button>
          </div>
        }
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          placeholder="Search passengers by name, passport, or nationality..."
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
          ) : passengers.length === 0 ? (
            <EmptyState
              title="No passengers found"
              description={search ? "Try a different search term" : "Get started by adding your first passenger"}
              action={
                <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Passenger
                </Button>
              }
            />
          ) : (
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
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {p.fullName.charAt(0).toUpperCase()}
                        </div>
                        <Link
                          href={`/passengers/${p.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {p.fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                        {p.passportNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.nationality || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{getGenderIcon(p.gender)} {p.gender || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.visaType || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/passengers/${p.id}`}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                        >
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
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Passenger">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="e.g., Umrah, Tourist"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              Save Passenger
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={visaModalOpen} onClose={() => setVisaModalOpen(false)} title="Import Passenger from Visa PDF">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleVisaUpload}
              className="hidden"
              id="visa-upload"
            />
            <label
              htmlFor="visa-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                {visaFile ? visaFile.name : "Click to upload visa PDF"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports text-based and scanned PDFs</p>
            </label>
          </div>

          {extracting && (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner />
              <span className="ml-2 text-sm text-slate-600">Extracting information...</span>
            </div>
          )}

          {extractedData && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Extracted Information</h3>
              
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                <Input
                  value={extractedData.fullName}
                  onChange={(e) => setExtractedData({ ...extractedData, fullName: e.target.value })}
                  className={extractedData.confidence.fullName === 'low' ? 'border-amber-500' : ''}
                />
                {extractedData.confidence.fullName === 'low' && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Low confidence - please verify</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1">Passport Number</label>
                <Input
                  value={extractedData.passportNumber}
                  onChange={(e) => setExtractedData({ ...extractedData, passportNumber: e.target.value })}
                  className={extractedData.confidence.passportNumber === 'low' ? 'border-amber-500' : ''}
                />
                {extractedData.confidence.passportNumber === 'low' && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Low confidence - please verify</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1">Nationality</label>
                <Input
                  value={extractedData.nationality}
                  onChange={(e) => setExtractedData({ ...extractedData, nationality: e.target.value })}
                  className={extractedData.confidence.nationality === 'low' ? 'border-amber-500' : ''}
                />
                {extractedData.confidence.nationality === 'low' && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Low confidence - please verify</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1">Visa Type</label>
                <Input
                  value={extractedData.visaType}
                  onChange={(e) => setExtractedData({ ...extractedData, visaType: e.target.value })}
                  className={extractedData.confidence.visaType === 'low' ? 'border-amber-500' : ''}
                />
                {extractedData.confidence.visaType === 'low' && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Low confidence - please verify</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVisaModalOpen(false);
                    setExtractedData(null);
                    setVisaFile(null);
                  }}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAndFill}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Confirm and Fill Form
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
