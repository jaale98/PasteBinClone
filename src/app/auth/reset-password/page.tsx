"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
        <main className="w-full max-w-sm">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
            <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Invalid link
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              This reset link is invalid. Please request a new one.
            </p>
            <p className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
              >
                Request new reset link
              </Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
        <main className="w-full max-w-sm">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
            <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Password reset
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Your password has been updated. You can now log in with your new
              password.
            </p>
            <p className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <Link
                href="/auth/login"
                className="text-sm text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
              >
                Log in
              </Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 ring-1 ring-zinc-200/80 transition-all focus:bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-200 dark:placeholder-zinc-500 dark:ring-zinc-700/60 dark:focus:bg-zinc-800 dark:focus:ring-indigo-500/40";

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Set new password
          </h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              name="password"
              placeholder="New password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-none dark:hover:bg-indigo-400"
            >
              {submitting ? "Resetting..." : "Reset password"}
            </button>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/30">
                {error}
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
