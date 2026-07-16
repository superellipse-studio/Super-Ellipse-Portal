"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/projects", label: "PROJECTS" },
  { href: "/dashboard/calendar", label: "CALENDAR" },
  { href: "/dashboard/todo", label: "TO-DO" },
  { href: "/dashboard/studio", label: "STUDIO" },
  { href: "/dashboard/team", label: "TEAM" },
  { href: "/dashboard/achievements", label: "ACHIEVEMENTS" },
];

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-5 sm:gap-8 px-4 sm:px-6 border-b border-line overflow-x-auto whitespace-nowrap">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 py-3 sm:py-4 label border-b-2 ${
              active ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
