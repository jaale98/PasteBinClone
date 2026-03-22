import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-md text-center">
        <h1 className="mb-2 text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          404
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          This paste doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/"
          className="rounded bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Create a new paste
        </Link>
      </main>
    </div>
  );
}
