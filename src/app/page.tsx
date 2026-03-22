import PasteForm from "./components/PasteForm";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          New Paste
        </h1>
        <PasteForm />
      </main>
    </div>
  );
}
