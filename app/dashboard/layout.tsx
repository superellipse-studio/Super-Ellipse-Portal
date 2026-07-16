import NavTabs from "./NavTabs";
import CommandBar from "./CommandBar";

export const dynamic = "force-dynamic"; // always fetch fresh sheet data, no caching

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="safe-top flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 sm:px-6 pt-3 pb-2 sm:py-5">
        <span className="font-bold tracking-widest text-sm sm:text-base">SUPER ELLIPSE</span>
        <span className="label text-[10px] sm:text-xs">Internal Portal</span>
      </header>
      <NavTabs />
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 pb-32 sm:pb-36 max-w-6xl w-full mx-auto">{children}</main>
      <CommandBar />
    </div>
  );
}
