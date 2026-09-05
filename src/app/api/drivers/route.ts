import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { searchDrivers, createDriver } from "@/services/drivers";
import { driverSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const drivers = await searchDrivers(
    searchParams.get("q") || undefined,
    searchParams.get("status") || undefined
  );
  return NextResponse.json(drivers);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = driverSchema.parse(body);
    const driver = await createDriver(data);
    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create driver";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
