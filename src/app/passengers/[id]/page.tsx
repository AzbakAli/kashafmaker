"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function PassengerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [passenger, setPassenger] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/passengers/${id}`).then((r) => r.json()).then(setPassenger).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></AppLayout>;
  if (!passenger || !("fullName" in passenger)) return <AppLayout><p>Passenger not found</p></AppLayout>;

  const p = passenger as {
    fullName: string;
    passportNumber: string | null;
    nationality: string | null;
    gender: string | null;
    visaType: string | null;
    iqamaNumber: string | null;
    phone: string | null;
    notes: string | null;
    ridePassengers: Array<{
      ride: { id: string; rideNumber: string; date: string; pickup: string; destination: string; status: string; driver: { name: string } | null };
    }>;
  };

  return (
    <AppLayout>
      <PageHeader title={p.fullName} description="Passenger profile and ride history" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Passenger Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-500">Passport</dt><dd className="font-medium">{p.passportNumber || "—"}</dd></div>
              <div><dt className="text-slate-500">Nationality</dt><dd className="font-medium">{p.nationality || "—"}</dd></div>
              <div><dt className="text-slate-500">Gender</dt><dd className="font-medium">{p.gender || "—"}</dd></div>
              <div><dt className="text-slate-500">Visa Type</dt><dd className="font-medium">{p.visaType || "—"}</dd></div>
              <div><dt className="text-slate-500">Iqama</dt><dd className="font-medium">{p.iqamaNumber || "—"}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{p.phone || "—"}</dd></div>
            </dl>
            {p.notes && <p className="mt-4 text-sm text-slate-600">{p.notes}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ride History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {p.ridePassengers.length === 0 ? <p className="p-4 text-sm text-slate-500">No rides yet</p> :
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left">Ride #</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Route</th>
                </tr></thead>
                <tbody>
                  {p.ridePassengers.map((rp) => (
                    <tr key={rp.ride.id} className="border-b">
                      <td className="px-4 py-2"><Link href={`/rides/${rp.ride.id}`} className="text-indigo-600 hover:underline">{rp.ride.rideNumber}</Link></td>
                      <td className="px-4 py-2">{formatDate(rp.ride.date)}</td>
                      <td className="px-4 py-2">{rp.ride.pickup} → {rp.ride.destination} <Badge>{rp.ride.status.replace("_", " ")}</Badge></td>
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
