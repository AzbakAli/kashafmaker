"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vehicles/${id}`).then((r) => r.json()).then(setVehicle).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></AppLayout>;
  if (!vehicle) return <AppLayout><p>Vehicle not found</p></AppLayout>;

  const v = vehicle as {
    vehicleType: string; make: string; model: string; plateNumber: string;
    registrationNumber: string | null; vehicleId: string | null; year: number | null;
    color: string | null; capacity: number | null; status: string; notes: string | null;
    assignments: Array<{ isActive: boolean; assignedAt: string; driver: { name: string } }>;
    rides: Array<{ id: string; rideNumber: string; date: string; pickup: string; destination: string; status: string; driver: { name: string } | null }>;
  };

  return (
    <AppLayout>
      <PageHeader title={`${v.make} ${v.model}`} description={`Plate: ${v.plateNumber}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-500">Type</dt><dd className="font-medium">{v.vehicleType}</dd></div>
              <div><dt className="text-slate-500">Plate</dt><dd className="font-medium">{v.plateNumber}</dd></div>
              <div><dt className="text-slate-500">Registration</dt><dd className="font-medium">{v.registrationNumber || "—"}</dd></div>
              <div><dt className="text-slate-500">Capacity</dt><dd className="font-medium">{v.capacity || "—"}</dd></div>
              <div><dt className="text-slate-500">Color</dt><dd className="font-medium">{v.color || "—"}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><Badge>{v.status}</Badge></dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assignment History</CardTitle></CardHeader>
          <CardContent>
            {v.assignments.length === 0 ? <p className="text-sm text-slate-500">No assignments</p> :
              v.assignments.map((a, i) => (
                <div key={i} className="flex justify-between py-2 border-b text-sm">
                  <span className="font-medium">{a.driver.name}</span>
                  <span className="text-slate-500">{a.isActive ? "Current" : formatDate(a.assignedAt)}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Ride History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {v.rides.length === 0 ? <p className="p-4 text-sm text-slate-500">No rides</p> :
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left">Ride #</th><th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Driver</th><th className="px-4 py-2 text-left">Route</th>
                </tr></thead>
                <tbody>
                  {v.rides.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-4 py-2"><Link href={`/rides/${r.id}`} className="text-indigo-600 hover:underline">{r.rideNumber}</Link></td>
                      <td className="px-4 py-2">{formatDate(r.date)}</td>
                      <td className="px-4 py-2">{r.driver?.name || "—"}</td>
                      <td className="px-4 py-2">{r.pickup} → {r.destination}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
