"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Car, Users, Truck, FileText } from "lucide-react";

interface Stats {
  totalRides: number;
  completedRides: number;
  upcomingRides: number;
  todayRides: number;
  totalDrivers: number;
  totalVehicles: number;
  kashafDocuments: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Reports" description="Operational summary of rides, fleet, and Kashaf output" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Rides" value={loading ? "..." : (stats?.totalRides ?? 0)} icon={Car} />
        <StatCard title="Completed" value={loading ? "..." : (stats?.completedRides ?? 0)} icon={Car} />
        <StatCard title="Upcoming" value={loading ? "..." : (stats?.upcomingRides ?? 0)} icon={Car} />
        <StatCard title="Today" value={loading ? "..." : (stats?.todayRides ?? 0)} icon={Car} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Drivers" value={loading ? "..." : (stats?.totalDrivers ?? 0)} icon={Users} />
        <StatCard title="Vehicles" value={loading ? "..." : (stats?.totalVehicles ?? 0)} icon={Truck} />
        <StatCard title="Kashaf Documents" value={loading ? "..." : (stats?.kashafDocuments ?? 0)} icon={FileText} />
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
    </AppLayout>
  );
}
