import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { companySchema } from "@/lib/validation/schemas";
import { saveFile, validateImageFile } from "@/lib/storage";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findFirst({ where: { isDefault: true } });
  return NextResponse.json(company);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const logo = formData.get("logo") as File | null;
      const dataStr = formData.get("data") as string;
      const data = companySchema.parse(JSON.parse(dataStr));

      let logoPath: string | undefined;
      if (logo && logo.size > 0) {
        const buffer = Buffer.from(await logo.arrayBuffer());
        const validation = validateImageFile(buffer);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        logoPath = await saveFile("logos", buffer, logo.name);
      }

      const existing = await prisma.company.findFirst({ where: { isDefault: true } });
      const company = existing
        ? await prisma.company.update({
            where: { id: existing.id },
            data: { ...data, ...(logoPath ? { logoPath } : {}) },
          })
        : await prisma.company.create({
            data: { ...data, isDefault: true, ...(logoPath ? { logoPath } : {}) },
          });

      return NextResponse.json(company);
    }

    const body = await request.json();
    const data = companySchema.parse(body);

    const existing = await prisma.company.findFirst({ where: { isDefault: true } });
    const company = existing
      ? await prisma.company.update({ where: { id: existing.id }, data })
      : await prisma.company.create({ data: { ...data, isDefault: true } });

    return NextResponse.json(company);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update company";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
