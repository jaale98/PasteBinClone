import { NextResponse } from "next/server";
import crypto from "crypto";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/db";
import { getAnonSession, setAnonSessionCookie } from "@/lib/anon-session";

const EXPIRY_OPTIONS: Record<string, number> = {
  "10m": 10 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function generateSlug(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    slug += chars[bytes[i] % chars.length];
  }
  return slug;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { content, title, expiry } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(content, "utf8") > 524288) {
    return NextResponse.json(
      { error: "Content exceeds 512KB limit" },
      { status: 400 }
    );
  }

  const expiresAt =
    expiry && EXPIRY_OPTIONS[expiry]
      ? new Date(Date.now() + EXPIRY_OPTIONS[expiry])
      : null;

  const slug = generateSlug();
  const session = await auth();

  let pasteData: {
    slug: string;
    content: string;
    title?: string;
    expiresAt: Date | null;
    userId?: string;
    sessionOwnerId?: string;
    claimToken?: string;
  } = {
    slug,
    content,
    expiresAt,
  };

  if (title && typeof title === "string") {
    pasteData.title = title;
  }

  let isAnonymous = false;

  if (session?.user?.id) {
    pasteData.userId = session.user.id;
  } else {
    isAnonymous = true;
    const existingAnonSession = await getAnonSession();
    const anonSessionId = existingAnonSession ?? createId();
    pasteData.sessionOwnerId = anonSessionId;
    pasteData.claimToken = crypto.randomUUID();
  }

  const paste = await prisma.paste.create({ data: pasteData });

  const responseBody = {
    slug: paste.slug,
    url: `/${paste.slug}`,
  };

  const response = NextResponse.json(responseBody, { status: 201 });

  if (isAnonymous) {
    const existingAnonSession = await getAnonSession();
    if (!existingAnonSession) {
      setAnonSessionCookie(response, pasteData.sessionOwnerId);
    }
  }

  return response;
}
