"use client";

import { useState } from "react";

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-sm text-zinc-500 transition-all hover:bg-zinc-200/80 hover:text-zinc-700 active:scale-[0.97] dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
