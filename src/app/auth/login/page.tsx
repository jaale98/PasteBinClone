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
    "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500";

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
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
            className="rounded bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {needsVerification && (
            <div className="rounded border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your email is not verified. Please check your inbox for the
                verification link.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                className="mt-2 text-sm font-medium text-yellow-900 underline dark:text-yellow-100"
              >
                Resend verification email
              </button>
              {resent && (
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  Verification email sent.
                </p>
              )}
            </div>
          )}
        </form>
        <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-zinc-900 underline dark:text-zinc-100"
            >
              Register
            </Link>
          </p>
          <p>
            <Link
              href="/auth/forgot-password"
              className="text-zinc-900 underline dark:text-zinc-100"
            >
              Forgot password?
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
