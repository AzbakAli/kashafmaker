import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { updateDriver, getDriverDetails } from "@/services/drivers";
import { driverSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const driver = await getDriverDetails(id);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(driver, {
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
    const data = driverSchema.parse(body);
    const driver = await updateDriver(id, data);
    return NextResponse.json(driver);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update driver";
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
    const status = body.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
    const driver = await prisma.driver.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json(driver);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update driver status";
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
      const driver = await prisma.driver.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({ success: true, driver, disabled: true });
    }

    // Permanent hard delete from database
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete driver";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
