"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXPIRY_OPTIONS = [
  { value: "", label: "Never" },
  { value: "10m", label: "10 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

interface PasteFormProps {
  mode?: "create" | "edit";
  slug?: string;
  initialTitle?: string;
  initialContent?: string;
  initialExpiry?: string;
  initialSlug?: string;
  initialHistoryPublic?: boolean;
  isAuthenticated?: boolean;
}

export default function PasteForm({
  mode = "create",
  slug,
  initialTitle = "",
  initialContent = "",
  initialExpiry = "",
  initialSlug = "",
  initialHistoryPublic = false,
  isAuthenticated = false,
}: PasteFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === "edit";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = formData.get("content") as string;
    const title = formData.get("title") as string;
    const expiry = formData.get("expiry") as string;

    if (!content.trim()) {
      setError("Content is required");
      setSubmitting(false);
      return;
    }

    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          content,
          title: title || null,
        };

        if (isAuthenticated) {
          body.expiry = expiry || null;
          const customSlug = formData.get("customSlug") as string;
          if (customSlug && customSlug !== slug) {
            body.customSlug = customSlug;
          }
          body.historyPublic = formData.get("historyPublic") === "on";
        }

        const res = await fetch(`/api/pastes/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Something went wrong");
          setSubmitting(false);
          return;
        }

        const data = await res.json();
        router.push(data.url);
      } else {
        const res = await fetch("/api/pastes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            title: title || undefined,
            expiry: expiry || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Something went wrong");
          setSubmitting(false);
          return;
        }

        const { slug: newSlug } = await res.json();
        router.push(`/${newSlug}`);
      }
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  const inputClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <input
        type="text"
        name="title"
        placeholder="Title (optional)"
        defaultValue={initialTitle}
        className={inputClass}
      />
      <textarea
        name="content"
        placeholder="Paste your text here..."
        rows={16}
        required
        defaultValue={initialContent}
        className={`${inputClass} font-mono`}
      />

      {/* Authenticated-only fields in edit mode */}
      {isEdit && isAuthenticated && (
        <>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="customSlug"
              className="text-sm text-zinc-600 dark:text-zinc-400"
            >
              Custom slug
            </label>
            <input
              type="text"
              id="customSlug"
              name="customSlug"
              placeholder="my-custom-slug"
              defaultValue={initialSlug}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              name="historyPublic"
              defaultChecked={initialHistoryPublic}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            Make version history public
          </label>
        </>
      )}

      <div className="flex items-center gap-4">
        {/* Show expiry selector: always on create, only for auth users on edit */}
        {(!isEdit || isAuthenticated) && (
          <select
            name="expiry"
            defaultValue={initialExpiry}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Paste"}
        </button>
        {isEdit && (
          <a
            href={`/${slug}`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Cancel
          </a>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
