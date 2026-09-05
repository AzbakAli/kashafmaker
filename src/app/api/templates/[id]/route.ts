import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { TemplateFieldConfig } from "@/lib/pdf/types";
import { generateKashafPdf, getSampleContext, getNbisKashafFieldConfig, isNbisStyleTemplate } from "@/lib/pdf";
import { readFile } from "@/lib/storage";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.kashafTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (request.nextUrl.searchParams.get("pdf") === "1") {
    try {
      const buffer = await readFile(template.filePath);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${path.basename(template.filePath)}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Template PDF is missing on disk" }, { status: 404 });
    }
  }

  return NextResponse.json(template);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "templates")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (body.fieldConfig) {
    const template = await prisma.kashafTemplate.update({
      where: { id },
      data: { fieldConfig: body.fieldConfig },
    });
    return NextResponse.json(template);
  }

  if (body.isDefault) {
    await prisma.kashafTemplate.updateMany({ data: { isDefault: false } });
  }

  const template = await prisma.kashafTemplate.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      isActive: body.isActive,
      isDefault: body.isDefault,
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "templates")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.kashafTemplate.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "templates")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const template = await prisma.kashafTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const fieldConfig = isNbisStyleTemplate(template.pageCount)
    ? getNbisKashafFieldConfig()
    : ((body.fieldConfig || template.fieldConfig) as unknown as TemplateFieldConfig);
  const context = getSampleContext();

  const pdfBytes = await generateKashafPdf(template.filePath, fieldConfig, context);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=preview.pdf",
    },
  });
}
