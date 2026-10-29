import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { passengerSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const passengers = await prisma.passenger.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { passportNumber: { contains: query, mode: "insensitive" } },
            { nationality: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { fullName: "asc" },
    take: 300,
  });

  return NextResponse.json(passengers, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const passenger = await prisma.passenger.create({ data });
    return NextResponse.json(passenger, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create passenger";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
