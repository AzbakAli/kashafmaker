import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@kashafmake.com" },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" });
    }

    const testPassword = "admin123";
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);

    return NextResponse.json({
      userExists: true,
      email: user.email,
      passwordHashPrefix: user.passwordHash.substring(0, 10),
      passwordHashLength: user.passwordHash.length,
      passwordValid: isValid,
      isActive: user.isActive,
    });
  } catch (error) {
    return NextResponse.json({
      error: "Debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
