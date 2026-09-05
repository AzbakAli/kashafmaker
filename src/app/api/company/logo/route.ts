import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { readFile } from "@/lib/storage";
import path from "path";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findFirst({ where: { isDefault: true } });
  if (!company?.logoPath) return NextResponse.json({ error: "No logo" }, { status: 404 });

  const buffer = await readFile(company.logoPath);
  const ext = path.extname(company.logoPath).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=60" },
  });
}
