import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "settings")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: {} });
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "settings")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  let settings = await prisma.systemSettings.findFirst();

  if (body.defaultTemplateId) {
    await prisma.kashafTemplate.updateMany({ data: { isDefault: false } });
    await prisma.kashafTemplate.update({
      where: { id: body.defaultTemplateId },
      data: { isDefault: true },
    });
  }

  if (settings) {
    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        defaultTemplateId: body.defaultTemplateId || null,
        defaultFont: body.defaultFont,
        arabicFont: body.arabicFont,
        pdfSettings: body.pdfSettings,
      },
    });
  } else {
    settings = await prisma.systemSettings.create({ data: body });
  }

  return NextResponse.json(settings);
}
