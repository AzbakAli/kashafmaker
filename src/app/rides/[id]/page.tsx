"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Copy, CheckCircle, XCircle, Edit, Printer, Trash2, MapPin, Calendar, Users, Car, User, ArrowRight } from "lucide-react";

interface RideDetail {
  id: string;
  rideNumber: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  intermediateStops: string | null;
  tripType: string | null;
  notes: string | null;
  status: string;
  driverSnapshot: { name?: string; phone?: string } | null;
  vehicleSnapshot: { make?: string; model?: string; plateNumber?: string; vehicleType?: string } | null;
  driver: { id: string; name: string; phone: string | null } | null;
  vehicle: { make: string; model: string; plateNumber: string; vehicleType: string } | null;
  passengers: Array<{
    sortOrder: number;
    passengerSnapshot: { fullName?: string; passportNumber?: string; nationality?: string; gender?: string; visaType?: string } | null;
    passenger: { fullName: string; passportNumber: string | null; nationality: string | null; gender: string | null; visaType: string | null };
  }>;
  kashafDocuments: Array<{ id: string; documentNumber: string; createdAt: string; status: string }>;
}

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED": return "success" as const;
    case "IN_PROGRESS": return "info" as const;
    case "CANCELLED": return "danger" as const;
    default: return "warning" as const;
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED": return "✓";
    case "IN_PROGRESS": return "●";
    case "CANCELLED": return "✕";
    default: return "○";
  }
};

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRide = () => {
    fetch(`/api/rides/${id}`)
      .then((r) => r.json())
      .then(setRide)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRide(); }, [id]);

  const generateKashaf = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-kashaf" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const newDoc = await res.json();
      setRide((prev) => (prev ? { ...prev, kashafDocuments: [newDoc, ...prev.kashafDocuments] } : null));
      toast("Kashaf generated successfully", "success");
      fetchRide();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to generate Kashaf", "error");
    } finally {
      setGenerating(false);
    }
  };

  const deleteKashaf = async (documentId: string) => {
    if (!window.confirm("Delete this Kashaf PDF? This cannot be undone.")) return;
    setDeleting(documentId);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Kashaf deleted", "success");
      fetchRide();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to delete Kashaf", "error");
    } finally {
      setDeleting(null);
    }
  };

  const duplicateRide = async () => {
    const res = await fetch(`/api/rides/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    if (res.ok) {
      const newRide = await res.json();
      router.push(`/rides/${newRide.id}`);
    }
  };

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/rides/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", status }),
    });
    if (res.ok) {
      toast(`Ride marked as ${status.toLowerCase().replace("_", " ")}`, "success");
      fetchRide();
    }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></AppLayout>;
  if (!ride) return <AppLayout><p>Ride not found</p></AppLayout>;

  const latestDoc = ride.kashafDocuments[0];

  return (
    <AppLayout>
      <PageHeader
        title={`Ride ${ride.rideNumber}`}
        description={formatDate(ride.date)}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/rides/${ride.id}/edit`}>
              <Button variant="secondary">
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            </Link>
            <Button
              onClick={generateKashaf}
              disabled={generating}
            >
              <FileText className="h-4 w-4 mr-2" /> {generating ? "Generating..." : "Generate Kashaf"}
            </Button>
            {latestDoc && (
              <>
                <Button
                  variant="success"
                  href={`/api/documents/${latestDoc.id}?pdf=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer className="h-4 w-4 mr-2" /> View / Print
                </Button>
                <Button
                  variant="primary"
                  href={`/api/documents/${latestDoc.id}?download=1`}
                >
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
                <Button
                  variant="danger"
                  disabled={deleting === latestDoc.id}
                  onClick={() => deleteKashaf(latestDoc.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> {deleting === latestDoc.id ? "Deleting..." : "Delete Kashaf"}
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              onClick={duplicateRide}
            >
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex gap-2">
        <Badge variant={statusVariant(ride.status)} className="font-medium px-3 py-1">
          <span className="mr-1">{statusIcon(ride.status)}</span>
          {ride.status.replace("_", " ")}
        </Badge>
        {latestDoc ? (
          <Badge variant="success" className="font-medium px-3 py-1">
            <FileText className="h-3 w-3 mr-1" /> Kashaf Generated
          </Badge>
        ) : (
          <Badge variant="warning" className="font-medium px-3 py-1">
            Kashaf Pending
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" /> Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Pickup</p>
                    <p className="font-semibold text-slate-900">{ride.pickup}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Destination</p>
                    <p className="font-semibold text-slate-900">{ride.destination}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Trip Type</p>
                    <p className="font-medium text-slate-900">{ride.tripType || "—"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Stops</p>
                    <p className="font-medium text-slate-900">{ride.intermediateStops || "—"}</p>
                  </div>
                </div>
                {ride.notes && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                    <p className="font-medium text-slate-900">{ride.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" /> Passengers ({ride.passengers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Passport</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Nationality</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Gender</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Visa</th>
                  </tr>
                </thead>
                <tbody>
                  {ride.passengers.map((rp, i) => {
                    const snap = rp.passengerSnapshot;
                    return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{snap?.fullName || rp.passenger.fullName}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {snap?.passportNumber || rp.passenger.passportNumber || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{snap?.nationality || rp.passenger.nationality || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{snap?.gender || rp.passenger.gender || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{snap?.visaType || rp.passenger.visaType || "—"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {ride.kashafDocuments.length > 0 && (
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Kashaf Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ride.kashafDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-2 hover:bg-slate-100 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-900">{doc.documentNumber}</p>
                      <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        href={`/api/documents/${doc.id}?pdf=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                      >
                        <Printer className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        href={`/api/documents/${doc.id}?download=1`}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleting === doc.id}
                        onClick={() => deleteKashaf(doc.id)}
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" /> Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ride.driverSnapshot?.name || ride.driver ? (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-700 uppercase tracking-wide mb-1">Name</p>
                    <p className="font-semibold text-slate-900">{ride.driverSnapshot?.name || ride.driver?.name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</p>
                    <p className="font-medium text-slate-900">{ride.driverSnapshot?.phone || ride.driver?.phone || "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No driver assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-indigo-600" /> Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ride.vehicleSnapshot?.plateNumber || ride.vehicle ? (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-700 uppercase tracking-wide mb-1">Vehicle</p>
                    <p className="font-semibold text-slate-900">{ride.vehicleSnapshot?.make || ride.vehicle?.make} {ride.vehicleSnapshot?.model || ride.vehicle?.model}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Plate</p>
                    <p className="font-medium text-slate-900">{ride.vehicleSnapshot?.plateNumber || ride.vehicle?.plateNumber}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Type</p>
                    <p className="font-medium text-slate-900">{ride.vehicleSnapshot?.vehicleType || ride.vehicle?.vehicleType}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Car className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No vehicle assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle>Ride Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ride.status === "SCHEDULED" && (
                <Button
                  variant="success"
                  className="w-full"
                  onClick={() => updateStatus("IN_PROGRESS")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Start Ride
                </Button>
              )}
              {ride.status !== "COMPLETED" && ride.status !== "CANCELLED" && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => updateStatus("COMPLETED")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark Completed
                </Button>
              )}
              {ride.status !== "CANCELLED" && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm("Cancel this ride?")) updateStatus("CANCELLED");
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancel Ride
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
