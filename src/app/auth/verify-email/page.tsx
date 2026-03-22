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
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-sm">
        {status === "loading" && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Verifying your email...
          </p>
        )}
        {status === "success" && (
          <>
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Email verified
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Your email has been verified. You can now log in.
            </p>
            <p className="mt-4">
              <Link
                href="/auth/login"
                className="text-sm text-zinc-900 underline dark:text-zinc-100"
              >
                Log in
              </Link>
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Verification failed
            </h1>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {errorMessage}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <Link
                href="/auth/login"
                className="text-zinc-900 underline dark:text-zinc-100"
              >
                Back to login
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
