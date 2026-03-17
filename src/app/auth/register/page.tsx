"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password) {
      setError("Email and password are required");
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
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
      // Register the account
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setSubmitting(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but login failed — send them to login page
        router.push("/auth/login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500";

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Create account
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
            autoComplete="new-password"
            className={inputClass}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            required
            autoComplete="new-password"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "Creating account..." : "Register"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-zinc-900 underline dark:text-zinc-100"
          >
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
