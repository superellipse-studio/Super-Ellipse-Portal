"use client";
import { useState } from "react";

export default function Collapsible({
  title,
  count,
  subtitle,
  defaultOpen = true,
  theme = "dark",
  children,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  defaultOpen?: boolean;
  theme?: "dark" | "light";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isDark = theme === "dark";

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-4 pb-3 border-b text-left ${
          isDark ? "border-line" : "border-black/10"
        }`}
      >
        <div>
          <h2 className={`text-xl font-bold ${isDark ? "" : "text-black"}`}>{title}</h2>
          {subtitle && <p className={`text-sm ${isDark ? "text-gray-500" : "text-black/50"}`}>{subtitle}</p>}
        </div>
        <div className={`flex items-center gap-3 shrink-0 ${isDark ? "text-gray-500" : "text-black/50"}`}>
          {count !== undefined && <span>{count}</span>}
          <span className={`inline-block transition-transform duration-200 ${open ? "rotate-180" : ""}`}>⌄</span>
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
