import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriverWithVehicle } from "@/services/rides";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await getDriverWithVehicle(id);
  return NextResponse.json(result);
}
