"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, PageHeader, LoadingSpinner } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

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

export function DashboardContent({ initialData }: { initialData?: DashboardData }) {
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

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
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your transport operations"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/rides/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" /> Create Ride
              </Button>
            </Link>
            <Link href="/drivers">
              <Button variant="outline" className="border-slate-300 hover:bg-slate-50">
                <Users className="h-4 w-4 mr-2" /> Add Driver
              </Button>
            </Link>
            <Link href="/vehicles">
              <Button variant="outline" className="border-slate-300 hover:bg-slate-50">
                <Truck className="h-4 w-4 mr-2" /> Add Vehicle
              </Button>
            </Link>
            <Link href="/passengers">
              <Button variant="outline" className="border-slate-300 hover:bg-slate-50">
                <UserCircle className="h-4 w-4 mr-2" /> Add Passenger
              </Button>
            </Link>
            <Link href="/rides">
              <Button variant="outline" className="border-slate-300 hover:bg-slate-50">
                <FileText className="h-4 w-4 mr-2" /> Generate Kashaf
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Rides"
          value={data.totalRides}
          icon={Car}
          className="border-l-4 border-l-indigo-500"
        />
        <StatCard
          title="Today's Rides"
          value={data.todayRides}
          icon={Calendar}
          trend={`${data.upcomingRides} upcoming`}
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title="Completed Rides"
          value={data.completedRides}
          icon={Car}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Kashaf Documents"
          value={data.kashafDocuments}
          icon={FileText}
          className="border-l-4 border-l-amber-500"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Drivers"
          value={data.totalDrivers}
          icon={Users}
          className="border-l-4 border-l-purple-500"
        />
        <StatCard
          title="Vehicles"
          value={data.totalVehicles}
          icon={Truck}
          className="border-l-4 border-l-cyan-500"
        />
        <StatCard
          title="Passengers"
          value={data.totalPassengers}
          icon={UserCircle}
          className="border-l-4 border-l-pink-500"
        />
      </div>

      {/* Today's Rides */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today&apos;s Rides</CardTitle>
            <Badge variant="info" className="bg-indigo-100 text-indigo-700">
              {data.todayRidesList.length} rides
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.todayRidesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No rides scheduled for today</h3>
              <p className="mt-1 text-sm text-slate-500">Create a new ride to get started</p>
              <Link href="/rides/new" className="mt-4">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" /> Create Ride
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ride #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Route
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Driver</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Vehicle</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Passengers</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Kashaf</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayRidesList.map((ride) => (
                    <tr
                      key={ride.id}
                      className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {ride.rideNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-600">
                          <span className="truncate max-w-[120px]">{ride.pickup}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{ride.destination}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ride.driver?.name || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ride.vehicle ? (
                          <div className="text-xs">
                            <div className="font-medium">{ride.vehicle.make} {ride.vehicle.model}</div>
                            <div className="text-slate-500">{ride.vehicle.plateNumber}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" />
                          <span className="font-medium text-slate-900">{ride._count.passengers}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(ride.status)} className="font-medium">
                          <span className="mr-1">{statusIcon(ride.status)}</span>
                          {ride.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {ride.kashafDocuments.length > 0 ? (
                          <Badge variant="success" className="font-medium">
                            <FileText className="h-3 w-3 mr-1" /> Generated
                          </Badge>
                        ) : (
                          <Badge variant="default" className="font-medium">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/rides/${ride.id}`}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                        >
                          View Details
                          <ArrowRight className="h-3 w-3 ml-1" />
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
  );
}
