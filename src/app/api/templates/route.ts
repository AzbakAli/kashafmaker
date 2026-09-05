import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { saveFile, validatePdfFile } from "@/lib/storage";
import { getNbisKashafFieldConfig, isNbisStyleTemplate } from "@/lib/pdf";
import { templateSchema } from "@/lib/validation/schemas";
import { PDFDocument } from "pdf-lib";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.kashafTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "templates")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const dataStr = formData.get("data") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    const data = templateSchema.parse(JSON.parse(dataStr || "{}"));
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validatePdfFile(buffer, 40);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    let pageCount = 1;
    let pageWidth = 612;
    let pageHeight = 792;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      const size = pdfDoc.getPage(0).getSize();
      pageWidth = size.width;
      pageHeight = size.height;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read this PDF";
      return NextResponse.json(
        { error: `This PDF could not be opened (${message}). Try exporting it again as a standard PDF.` },
        { status: 400 }
      );
    }

    const filePath = await saveFile("templates", buffer, file.name || "kashaf.pdf");

    if (data.isDefault) {
      await prisma.kashafTemplate.updateMany({ data: { isDefault: false } });
    }

    const fieldConfig = isNbisStyleTemplate(pageCount, pageWidth, pageHeight)
      ? getNbisKashafFieldConfig()
      : { fields: [] };

    const template = await prisma.kashafTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        filePath,
        pageCount,
        isActive: data.isActive,
        isDefault: data.isDefault,
        fieldConfig: fieldConfig as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
