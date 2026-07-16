"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AchievementCircle({
  projectId,
  slot,
  member,
  teamNames,
}: {
  projectId: string;
  slot: number;
  member: string;
  teamNames: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(newMember: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/achievements/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, slot, member: newMember }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={member}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        disabled={saving}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-[10px] text-center bg-white border border-black/30 outline-none"
      >
        <option value="">—</option>
        {teamNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    );
  }

  const initial = member ? member.trim().charAt(0).toUpperCase() : "";

  return (
    <button
      onClick={() => setEditing(true)}
      title={member || "Unassigned — click to set"}
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base font-bold transition-transform hover:scale-105 ${
        member ? "bg-warn text-black" : "border-2 border-dashed border-black/25 text-black/25"
      }`}
    >
      {initial}
    </button>
  );
}
