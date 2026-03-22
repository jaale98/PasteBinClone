import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "../../../auth";
import { getAnonSession } from "@/lib/anon-session";
import DeleteButton from "@/app/components/DeleteButton";
import CopyLinkButton from "@/app/components/CopyLinkButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PasteViewPage({ params }: Props) {
  const { slug } = await params;

  const paste = await prisma.paste.findUnique({ where: { slug } });
  if (!paste) notFound();

  const isExpired = paste.expiresAt && paste.expiresAt < new Date();

  if (isExpired) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
        <main className="w-full max-w-2xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
            {paste.title && (
              <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                {paste.title}
              </h1>
            )}
            <p className="mb-4 text-lg text-zinc-400 dark:text-zinc-500">
              This paste has expired.
            </p>
            <p className="text-sm text-zinc-300 dark:text-zinc-600">
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

  const session = await auth();
  const anonSessionId = await getAnonSession();

  const isOwner =
    (session?.user?.id && paste.userId === session.user.id) ||
    (anonSessionId && paste.sessionOwnerId === anonSessionId);

  const showHistory = paste.historyPublic || isOwner;
  const versionCount = showHistory
    ? await prisma.pasteVersion.count({ where: { pasteId: paste.id } })
    : 0;

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              {paste.title || "Untitled"}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-400 dark:text-zinc-500">
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
          <div className="flex gap-2">
            <CopyLinkButton slug={slug} />
            {isOwner && (
              <>
                <a
                  href={`/${slug}/edit`}
                  className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.97] dark:shadow-none dark:hover:bg-indigo-400"
                >
                  Edit
                </a>
                <DeleteButton slug={slug} />
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-5 font-mono text-sm leading-relaxed text-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800/60">
          {paste.content}
        </pre>

        {/* Version history link */}
        {showHistory && versionCount > 0 && (
          <div className="mt-3">
            <a
              href={`/${slug}/versions`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              {versionCount} {versionCount === 1 ? "version" : "versions"}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
