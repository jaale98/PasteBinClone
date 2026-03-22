import PasteForm from "./components/PasteForm";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            New Paste
          </h1>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
            Share text instantly. No account required.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
          <PasteForm />
        </div>
      </main>
    </div>
  );
}
