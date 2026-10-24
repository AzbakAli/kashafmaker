"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, MapPin, Calendar, Users, Car, ArrowRight, FileText, Trash2, Edit } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface Ride {
  id: string;
  rideNumber: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  status: string;
  driver: { name: string } | null;
  vehicle: { make: string; model: string; plateNumber: string } | null;
  kashafDocuments: Array<{ id: string }>;
  _count: { passengers: number };
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

export default function RidesPage() {
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchRides = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/rides?${params}`)
      .then((r) => r.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRides(); }, [debouncedSearch, statusFilter]);

  const deleteKashaf = async (documentId: string) => {
    if (!window.confirm("Delete this Kashaf PDF? This cannot be undone.")) return;
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (res.ok) fetchRides();
  };

  const deleteRide = async (rideId: string) => {
    if (!window.confirm("Delete this ride? This action cannot be undone.")) return;
    const res = await fetch(`/api/rides/${rideId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Ride deleted successfully", "success");
      fetchRides();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to delete ride", "error");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Rides"
        description="Manage all transport rides and trips"
        action={
          <Link href="/rides/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Create Ride
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            placeholder="Search rides by number, pickup, or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "SCHEDULED", label: "Scheduled" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : rides.length === 0 ? (
            <EmptyState
              title="No rides found"
              description={search || statusFilter ? "Try adjusting your search or filters" : "Create your first ride to get started"}
              action={
                <Link href="/rides/new">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" /> Create Ride
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ride #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Date
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Route
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Driver
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" /> Vehicle
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Passengers</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Kashaf</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {ride.rideNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(ride.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-600">
                          <span className="truncate max-w-[100px]">{ride.pickup}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[100px]">{ride.destination}</span>
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
                            <div className="font-medium text-slate-900">{ride.vehicle.make} {ride.vehicle.model}</div>
                            <div className="text-slate-500">{ride.vehicle.plateNumber}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" />
                          <span className="font-medium text-slate-900">{ride._count?.passengers ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(ride.status)} className="font-medium">
                          <span className="mr-1">{statusIcon(ride.status)}</span>
                          {ride.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {ride.kashafDocuments[0] ? (
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
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/rides/${ride.id}`}
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                          >
                            View Details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                          <Link
                            href={`/rides/${ride.id}/edit`}
                            className="inline-flex items-center text-slate-600 hover:text-slate-800 font-medium text-xs transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                          </Link>
                          {ride.kashafDocuments[0] && (
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-800 font-medium text-xs transition-colors"
                              onClick={() => deleteKashaf(ride.kashafDocuments[0].id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 font-medium text-xs transition-colors"
                            onClick={() => deleteRide(ride.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
