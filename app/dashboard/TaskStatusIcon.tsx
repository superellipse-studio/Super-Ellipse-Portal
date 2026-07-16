"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TaskStatusIcon({ id, status }: { id: string; status: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setPending(true);
    try {
      const res = await fetch("/api/tasks/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`shrink-0 w-4 h-4 flex items-center justify-center transition-opacity hover:opacity-70 ${
        pending ? "opacity-40" : ""
      }`}
      title="Click to change status"
    >
      {status === "done" && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 text-accent" fill="none">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === "in_progress" && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 text-warn" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {(!status || status === "open") && (
        <span className="w-4 h-4 rounded-full border border-black/30 block" />
      )}
    </button>
  );
}
