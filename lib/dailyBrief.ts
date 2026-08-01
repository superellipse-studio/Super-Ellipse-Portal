import { getAllData } from "./sheets";
import type { PortalData, Project, Task, TimelineItem } from "./types";

const BALI_TIME_ZONE = "Asia/Makassar";
const DAY_MS = 24 * 60 * 60 * 1000;

interface BriefTask {
  project: string;
  title: string;
  dueDate: string;
  assignee: string;
  status: string;
  daysFromToday: number;
}

interface BriefTimeline {
  project: string;
  label: string;
  startDate: string;
  endDate: string;
  status: string;
  relationship: "starts" | "ends" | "active";
}

interface BriefData {
  generatedDate: string;
  windowEndDate: string;
  overdueTasks: BriefTask[];
  upcomingTasks: BriefTask[];
  timeline: BriefTimeline[];
  warnings: string[];
}

function dateKeyInBali(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BALI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  if (!date) throw new Error(`Invalid date: ${dateKey}`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function dayDifference(from: string, to: string): number {
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);
  if (!fromDate || !toDate) return 0;
  return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

function projectName(projectsById: Map<string, Project>, projectId: string): string {
  if (projectId === "studio") return "Studio";
  return projectsById.get(projectId)?.name || projectId || "Unassigned";
}

function collectBriefData(data: PortalData, today = dateKeyInBali()): BriefData {
  const end = addDays(today, 3);
  const projectsById = new Map(data.projects.map((project) => [project.id, project]));

  const openTasks = data.tasks.filter((task) => task.status !== "done" && parseDateKey(task.due_date));
  const toBriefTask = (task: Task): BriefTask => ({
    project: projectName(projectsById, task.project_id),
    title: task.title,
    dueDate: task.due_date,
    assignee: task.assignee || "Unassigned",
    status: task.status || "open",
    daysFromToday: dayDifference(today, task.due_date),
  });

  const overdueTasks = openTasks
    .filter((task) => task.due_date < today)
    .map(toBriefTask)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const upcomingTasks = openTasks
    .filter((task) => task.due_date >= today && task.due_date <= end)
    .map(toBriefTask)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const timeline = data.timeline
    .filter((item) => {
      const start = parseDateKey(item.start_date);
      const finish = parseDateKey(item.end_date);
      if (!start || !finish) return false;
      return item.start_date <= end && item.end_date >= today;
    })
    .map((item: TimelineItem): BriefTimeline => {
      let relationship: BriefTimeline["relationship"] = "active";
      if (item.start_date >= today && item.start_date <= end) relationship = "starts";
      else if (item.end_date >= today && item.end_date <= end) relationship = "ends";
      return {
        project: projectName(projectsById, item.project_id),
        label: item.label,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status || "upcoming",
        relationship,
      };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const warnings: string[] = [];
  if (overdueTasks.length > 0) warnings.push(`${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`);

  const activeProjectIds = new Set(
    data.projects.filter((project) => project.category === "ongoing").map((project) => project.id)
  );
  const projectIdsWithFutureTimeline = new Set(
    data.timeline
      .filter((item) => item.end_date >= today && parseDateKey(item.end_date))
      .map((item) => item.project_id)
  );
  const projectsWithoutTimeline = [...activeProjectIds]
    .filter((id) => !projectIdsWithFutureTimeline.has(id))
    .map((id) => projectsById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  if (projectsWithoutTimeline.length > 0) {
    warnings.push(`No current or upcoming timeline: ${projectsWithoutTimeline.join(", ")}`);
  }

  const deliveryCountByDate = new Map<string, number>();
  for (const task of upcomingTasks) {
    deliveryCountByDate.set(task.dueDate, (deliveryCountByDate.get(task.dueDate) || 0) + 1);
  }
  for (const [date, count] of deliveryCountByDate) {
    if (count >= 3) warnings.push(`${count} tasks are due on ${date}`);
  }

  return {
    generatedDate: today,
    windowEndDate: end,
    overdueTasks,
    upcomingTasks,
    timeline,
    warnings,
  };
}

function humanDay(date: string, today: string): string {
  const difference = dayDifference(today, date);
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDateKey(date) as Date);
}

function deterministicBrief(brief: BriefData): string {
  const lines: string[] = ["SUPER ELLIPSE — NEXT 3 DAYS", ""];

  if (brief.upcomingTasks.length > 0) {
    lines.push("TO-DO");
    for (const task of brief.upcomingTasks) {
      lines.push(`• ${humanDay(task.dueDate, brief.generatedDate)} — ${task.project}: ${task.title}`);
    }
    lines.push("");
  }

  if (brief.timeline.length > 0) {
    lines.push("PROJECT TIMELINE");
    for (const item of brief.timeline) {
      const action = item.relationship === "starts" ? "starts" : item.relationship === "ends" ? "ends" : "in progress";
      const date = item.relationship === "ends" ? item.endDate : item.startDate;
      lines.push(`• ${item.project}: ${item.label} ${action}${item.relationship === "active" ? "" : ` ${humanDay(date, brief.generatedDate).toLowerCase()}`}`);
    }
    lines.push("");
  }

  if (brief.overdueTasks.length > 0 || brief.warnings.length > 0) {
    lines.push("ATTENTION");
    for (const task of brief.overdueTasks) {
      lines.push(`• Overdue since ${task.dueDate} — ${task.project}: ${task.title}`);
    }
    for (const warning of brief.warnings) lines.push(`• ${warning}`);
    lines.push("");
  }

  if (brief.upcomingTasks.length === 0 && brief.timeline.length === 0 && brief.overdueTasks.length === 0) {
    lines.push("Nothing scheduled for today through the next three days.");
  }

  return lines.join("\n").trim();
}

async function createClaudeBrief(brief: BriefData): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 650,
      temperature: 0.2,
      system: `You are the concise operations assistant for Super Ellipse Studio. Create a practical Telegram morning brief from verified portal data. Never invent tasks, dates, clients, risks, or recommendations. Prioritize what needs action today, then the next three days. Mention schedule pressure only when the supplied data supports it. Use plain text, short section headings, and bullet points. No markdown tables. Keep it under 1,800 characters. End with one short, useful priority recommendation only when justified by the data.`,
      messages: [
        {
          role: "user",
          content: `Today in Bali is ${brief.generatedDate}. The brief window ends ${brief.windowEndDate}.\n\nPortal data:\n${JSON.stringify(brief, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Claude daily brief failed:", response.status, await response.text());
    return null;
  }

  const result = await response.json();
  const text = (result.content || []).find((block: { type?: string }) => block.type === "text")?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

export async function createDailyBrief(): Promise<{ message: string; hasItems: boolean }> {
  const data = await getAllData();
  const brief = collectBriefData(data);
  const hasItems =
    brief.upcomingTasks.length > 0 ||
    brief.timeline.length > 0 ||
    brief.overdueTasks.length > 0 ||
    brief.warnings.length > 0;

  const claudeMessage = await createClaudeBrief(brief);
  return {
    message: claudeMessage || deterministicBrief(brief),
    hasItems,
  };
}
