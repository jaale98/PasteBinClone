import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "../../../auth";
import { getAnonSession } from "@/lib/anon-session";
import DeleteButton from "@/app/components/DeleteButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PasteViewPage({ params }: Props) {
  const { slug } = await params;

  const paste = await prisma.paste.findUnique({ where: { slug } });
  if (!paste) notFound();

  // Check if expired
  const isExpired = paste.expiresAt && paste.expiresAt < new Date();

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
        <main className="w-full max-w-2xl">
          <div className="rounded border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            {paste.title && (
              <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {paste.title}
              </h1>
            )}
            <p className="mb-4 text-lg text-zinc-600 dark:text-zinc-400">
              This paste has expired.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Expired{" "}
              {paste.expiresAt!.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              })}{" "}
              UTC
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Determine ownership for showing controls
  const session = await auth();
  const anonSessionId = await getAnonSession();

  const isOwner =
    (session?.user?.id && paste.userId === session.user.id) ||
    (anonSessionId && paste.sessionOwnerId === anonSessionId);

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {paste.title || "Untitled"}
            </h1>
            <div className="mt-1 flex gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span>
                Created{" "}
                {paste.createdAt.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </span>
              {paste.expiresAt && (
                <span>
                  · Expires{" "}
                  {paste.expiresAt.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </span>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <a
                href={`/${slug}/edit`}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Edit
              </a>
              <DeleteButton slug={slug} />
            </div>
          )}
        </div>

        {/* Content */}
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded border border-zinc-200 bg-white p-4 font-mono text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          {paste.content}
        </pre>
      </main>
    </div>
  );
}

