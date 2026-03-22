import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "../../../../auth";
import { getAnonSession } from "@/lib/anon-session";
import PasteForm from "@/app/components/PasteForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditPastePage({ params }: Props) {
  const { slug } = await params;

  const paste = await prisma.paste.findUnique({ where: { slug } });
  if (!paste) notFound();

  const session = await auth();
  const anonSessionId = await getAnonSession();

  const isAuthOwner = !!(session?.user?.id && paste.userId === session.user.id);
  const isAnonOwner = !!(anonSessionId && paste.sessionOwnerId === anonSessionId);

  if (!isAuthOwner && !isAnonOwner) {
    redirect(`/${slug}`);
  }

  if (paste.expiresAt && paste.expiresAt < new Date()) {
    redirect(`/${slug}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Edit Paste
          </h1>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
          <PasteForm
            mode="edit"
            slug={slug}
            initialTitle={paste.title ?? ""}
            initialContent={paste.content}
            initialSlug={slug}
            initialHistoryPublic={paste.historyPublic}
            isAuthenticated={isAuthOwner}
          />
        </div>
      </main>
    </div>
  );
}
