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

  return NextResponse.json(passengers);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = passengerSchema.parse(body);
    const passenger = await prisma.passenger.create({ data });
    return NextResponse.json(passenger, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create passenger";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
