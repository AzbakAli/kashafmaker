import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { passengerSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const passenger = await prisma.passenger.findUnique({
    where: { id },
    include: {
      ridePassengers: {
        include: { ride: { include: { driver: true, vehicle: true } } },
        orderBy: { ride: { date: "desc" } },
      },
    },
  });

  if (!passenger) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(passenger);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const raw = await request.json();
    const cleaned = {
      fullName: (raw.fullName || "").trim(),
      passportNumber: raw.passportNumber ? String(raw.passportNumber).trim() : null,
      nationality: raw.nationality ? String(raw.nationality).trim() : null,
      gender: raw.gender && ["MALE", "FEMALE", "OTHER"].includes(raw.gender) ? raw.gender : null,
      visaType: raw.visaType ? String(raw.visaType).trim() : null,
      iqamaNumber: raw.iqamaNumber ? String(raw.iqamaNumber).trim() : null,
      phone: raw.phone ? String(raw.phone).trim() : null,
      notes: null,
    };
    const data = passengerSchema.parse(cleaned);
    const passenger = await prisma.passenger.update({ where: { id }, data });
    return NextResponse.json(passenger);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update passenger";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const PATCH = PUT;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.passenger.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
