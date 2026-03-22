import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "../../../../auth";
import { getAnonSession } from "@/lib/anon-session";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function VersionHistoryPage({ params }: Props) {
  const { slug } = await params;

  const paste = await prisma.paste.findUnique({ where: { slug } });
  if (!paste) notFound();

  // Check visibility
  const session = await auth();
  const anonSessionId = await getAnonSession();

  const isOwner =
    (session?.user?.id && paste.userId === session.user.id) ||
    (anonSessionId && paste.sessionOwnerId === anonSessionId);

  if (!paste.historyPublic && !isOwner) {
    redirect(`/${slug}`);
  }

  const versions = await prisma.pasteVersion.findMany({
    where: { pasteId: paste.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Version History
          </h1>
          <a
            href={`/${slug}`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Back to paste
          </a>
        </div>

        {paste.title && (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {paste.title}
          </p>
        )}

        {versions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No version history yet. Versions are created when the paste is
            edited.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Version {versions.length - index}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-500">
                    {version.createdAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {version.content}
                </pre>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
