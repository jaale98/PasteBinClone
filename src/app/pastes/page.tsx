import { prisma } from "@/lib/db";
import { auth } from "../../../auth";
import { getAnonSession } from "@/lib/anon-session";
import Link from "next/link";
import CopyLinkButton from "@/app/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function MyPastesPage() {
  const session = await auth();
  const anonSessionId = await getAnonSession();

  const isAuthenticated = !!session?.user?.id;

  let pastes: {
    slug: string;
    title: string | null;
    createdAt: Date;
    expiresAt: Date | null;
  }[] = [];

  if (isAuthenticated) {
    pastes = await prisma.paste.findMany({
      where: { userId: session.user!.id },
      select: { slug: true, title: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  } else if (anonSessionId) {
    pastes = await prisma.paste.findMany({
      where: { sessionOwnerId: anonSessionId },
      select: { slug: true, title: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  const now = new Date();

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            My Pastes
          </h1>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
            {isAuthenticated
              ? `${pastes.length} paste${pastes.length !== 1 ? "s" : ""}`
              : "Pastes from your current session"}
          </p>
        </div>

        {pastes.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
            <p className="text-zinc-400 dark:text-zinc-500">
              No pastes yet.{" "}
              <Link
                href="/"
                className="text-indigo-500 underline decoration-indigo-200 underline-offset-2 transition-colors hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
              >
                Create one
              </Link>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pastes.map((paste) => {
              const isExpired =
                paste.expiresAt && paste.expiresAt < now;
              return (
                <div
                  key={paste.slug}
                  className="group flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-zinc-100 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${paste.slug}`}
                      className="text-sm font-medium text-zinc-700 transition-colors hover:text-indigo-500 dark:text-zinc-300 dark:hover:text-indigo-400"
                    >
                      {paste.title || "Untitled"}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      <span className="font-mono">/{paste.slug}</span>
                      <span>
                        ·{" "}
                        {paste.createdAt.toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                      {isExpired && (
                        <span className="font-medium text-red-400 dark:text-red-500">
                          · Expired
                        </span>
                      )}
                      {paste.expiresAt && !isExpired && (
                        <span>
                          · Expires{" "}
                          {paste.expiresAt.toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "UTC",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 shrink-0">
                    <CopyLinkButton slug={paste.slug} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isAuthenticated && pastes.length > 0 && (
          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            These are pastes from your current browser session.{" "}
            <Link
              href="/auth/register"
              className="text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
            >
              Create an account
            </Link>{" "}
            to keep them permanently.
          </p>
        )}
      </main>
    </div>
  );
}
