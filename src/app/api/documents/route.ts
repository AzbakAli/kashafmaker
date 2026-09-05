import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateKashafForRide } from "@/services/rides";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const documents = await prisma.kashafDocument.findMany({
    where: query
      ? {
          OR: [
            { documentNumber: { contains: query } },
            { ride: { rideNumber: { contains: query } } },
            { ride: { driver: { name: { contains: query } } } },
          ],
        }
      : {},
    include: {
      ride: { include: { driver: true, vehicle: true } },
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const document = await generateKashafForRide(body.rideId, body.templateId);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate document";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
