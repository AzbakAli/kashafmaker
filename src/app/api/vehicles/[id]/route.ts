import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { updateVehicle, getVehicleDetails } from "@/services/vehicles";
import { vehicleSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await getVehicleDetails(id);
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vehicle, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const data = vehicleSchema.parse(body);
    const vehicle = await updateVehicle(id, data);
    return NextResponse.json(vehicle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update vehicle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const validStatuses = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"] as const;
    const status = validStatuses.includes(body.status) ? body.status : "INACTIVE";
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json(vehicle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update vehicle status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "disable") {
      // Disable (Soft delete / Set Inactive)
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({ success: true, vehicle, disabled: true });
    }

    // Permanent hard delete from database
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete vehicle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
