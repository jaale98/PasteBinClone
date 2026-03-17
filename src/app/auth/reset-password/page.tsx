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
      <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
        <main className="w-full max-w-sm">
          <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Invalid link
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This reset link is invalid. Please request a new one.
          </p>
          <p className="mt-4">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-zinc-900 underline dark:text-zinc-100"
            >
              Request new reset link
            </Link>
          </p>
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
      <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
        <main className="w-full max-w-sm">
          <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Password reset
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your password has been updated. You can now log in with your new
            password.
          </p>
          <p className="mt-4">
            <Link
              href="/auth/login"
              className="text-sm text-zinc-900 underline dark:text-zinc-100"
            >
              Log in
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500";

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
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
            className="rounded bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </main>
    </div>
  );
}
