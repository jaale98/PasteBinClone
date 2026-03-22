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
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Version History
            </h1>
            {paste.title && (
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                {paste.title}
              </p>
            )}
          </div>
          <a
            href={`/${slug}`}
            className="rounded-full px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            Back to paste
          </a>
        </div>

        {versions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No version history yet. Versions are created when the paste is
              edited.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Version {versions.length - index}
                  </span>
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">
                    {version.createdAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
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
