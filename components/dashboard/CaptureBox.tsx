"use client";

import { useState } from "react";

export function CaptureBox() {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(
    null
  );

  async function submit() {
    const text = value.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    setToast(null);

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setToast({ kind: "error", text: data.error ?? "Capture failed." });
        return;
      }

      setValue("");
      setToast({
        kind: "success",
        text: data.org ? `Captured for ${data.org}` : "Captured",
      });
    } catch {
      setToast({ kind: "error", text: "Capture failed — check your connection." });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="fixed bottom-[22px] left-1/2 z-30 flex w-[min(680px,92%)] -translate-x-1/2 flex-col items-center gap-2">
      {toast && (
        <div
          className={`rounded-full border px-4 py-1.5 text-xs shadow-lg backdrop-blur-xl ${
            toast.kind === "success"
              ? "border-ok/40 bg-ok/[0.15] text-ok"
              : "border-danger/40 bg-danger/[0.15] text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}
      <div className="flex w-full items-center gap-2.5 rounded-full border border-ink-2/60 bg-ink-1/70 px-3 py-2.5 shadow-[0_20px_44px_-18px_oklch(0.05_0_0_/_0.85)] backdrop-blur-2xl">
        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-accent">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-accent-foreground">
            <rect x="7.5" y="3" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M5 9.5a5 5 0 0010 0M10 14.5V17"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Type or say what's on your mind…"
          disabled={submitting}
          className="flex-1 bg-transparent text-[13px] text-ink-4 placeholder:text-ink-3 focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          aria-label="Send capture"
          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full border border-ink-2/70 text-ink-3 hover:text-ink-4 disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path
              d="M4 10h12M11 5.5L16.5 10 11 14.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
