"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import TurnstileWidget from "./TurnstileWidget";

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
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<string>("POST");

  const isEdit = mode === "edit";

  async function submitRequest(
    url: string,
    method: string,
    body: Record<string, unknown>,
    turnstileToken?: string
  ) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (turnstileToken) {
      headers["X-Turnstile-Token"] = turnstileToken;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const data = await res.json();
      if (data.captchaRequired) {
        setPendingBody(body);
        setPendingUrl(url);
        setPendingMethod(method);
        setShowCaptcha(true);
        setSubmitting(false);
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(data.url || `/${data.slug}`);
  }

  const handleTurnstileVerify = useCallback(
    async (token: string) => {
      if (!pendingBody || !pendingUrl) return;
      setShowCaptcha(false);
      setSubmitting(true);
      setError("");
      await submitRequest(pendingUrl, pendingMethod, pendingBody, token);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingBody, pendingUrl, pendingMethod]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setShowCaptcha(false);

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

        await submitRequest(`/api/pastes/${slug}`, "PATCH", body);
      } else {
        await submitRequest("/api/pastes", "POST", {
          content,
          title: title || undefined,
          expiry: expiry || undefined,
        });
      }
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 ring-1 ring-zinc-200/80 transition-all focus:bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-200 dark:placeholder-zinc-500 dark:ring-zinc-700/60 dark:focus:bg-zinc-800 dark:focus:ring-indigo-500/40";

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
        className={`${inputClass} p-4 font-mono leading-relaxed`}
      />

      {isEdit && isAuthenticated && (
        <>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="customSlug"
              className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
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
          <label className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              name="historyPublic"
              defaultChecked={initialHistoryPublic}
              className="h-4 w-4 rounded accent-indigo-500"
            />
            Make version history public
          </label>
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        {(!isEdit || isAuthenticated) && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="expiry"
              className="text-sm text-zinc-400 dark:text-zinc-500"
            >
              Expires in:
            </label>
            <select
              id="expiry"
              name="expiry"
              defaultValue={initialExpiry}
              className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 ring-1 ring-zinc-200/80 transition-all focus:ring-2 focus:ring-indigo-300 focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-300 dark:ring-zinc-700/60 dark:focus:ring-indigo-500/40"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:shadow-none dark:hover:bg-indigo-400"
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
            className="rounded-full px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            Cancel
          </a>
        )}
      </div>
      {showCaptcha && (
        <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/60 dark:bg-amber-950/30 dark:ring-amber-800/40">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Rate limit reached. Please complete the CAPTCHA to continue.
          </p>
          <TurnstileWidget onVerify={handleTurnstileVerify} />
        </div>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/30">
          {error}
        </p>
      )}
    </form>
  );
}
