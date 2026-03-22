"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-800 transition-colors hover:text-indigo-500 dark:text-zinc-200 dark:hover:text-indigo-400"
        >
          Pastebin Clone
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
          >
            New Paste
          </Link>
          <Link
            href="/pastes"
            className="rounded-full px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
          >
            My Pastes
          </Link>
          {!loading && (
            <>
              {session?.user ? (
                <>
                  <span className="ml-2 hidden text-sm text-zinc-400 sm:inline dark:text-zinc-500">
                    {session.user.email}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="ml-1 rounded-full px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="ml-1 rounded-full px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="ml-1 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] dark:shadow-none dark:hover:bg-indigo-400"
                  >
                    Register
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
