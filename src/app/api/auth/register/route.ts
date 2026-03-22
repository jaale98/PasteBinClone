import { NextResponse } from "next/server";
import crypto from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { PrismaClientKnownRequestError } from "@/generated/prisma/internal/prismaNamespace";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: false },
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch {
      // Don't block registration if email fails
    }

    return NextResponse.json(
      { message: "Account created. Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }
    throw error;
  }
}
