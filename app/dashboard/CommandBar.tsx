"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommandBar() {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: value }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ text: json.error || "Failed", error: true });
      } else {
        setFeedback({ text: json.message, error: false });
        setValue("");
        router.refresh();
      }
    } catch (err: any) {
      setFeedback({ text: err.message || "Network error", error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="safe-bottom fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 sm:pb-6 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        {feedback && (
          <div
            className={`mb-2 rounded-2xl px-4 py-2 text-sm shadow-lg ${
              feedback.error ? "bg-red-950 text-red-300 border border-red-900" : "bg-sage text-black"
            }`}
          >
            {feedback.text}
          </div>
        )}
        <form
          onSubmit={submit}
          className="flex items-center gap-3 bg-sage text-black rounded-full shadow-2xl shadow-black/60 px-5 py-3 border border-black/5"
        >
          <span className="text-black/40">›</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='e.g. "mark send final invoice for sun city as done"'
            className="flex-1 bg-transparent outline-none placeholder:text-black/35 text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 bg-black text-sage rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "..." : "Run"}
          </button>
        </form>
      </div>
    </div>
  );
}
