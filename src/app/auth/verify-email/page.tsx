"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMessage("Invalid verification link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const data = await res.json();
          setErrorMessage(data.error || "Verification failed");
          setStatus("error");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-16">
      <main className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800/60">
          {status === "loading" && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Verifying your email...
            </p>
          )}
          {status === "success" && (
            <>
              <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                Email verified
              </h1>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Your email has been verified. You can now log in.
              </p>
              <p className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <Link
                  href="/auth/login"
                  className="text-sm text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
                >
                  Log in
                </Link>
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                Verification failed
              </h1>
              <p className="mb-4 text-sm text-zinc-400 dark:text-zinc-500">
                {errorMessage}
              </p>
              <p className="border-t border-zinc-100 pt-5 text-sm dark:border-zinc-800">
                <Link
                  href="/auth/login"
                  className="text-indigo-500 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300 dark:decoration-indigo-800 dark:hover:decoration-indigo-600"
                >
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
