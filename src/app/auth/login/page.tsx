"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Email and password are required");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes("EMAIL_NOT_VERIFIED")) {
        setNeedsVerification(true);
        setResendEmail(email);
      } else {
        setError("Invalid email or password");
      }
      setSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleResendVerification() {
    setResent(false);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resendEmail }),
    });
    setResent(true);
  }

  const inputClass =
    "w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 ring-1 ring-zinc-200/80 transition-all focus:bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-200 dark:placeholder-zinc-500 dark:ring-zinc-700/60 dark:focus:bg-zinc-800 dark:focus:ring-indigo-500/40";

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Log in
          </h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              autoComplete="email"
              className={inputClass}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-none dark:hover:bg-indigo-400"
            >
              {submitting ? "Logging in..." : "Log in"}
            </button>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/30">
                {error}
              </p>
            )}
            {needsVerification && (
              <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200/60 dark:bg-amber-950/30 dark:ring-amber-800/40">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Your email is not verified. Please check your inbox for the
                  verification link.
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="mt-2 text-sm font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
                >
                  Resend verification email
                </button>
                {resent && (
                  <p className="mt-1 text-sm text-amber-500 dark:text-amber-400">
                    Verification email sent.
                  </p>
                )}
              </div>
            )}
          </form>
          <div className="mt-5 flex flex-col gap-2 border-t border-zinc-100 pt-5 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
              >
                Register
              </Link>
            </p>
            <p>
              <Link
                href="/auth/forgot-password"
                className="text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
