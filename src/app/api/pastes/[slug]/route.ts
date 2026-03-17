import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/db";
import { getAnonSession } from "@/lib/anon-session";
const EXPIRY_OPTIONS: Record<string, number> = {
  "10m": 10 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const CUSTOM_SLUG_REGEX = /^[a-zA-Z0-9-]{3,50}$/;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

async function getOwnedPaste(slug: string) {
  const paste = await prisma.paste.findUnique({ where: { slug } });
  if (!paste) {
    return { error: NextResponse.json({ error: "Paste not found" }, { status: 404 }) };
  }

  const session = await auth();
  if (session?.user?.id && paste.userId === session.user.id) {
    return { paste, isAuthenticated: true };
  }

  const anonSessionId = await getAnonSession();
  if (anonSessionId && paste.sessionOwnerId === anonSessionId) {
    return { paste, isAuthenticated: false };
  }

  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const result = await getOwnedPaste(slug);

  if ("error" in result) return result.error;
  const { paste, isAuthenticated } = result;

  const body = await request.json();
  const { content, title, expiry, customSlug, historyPublic } = body;

  // Validate content if provided
  if (content !== undefined) {
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    }
    if (Buffer.byteLength(content, "utf8") > 524288) {
      return NextResponse.json({ error: "Content exceeds 512KB limit" }, { status: 400 });
    }
  }

  // Custom slug and expiry changes require authentication
  if (customSlug !== undefined && !isAuthenticated) {
    return NextResponse.json(
      { error: "Custom slugs require an account" },
      { status: 403 }
    );
  }

  if (expiry !== undefined && !isAuthenticated) {
    return NextResponse.json(
      { error: "Changing expiry requires an account" },
      { status: 403 }
    );
  }

  if (historyPublic !== undefined && !isAuthenticated) {
    return NextResponse.json(
      { error: "Changing history visibility requires an account" },
      { status: 403 }
    );
  }

  // Validate custom slug format
  if (customSlug !== undefined && customSlug !== null) {
    if (typeof customSlug !== "string" || !CUSTOM_SLUG_REGEX.test(customSlug)) {
      return NextResponse.json(
        { error: "Slug must be 3-50 characters, alphanumeric and hyphens only" },
        { status: 400 }
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (content !== undefined) updateData.content = content;
  if (title !== undefined) updateData.title = title || null;
  if (customSlug !== undefined) updateData.slug = customSlug;
  if (historyPublic !== undefined) updateData.historyPublic = Boolean(historyPublic);

  if (expiry !== undefined) {
    if (expiry === "" || expiry === null) {
      updateData.expiresAt = null; // Remove expiry
    } else if (EXPIRY_OPTIONS[expiry]) {
      updateData.expiresAt = new Date(Date.now() + EXPIRY_OPTIONS[expiry]);
    } else {
      return NextResponse.json({ error: "Invalid expiry option" }, { status: 400 });
    }
  }

  // Use a transaction if content changed (need to create version)
  if (content !== undefined && content !== paste.content) {
    const session = await auth();
    const anonSessionId = await getAnonSession();
    const editorId = session?.user?.id ?? anonSessionId ?? null;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        // Create version snapshot of the old content
        await tx.pasteVersion.create({
          data: {
            pasteId: paste.id,
            content: paste.content,
            editorId,
          },
        });

        // Enforce 10-version cap: count and delete oldest if over
        const versionCount = await tx.pasteVersion.count({
          where: { pasteId: paste.id },
        });

        if (versionCount > 10) {
          const oldest = await tx.pasteVersion.findFirst({
            where: { pasteId: paste.id },
            orderBy: { createdAt: "asc" },
          });
          if (oldest) {
            await tx.pasteVersion.delete({ where: { id: oldest.id } });
          }
        }

        // Update the paste
        return tx.paste.update({
          where: { id: paste.id },
          data: updateData,
        });
      });

      return NextResponse.json({ slug: updated.slug, url: `/${updated.slug}` });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
      }
      throw error;
    }
  }

  // No content change — simple update (no version created)
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ slug: paste.slug, url: `/${paste.slug}` });
  }

  try {
    const updated = await prisma.paste.update({
      where: { id: paste.id },
      data: updateData,
    });
    return NextResponse.json({ slug: updated.slug, url: `/${updated.slug}` });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const result = await getOwnedPaste(slug);

  if ("error" in result) return result.error;
  const { paste } = result;

  // Cascade delete handles versions automatically (onDelete: Cascade in schema)
  await prisma.paste.delete({ where: { id: paste.id } });

  return NextResponse.json({ deleted: true });
}
