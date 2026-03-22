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

  // Ownership check
  const session = await auth();
  const anonSessionId = await getAnonSession();

  const isAuthOwner = !!(session?.user?.id && paste.userId === session.user.id);
  const isAnonOwner = !!(anonSessionId && paste.sessionOwnerId === anonSessionId);

  if (!isAuthOwner && !isAnonOwner) {
    redirect(`/${slug}`);
  }

  // Expired pastes cannot be edited
  if (paste.expiresAt && paste.expiresAt < new Date()) {
    redirect(`/${slug}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Edit Paste
        </h1>
        <PasteForm
          mode="edit"
          slug={slug}
          initialTitle={paste.title ?? ""}
          initialContent={paste.content}
          initialSlug={slug}
          initialHistoryPublic={paste.historyPublic}
          isAuthenticated={isAuthOwner}
        />
      </main>
    </div>
  );
}
