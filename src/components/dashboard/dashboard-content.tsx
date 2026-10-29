"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Car,
  Users,
  Truck,
  UserCircle,
  FileText,
  Plus,
  Calendar,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  ScanSearch,
} from "lucide-react";
import {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  LoadingSpinner,
  StatusDot,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardData {
  totalRides: number;
  todayRides: number;
  upcomingRides: number;
  completedRides: number;
  totalDrivers: number;
  totalVehicles: number;
  totalPassengers: number;
  kashafDocuments: number;
  todayRidesList: Array<{
    id: string;
    rideNumber: string;
    time: string;
    pickup: string;
    destination: string;
    status: string;
    driver: { name: string } | null;
    vehicle: { make: string; model: string; plateNumber: string } | null;
    kashafDocuments: Array<{ id: string }>;
    _count: { passengers: number };
  }>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED": return "success" as const;
    case "IN_PROGRESS": return "info" as const;
    case "CANCELLED": return "danger" as const;
    default: return "warning" as const;
  }
};

const statusDot = (status: string): "success" | "info" | "danger" | "warning" => {
  switch (status) {
    case "COMPLETED": return "success";
    case "IN_PROGRESS": return "info";
    case "CANCELLED": return "danger";
    default: return "warning";
  }
};

export function DashboardContent({ initialData }: { initialData?: DashboardData }) {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

  const userName = session?.user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    if (initialData) return;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((payload) => {
        if (payload && typeof payload.totalRides === "number") setData(payload);
      })
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-slate-100 border border-slate-200" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{userName} 👋</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/rides/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> New Ride
            </Button>
          </Link>
          <Link href="/passengers">
            <Button size="sm" variant="outline">
              <ScanSearch className="h-3.5 w-3.5" /> Scan Visa
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Rides"
          value={data.totalRides}
          icon={Car}
          trend={`${data.todayRides} today`}
          href="/rides"
          actionLabel="View all rides"
          color="indigo"
        />
        <StatCard
          title="Upcoming"
          value={data.upcomingRides}
          icon={Clock}
          trend="Scheduled"
          href="/rides"
          color="blue"
        />
        <StatCard
          title="Active Drivers"
          value={data.totalDrivers}
          icon={Users}
          href="/drivers"
          actionLabel="Manage drivers"
          color="emerald"
        />
        <StatCard
          title="Vehicles"
          value={data.totalVehicles}
          icon={Truck}
          href="/vehicles"
          actionLabel="Manage fleet"
          color="amber"
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Passengers"
          value={data.totalPassengers}
          icon={UserCircle}
          href="/passengers"
          color="violet"
        />
        <StatCard
          title="Completed Rides"
          value={data.completedRides}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Kashaf PDFs"
          value={data.kashafDocuments}
          icon={FileText}
          href="/documents"
          actionLabel="View documents"
          color="indigo"
        />
        <div className="rounded-xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-4 gap-2 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Add</p>
          <Link href="/passengers">
            <Button size="xs" variant="outline" className="w-full">
              <Plus className="h-3 w-3" /> Passenger
            </Button>
          </Link>
          <Link href="/drivers">
            <Button size="xs" variant="outline" className="w-full">
              <Plus className="h-3 w-3" /> Driver
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's rides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Today&apos;s Rides</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/rides" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {data.todayRidesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">No rides scheduled today</p>
              <p className="text-xs text-slate-400 mt-0.5">
                <Link href="/rides/new" className="text-indigo-600 hover:underline">Create a ride</Link> to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Ride
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Route
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                      Driver
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                      Vehicle
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.todayRidesList.map((ride) => {
                    const hasKashaf = ride.kashafDocuments.length > 0;
                    const kashafDocId = ride.kashafDocuments[0]?.id;
                    return (
                      <tr key={ride.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">{ride.rideNumber}</p>
                            <p className="text-slate-400 text-[11px]">{ride._count.passengers} pax</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                            <MapPin className="h-3 w-3 text-slate-300 shrink-0" />
                            <span className="font-medium truncate max-w-[100px]">{ride.pickup}</span>
                            <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                            <span className="truncate max-w-[100px]">{ride.destination}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          {ride.driver?.name ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 shrink-0">
                                {ride.driver.name.charAt(0)}
                              </div>
                              <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                                {ride.driver.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          {ride.vehicle ? (
                            <div className="text-xs">
                              <p className="font-medium text-slate-700">{ride.vehicle.make} {ride.vehicle.model}</p>
                              <p className="text-slate-400 font-mono text-[11px]">{ride.vehicle.plateNumber}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant(ride.status)}>
                            <StatusDot status={statusDot(ride.status)} />
                            {ride.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasKashaf && kashafDocId && (
                              <a
                                href={`/api/documents/${kashafDocId}?download=true`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <Download className="h-3 w-3" /> PDF
                              </a>
                            )}
                            <Link
                              href={`/rides/${ride.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              Open <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
