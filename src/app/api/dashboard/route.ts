import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/services/rides";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Dashboard stats retrieval failed:", error);
    return NextResponse.json({
      totalRides: 0,
      todayRides: 0,
      upcomingRides: 0,
      completedRides: 0,
      totalDrivers: 0,
      totalVehicles: 0,
      totalPassengers: 0,
      kashafDocuments: 0,
      todayRidesList: [],
    });
  }
}
