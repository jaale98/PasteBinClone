"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/pastes/${slug}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete paste");
        setConfirming(false);
        setDeleting(false);
      }
    } catch {
      alert("Something went wrong");
      setConfirming(false);
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Confirm Delete"}
    </button>
  );
}
