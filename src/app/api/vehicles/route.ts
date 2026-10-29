import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { searchVehicles, createVehicle } from "@/services/vehicles";
import { vehicleSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const excludeInactive = searchParams.get("excludeInactive") === "true";
  const vehicles = await searchVehicles(
    searchParams.get("q") || undefined,
    searchParams.get("status") || undefined,
    excludeInactive
  );
  return NextResponse.json(vehicles, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = vehicleSchema.parse(body);
    const vehicle = await createVehicle(data);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create vehicle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
