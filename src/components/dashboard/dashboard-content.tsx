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
  ScanSearch,
  Download,
  Sparkles,
  Clock,
  Layers,
} from "lucide-react";
import {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  LoadingSpinner,
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

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "IN_PROGRESS":
      return "info" as const;
    case "CANCELLED":
      return "danger" as const;
    default:
      return "warning" as const;
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "✓";
    case "IN_PROGRESS":
      return "●";
    case "CANCELLED":
      return "✕";
    default:
      return "○";
  }
};

export function DashboardContent({ initialData }: { initialData?: DashboardData }) {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

  const userName = session?.user?.name || "Operator";

  useEffect(() => {
    if (initialData) return;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((payload) => {
        if (payload && typeof payload.totalRides === "number") setData(payload);
      })
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 right-24 h-48 w-48 rounded-full bg-purple-500/20 blur-xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Transport Operations Hub
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Welcome back, {userName}
            </h1>
            <p className="mt-2 text-sm text-indigo-100 sm:text-base leading-relaxed">
              Schedule transport rides, auto-assign drivers and fleet vehicles, scan visas in bulk,
              and generate official Kashaf PDFs instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/rides/new">
              <Button className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-[1.02]">
                <Plus className="h-4 w-4 mr-2 text-indigo-700 stroke-[2.5]" />
                Create Ride
              </Button>
            </Link>
            <Link href="/rides/new">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all"
              >
                <ScanSearch className="h-4 w-4 mr-2" />
                Scan Visas
              </Button>
            </Link>
            <Link href="/documents">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                Kashaf Documents
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 uppercase tracking-wide">
            Quick Actions
          </h2>
          <span className="text-xs text-slate-500">Shortcuts to daily dispatch workflows</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/rides/new"
            className="group relative flex flex-col justify-between rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-110">
                <Car className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Schedule New Ride
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Create a transport trip, assign driver & auto-fill vehicle details.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <span>Start ride setup</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/passengers"
            className="group relative flex flex-col justify-between rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition-transform group-hover:scale-110">
                <ScanSearch className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Import Visa Documents
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Scan single or multiple visa PDFs to add traveler records at once.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span>Open visa scanner</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/documents"
            className="group relative flex flex-col justify-between rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm transition-transform group-hover:scale-110">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                Kashaf Documents
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                View, reprint, or download generated official transport Kashafs.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600">
              <span>Browse documents</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/drivers"
            className="group relative flex flex-col justify-between rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-300 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm transition-transform group-hover:scale-110">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
                Fleet & Drivers
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Manage active drivers, vehicle assignments, and fleet readiness.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600">
              <span>View fleet & crew</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* KPI Stats - Interactive Clickable Cards */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 uppercase tracking-wide">
            Operational Metrics
          </h2>
          <span className="text-xs text-slate-500">Click any card to view records</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Rides"
            value={data.totalRides}
            icon={Car}
            href="/rides"
            actionLabel="View all rides"
            className="border-l-4 border-l-indigo-500"
          />
          <StatCard
            title="Today's Rides"
            value={data.todayRides}
            icon={Calendar}
            trend={`${data.upcomingRides} upcoming today`}
            href="/rides"
            actionLabel="View today's schedule"
            className="border-l-4 border-l-emerald-500"
          />
          <StatCard
            title="Completed Rides"
            value={data.completedRides}
            icon={CheckCircle2}
            href="/rides?status=COMPLETED"
            actionLabel="View completed rides"
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title="Kashaf Documents"
            value={data.kashafDocuments}
            icon={FileText}
            href="/documents"
            actionLabel="View PDF documents"
            className="border-l-4 border-l-amber-500"
          />
        </div>

        {/* Secondary Stats */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Active Drivers"
            value={data.totalDrivers}
            icon={Users}
            href="/drivers"
            actionLabel="Manage drivers"
            className="border-l-4 border-l-purple-500"
          />
          <StatCard
            title="Fleet Vehicles"
            value={data.totalVehicles}
            icon={Truck}
            href="/vehicles"
            actionLabel="Manage fleet"
            className="border-l-4 border-l-cyan-500"
          />
          <StatCard
            title="Passengers"
            value={data.totalPassengers}
            icon={UserCircle}
            href="/passengers"
            actionLabel="Manage passengers"
            className="border-l-4 border-l-pink-500"
          />
        </div>
      </div>

      {/* Today's Rides Section */}
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 py-4 px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">Today&apos;s Scheduled Rides</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="bg-indigo-50 text-indigo-700 border border-indigo-200">
                {data.todayRidesList.length} ride{data.todayRidesList.length === 1 ? "" : "s"} today
              </Badge>
              <Link href="/rides/new">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  New Ride
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.todayRidesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No rides scheduled for today</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                Get started by scheduling a new ride or creating assignments for your fleet.
              </p>
              <Link href="/rides/new" className="mt-5">
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" /> Schedule First Ride
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Ride #</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" /> Route
                      </div>
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Driver</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Vehicle</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Passengers</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Kashaf</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.todayRidesList.map((ride) => {
                    const hasKashaf = ride.kashafDocuments.length > 0;
                    const kashafDocId = ride.kashafDocuments[0]?.id;

                    return (
                      <tr
                        key={ride.id}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
                            {ride.rideNumber}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="font-medium truncate max-w-[130px]">{ride.pickup}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-medium truncate max-w-[130px]">{ride.destination}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {ride.driver?.name ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                                {ride.driver.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{ride.driver.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {ride.vehicle ? (
                            <div className="text-xs">
                              <div className="font-medium text-slate-800">
                                {ride.vehicle.make} {ride.vehicle.model}
                              </div>
                              <div className="text-slate-500 font-mono text-[11px]">
                                {ride.vehicle.plateNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            <Users className="h-3 w-3 text-slate-500" />
                            {ride._count.passengers}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant(ride.status)} className="font-medium">
                            <span className="mr-1">{statusIcon(ride.status)}</span>
                            {ride.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {hasKashaf ? (
                            <Badge variant="success" className="font-medium">
                              <FileText className="h-3 w-3 mr-1" /> Generated
                            </Badge>
                          ) : (
                            <Badge variant="default" className="font-medium text-slate-500">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasKashaf && kashafDocId && (
                              <a
                                href={`/api/documents/${kashafDocId}?download=true`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                                title="Download PDF"
                              >
                                <Download className="h-3.5 w-3.5 text-slate-500" />
                                PDF
                              </a>
                            )}
                            <Link
                              href={`/rides/${ride.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              Details
                              <ArrowRight className="h-3 w-3" />
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
