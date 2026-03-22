"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email) {
      setError("Email is required");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 ring-1 ring-zinc-200/80 transition-all focus:bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-200 dark:placeholder-zinc-500 dark:ring-zinc-700/60 dark:focus:bg-zinc-800 dark:focus:ring-indigo-500/40";

  if (sent) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
        <main className="w-full max-w-sm">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
            <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Check your email
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
              If an account with that email exists, we&apos;ve sent a password
              reset link. The link expires in 1 hour.
            </p>
            <p className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <Link
                href="/auth/login"
                className="text-sm text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
              >
                Back to login
              </Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Reset password
          </h1>
          <p className="mb-6 text-sm text-zinc-400 dark:text-zinc-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              autoComplete="email"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-none dark:hover:bg-indigo-400"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/30">
                {error}
              </p>
            )}
          </form>
          <p className="mt-5 border-t border-zinc-100 pt-5 text-sm dark:border-zinc-800">
            <Link
              href="/auth/login"
              className="text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
            >
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
