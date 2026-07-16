import { getAllData } from "@/lib/sheets";
import { computeRemainingInvoices } from "@/lib/sheets";
import { getUsdToIdrRate } from "@/lib/exchangeRate";
import type { Project, Task } from "@/lib/types";
import Collapsible from "../Collapsible";

const PHASES: { match: string; isInvoice?: boolean; isFeedback?: boolean }[] = [
  { match: "Down Payment 50%", isInvoice: true },
  { match: "Design Direction" },
  { match: "Feedback 1", isFeedback: true },
  { match: "Design Phase 1" },
  { match: "Feedback 2", isFeedback: true },
  { match: "Design Phase 2" },
  { match: "Invoice 30%", isInvoice: true },
  { match: "Final Proposal" },
  { match: "Invoice 20%", isInvoice: true },
  { match: "Hand Over" },
];

function fmtMoney(amount: number, currency: string) {
  if (currency === "IDR") return `Rp ${amount.toLocaleString("id-ID")}`;
  return `$${amount.toLocaleString("en-US")}`;
}

// Small-caps label style for text sitting on the light sage card background —
// separate from the shared `.label` utility, which is tuned for the dark shell.
const cardLabel = "text-[10px] uppercase tracking-wide text-black/45";

function PhaseBar({ current }: { current: string }) {
  const idx = PHASES.findIndex((p) => p.match.toLowerCase() === (current || "").toLowerCase());
  return (
    <div className="mt-4 mb-4 overflow-x-auto">
      <div className="min-w-[480px]">
        <div className="flex gap-1.5 items-center h-2.5">
          {PHASES.map((p, i) => {
            const isCurrent = i === idx;
            const filled = i <= idx;
            return (
              <div key={p.match} title={p.match} className="flex-1 relative flex items-center">
                <div className={`w-full rounded-full ${filled ? "h-[3px] bg-black" : "h-px bg-black/25"}`} />
                {isCurrent && <div className="absolute right-0 w-2.5 h-2.5 rounded-full bg-black" />}
              </div>
            );
          })}
        </div>
        <div className="flex mt-2">
          {PHASES.map((p, i) => {
            const isCurrent = i === idx;
            const isPast = i < idx;
            return (
              <div key={p.match} className="flex-1 text-center px-0.5">
                <p
                  className={`text-[7px] leading-tight uppercase tracking-wide ${
                    isCurrent
                      ? "text-black font-bold"
                      : p.isInvoice
                      ? isPast
                        ? "text-black/60"
                        : "text-black/25"
                      : isPast
                      ? "text-black/45"
                      : "text-black/25"
                  } ${p.isFeedback && !isCurrent ? "italic" : ""}`}
                >
                  {p.match}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UpcomingInvoices({
  projects,
  rate,
}: {
  projects: Project[];
  rate: { rate: number; date: string } | null;
}) {
  // Only ongoing projects with an unpaid balance count toward the confident
  // near-term total — computed live from fee/paid, no manual data entry needed.
  const activeGroups = projects
    .filter((p) => p.category === "ongoing")
    .map((p) => ({ project: p, lines: computeRemainingInvoices(p.total_fee, p.paid) }))
    .filter((g) => g.lines.length > 0);

  // On-hold projects are tracked separately — money that's owed but not
  // reliable enough to count toward "what I'll earn soon".
  const onHoldGroups = projects
    .filter((p) => p.category === "on_hold")
    .map((p) => ({ project: p, lines: computeRemainingInvoices(p.total_fee, p.paid) }))
    .filter((g) => g.lines.length > 0);

  if (activeGroups.length === 0 && onHoldGroups.length === 0) return null;

  let totalIdr = 0;
  activeGroups.forEach(({ project, lines }) => {
    lines.forEach((line) => {
      totalIdr += project.currency === "IDR" ? line.amount : rate ? line.amount * rate.rate : 0;
    });
  });

  let onHoldTotalIdr = 0;
  onHoldGroups.forEach(({ project, lines }) => {
    lines.forEach((line) => {
      onHoldTotalIdr += project.currency === "IDR" ? line.amount : rate ? line.amount * rate.rate : 0;
    });
  });

  return (
    <div className="bg-sage text-black rounded-3xl p-5 sm:p-7 mt-8">
      <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-4">
        <h2 className="font-bold text-lg">Upcoming Invoices</h2>
        <span className="rounded-full border border-black/20 px-3 py-1 text-xs text-black/60">
          {activeGroups.length} PROJECTS
        </span>
      </div>

      {activeGroups.length === 0 ? (
        <p className="text-black/50 text-sm py-2">No active invoices right now.</p>
      ) : (
        <div className="divide-y divide-black/10">
          {activeGroups.map(({ project, lines }) => (
            <div key={project.id} className="py-4">
              <p className="font-bold mb-2">
                {project.name} <span className="text-black/40 font-normal">· {project.client}</span>
              </p>
              {lines.map((line, li) => {
                const idrEquivalent =
                  project.currency === "IDR" ? null : rate ? Math.round(line.amount * rate.rate) : null;
                return (
                  <div key={li} className="flex items-center justify-between py-1">
                    <span className="text-black/60 text-sm">— {line.label}</span>
                    <div className="text-right">
                      <p className="font-bold">{fmtMoney(line.amount, project.currency)}</p>
                      {idrEquivalent !== null && (
                        <p className="text-black/40 text-xs">≈ {fmtMoney(idrEquivalent, "IDR")}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between border-t border-black/10 pt-5 mt-2">
        <div>
          <p className={cardLabel}>Total Outstanding</p>
          {rate && (
            <p className="text-black/40 text-xs mt-1">
              Rate: 1 USD = Rp {rate.rate.toLocaleString("id-ID", { maximumFractionDigits: 1 })} · {rate.date}
            </p>
          )}
          {!rate && <p className="text-black/40 text-xs mt-1">Live rate unavailable — USD amounts not converted.</p>}
        </div>
        <p className="text-4xl font-bold tracking-tight">{fmtMoney(Math.round(totalIdr), "IDR")}</p>
      </div>

      {onHoldGroups.length > 0 && (
        <div className="mt-6 pt-4 border-t border-dashed border-black/20">
          <div className="flex items-center justify-between mb-3">
            <p className={cardLabel}>On Hold — not counted in the total above</p>
            <span className="text-black/40 text-xs">{onHoldGroups.length} project(s)</span>
          </div>
          <div className="space-y-3">
            {onHoldGroups.map(({ project, lines }) => (
              <div key={project.id}>
                <p className="text-sm font-medium text-black/60">
                  {project.name} <span className="text-black/35 font-normal">· {project.client}</span>
                </p>
                {lines.map((line, li) => (
                  <div key={li} className="flex items-center justify-between py-0.5 text-black/45 text-sm">
                    <span>— {line.label}</span>
                    <span>{fmtMoney(line.amount, project.currency)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/10">
            <span className={cardLabel}>On Hold Total</span>
            <span className="text-black/50 font-medium">{fmtMoney(Math.round(onHoldTotalIdr), "IDR")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const balance = project.total_fee - project.paid;
  const pctPaid = project.total_fee > 0 ? Math.round((project.paid / project.total_fee) * 100) : 0;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const isSettled = balance <= 0;

  return (
    <div className="bg-sage text-black rounded-3xl p-5 sm:p-7 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cardLabel}>{project.client}</p>
          <h3 className="text-2xl font-bold mt-0.5">{project.name}</h3>
          {project.subtitle && <p className="text-sm text-black/50 italic mt-1">{project.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.drive_link && (
            <a
              href={project.drive_link}
              target="_blank"
              className="rounded-full border border-black/20 px-3 py-1 text-xs text-black/70 hover:border-black transition-colors"
            >
              Drive ↗
            </a>
          )}
          {project.total_fee > 0 && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isSettled ? "bg-black text-sage" : "border border-black/30 text-black"
              }`}
            >
              {isSettled ? "Paid" : `${pctPaid}% Paid`}
            </span>
          )}
        </div>
      </div>

      {project.current_phase && <PhaseBar current={project.current_phase} />}

      {project.total_fee > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-black/10">
          <div>
            <p className={cardLabel}>Total Fee</p>
            <p className="text-lg font-bold mt-0.5">{fmtMoney(project.total_fee, project.currency)}</p>
          </div>
          <div>
            <p className={cardLabel}>Paid</p>
            <p className="text-lg font-bold mt-0.5">{fmtMoney(project.paid, project.currency)}</p>
          </div>
          <div>
            <p className={cardLabel}>Balance Due</p>
            <p className="text-lg font-bold mt-0.5">{isSettled ? "Settled" : fmtMoney(balance, project.currency)}</p>
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <p className={`${cardLabel} mt-4 pt-4 border-t border-black/10`}>
          Tasks — {doneCount} / {tasks.length} done
        </p>
      )}
    </div>
  );
}

export default async function ProjectsPage() {
  const [{ projects, tasks }, rate] = await Promise.all([getAllData(), getUsdToIdrRate()]);

  const groups: { title: string; subtitle: string; category: string }[] = [
    { title: "Ongoing", subtitle: "Active projects in progress", category: "ongoing" },
    { title: "On Hold", subtitle: "Paused — no response from client yet", category: "on_hold" },
    { title: "Prospective", subtitle: "Potential projects being scoped", category: "prospective" },
    { title: "Completed", subtitle: "Delivered and archived", category: "completed" },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold">Projects</h1>
      </div>

      {groups.map((g) => {
        const list = projects.filter((p) => p.category === g.category);
        return (
          <Collapsible
            key={g.category}
            title={g.title}
            subtitle={g.subtitle}
            count={list.length}
            defaultOpen={g.category !== "completed"}
          >
            {list.length === 0 ? (
              <p className="text-gray-600">None yet.</p>
            ) : (
              <div className="space-y-4">
                {list.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    tasks={tasks.filter((t) => t.project_id === p.id)}
                  />
                ))}
              </div>
            )}
          </Collapsible>
        );
      })}

      <UpcomingInvoices projects={projects} rate={rate} />
    </div>
  );
}
