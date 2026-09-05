import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { readFile, deleteFile } from "@/lib/storage";

async function servePdf(id: string, download: boolean) {
  const document = await prisma.kashafDocument.findUnique({ where: { id } });
  if (!document?.filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buffer = await readFile(document.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.documentNumber}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF file is missing on disk" }, { status: 404 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";
  const pdf = request.nextUrl.searchParams.get("pdf") === "1";

  if (download || pdf) {
    return servePdf(id, download);
  }

  const document = await prisma.kashafDocument.findUnique({
    where: { id },
    include: {
      ride: { include: { driver: true, vehicle: true, passengers: { include: { passenger: true } } } },
      template: true,
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(document);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.kashafDocument.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (document.filePath) {
    await deleteFile(document.filePath);
  }
  await prisma.kashafDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body.action !== "regenerate") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const existing = await prisma.kashafDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { generateKashafForRide } = await import("@/services/rides");
  try {
    const document = await generateKashafForRide(existing.rideId, existing.templateId);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
