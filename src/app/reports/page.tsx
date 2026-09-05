"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, StatCard, Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from "@/components/ui/card";
import { Car, Users, Truck, FileText } from "lucide-react";

export default function ReportsPage() {
  const [data, setData] = useState<{
    totalRides: number;
    todayRides: number;
    upcomingRides: number;
    completedRides: number;
    totalDrivers: number;
    totalVehicles: number;
    totalPassengers: number;
    kashafDocuments: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Reports" description="Operational summary of rides, fleet, and Kashaf output" />
      {!data ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard title="Total Rides" value={data.totalRides} icon={Car} />
            <StatCard title="Completed" value={data.completedRides} icon={Car} />
            <StatCard title="Upcoming" value={data.upcomingRides} icon={Car} />
            <StatCard title="Today" value={data.todayRides} icon={Car} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Drivers" value={data.totalDrivers} icon={Users} />
            <StatCard title="Vehicles" value={data.totalVehicles} icon={Truck} />
            <StatCard title="Kashaf Documents" value={data.kashafDocuments} icon={FileText} />
          </div>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Historical Kashaf documents keep a snapshot of driver, vehicle, company, and passenger
                details at generation time. Later profile changes do not alter previously generated PDFs.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
