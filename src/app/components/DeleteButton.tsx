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
        className="rounded-full bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-500 transition-all hover:bg-red-100 active:scale-[0.97] dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40"
      >
        Delete
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-full bg-red-500 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm shadow-red-200 transition-all hover:bg-red-600 hover:shadow-md active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:shadow-none"
    >
      {deleting ? "Deleting..." : "Confirm Delete"}
    </button>
  );
}
