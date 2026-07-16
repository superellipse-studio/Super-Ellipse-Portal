"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Wrong password.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm border border-line p-8">
        <h1 className="text-xl font-bold tracking-widest mb-1">SUPER ELLIPSE</h1>
        <p className="label mb-6">Internal Portal</p>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border border-line px-3 py-2 mb-3 outline-none focus:border-white"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-white py-2 hover:bg-white hover:text-black transition"
        >
          {loading ? "..." : "ENTER"}
        </button>
      </form>
    </main>
  );
}
