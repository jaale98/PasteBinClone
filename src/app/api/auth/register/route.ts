import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { PrismaClientKnownRequestError } from "@/generated/prisma/internal/prismaNamespace";
import { getAnonSession } from "@/lib/anon-session";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // Claim anonymous pastes from the current session
    const anonSessionId = await getAnonSession();
    if (anonSessionId) {
      await prisma.paste.updateMany({
        where: { sessionOwnerId: anonSessionId },
        data: {
          userId: user.id,
          sessionOwnerId: null,
          claimToken: null,
        },
      });
    }

    const response = NextResponse.json(
      { id: user.id, email: user.email },
      { status: 201 }
    );

    // Clear the anon-session cookie after claiming
    if (anonSessionId) {
      response.headers.append(
        "Set-Cookie",
        "anon-session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/"
      );
    }

    return response;
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
