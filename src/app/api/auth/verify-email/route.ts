import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    if (verificationToken) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
    }
    return NextResponse.json(
      { error: "Invalid or expired verification link" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    }),
  ]);

  return NextResponse.json({ message: "Email verified successfully" });
}
