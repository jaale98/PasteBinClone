import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-md text-center">
        <p className="text-6xl font-bold tracking-tight text-zinc-200 dark:text-zinc-800">
          404
        </p>
        <p className="mt-4 text-zinc-400 dark:text-zinc-500">
          This paste doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] dark:shadow-none dark:hover:bg-indigo-400"
        >
          Create a new paste
        </Link>
      </main>
    </div>
  );
}
