import { google } from "googleapis";
import type { PortalData, Project, Task, Invoice, TeamMember, TimelineItem, Achievement } from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID as string;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }
  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// Reads a whole tab and returns rows as objects keyed by the header row,
// plus the 1-indexed sheet row number for each (for later updates).
async function readTab(tab: string): Promise<{ rowNumber: number; data: Record<string, string> }[]> {
  const sheets = getClient();
  let res;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1:Z1000`,
    });
  } catch (err) {
    // A tab that doesn't exist yet (e.g. a newly-added feature's tab hasn't
    // been created in the sheet) should degrade to "no data", not take down
    // every page in the app.
    console.error(`Failed to read tab "${tab}" — treating as empty.`, err);
    return [];
  }
  const values = res.data.values || [];
  if (values.length === 0) return [];
  const headers = values[0].map((h) => String(h).trim());
  const rows = values.slice(1);
  return rows
    .map((row, i) => {
      const data: Record<string, string> = {};
      headers.forEach((h, idx) => {
        data[h] = row[idx] !== undefined ? String(row[idx]) : "";
      });
      return { rowNumber: i + 2, data }; // +2: 1 for header row, 1 for 0-index
    })
    .filter((r) => Object.values(r.data).some((v) => v !== "")); // skip fully blank rows
}

async function appendRow(tab: string, values: string[]) {
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

async function updateCell(tab: string, rowNumber: number, colLetter: string, value: string) {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!${colLetter}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

const COLS = {
  Projects: ["id", "client", "name", "category", "currency", "total_fee", "paid", "current_phase", "drive_link", "subtitle", "type"],
  Tasks: ["id", "project_id", "title", "assignee", "due_date", "status", "scope"],
  Invoices: ["id", "project_id", "label", "amount", "currency", "due_date", "status"],
  Team: ["id", "name", "role"],
  Timeline: ["id", "project_id", "label", "start_date", "end_date"],
  Achievements: ["id", "project_id", "slot", "member", "paid"],
};

function colLetterFor(tab: keyof typeof COLS, field: string): string {
  const idx = COLS[tab].indexOf(field);
  if (idx === -1) throw new Error(`Unknown column ${field} on ${tab}`);
  return String.fromCharCode(65 + idx); // A, B, C...
}

function nextIdNumber(rows: { data: Record<string, string> }[], prefix: string): number {
  const nums = rows
    .map((r) => r.data.id)
    .filter((id) => id && id.startsWith(prefix + "_"))
    .map((id) => parseInt(id.split("_")[1], 10))
    .filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function nextId(rows: { data: Record<string, string> }[], prefix: string): string {
  return `${prefix}_${String(nextIdNumber(rows, prefix)).padStart(3, "0")}`;
}

export async function getAllData(): Promise<PortalData> {
  const [projRows, taskRows, invRows, teamRows, tlRows, achRows] = await Promise.all([
    readTab("Projects"),
    readTab("Tasks"),
    readTab("Invoices"),
    readTab("Team"),
    readTab("Timeline"),
    readTab("Achievements"),
  ]);

  const projects: Project[] = projRows.map((r) => ({
    id: r.data.id,
    client: r.data.client,
    name: r.data.name,
    category: r.data.category,
    currency: r.data.currency,
    total_fee: Number(r.data.total_fee) || 0,
    paid: Number(r.data.paid) || 0,
    current_phase: r.data.current_phase,
    drive_link: r.data.drive_link,
    subtitle: r.data.subtitle,
    type: r.data.type,
  }));

  const tasks: Task[] = taskRows.map((r) => ({
    id: r.data.id,
    project_id: r.data.project_id,
    title: r.data.title,
    assignee: r.data.assignee,
    due_date: r.data.due_date,
    status: r.data.status,
    scope: r.data.scope,
  }));

  const invoices: Invoice[] = invRows.map((r) => ({
    id: r.data.id,
    project_id: r.data.project_id,
    label: r.data.label,
    amount: Number(r.data.amount) || 0,
    currency: r.data.currency,
    due_date: r.data.due_date,
    status: r.data.status,
  }));

  const team: TeamMember[] = teamRows.map((r) => ({
    id: r.data.id,
    name: r.data.name,
    role: r.data.role,
  }));

  const timeline: TimelineItem[] = tlRows.map((r) => ({
    id: r.data.id,
    project_id: r.data.project_id,
    label: r.data.label,
    start_date: r.data.start_date,
    end_date: r.data.end_date,
  }));

  const achievements: Achievement[] = achRows.map((r) => ({
    id: r.data.id,
    project_id: r.data.project_id,
    slot: Number(r.data.slot) || 0,
    member: r.data.member || "",
    paid: r.data.paid.toLowerCase() === "true",
  }));

  return { projects, tasks, invoices, team, timeline, achievements };
}

// ---- Task write operations ----

export async function addTask(input: {
  project_id: string;
  title: string;
  assignee: string;
  due_date: string;
  scope: string;
}) {
  const rows = await readTab("Tasks");
  const id = nextId(rows, "task");
  await appendRow("Tasks", [
    id,
    input.project_id,
    input.title,
    input.assignee,
    input.due_date,
    "open",
    input.scope,
  ]);
  return id;
}

const TASK_STATUS_CYCLE: Record<string, string> = {
  open: "in_progress",
  in_progress: "done",
  done: "open",
};

export async function cycleTaskStatus(taskId: string): Promise<string> {
  const rows = await readTab("Tasks");
  const row = rows.find((r) => r.data.id === taskId);
  if (!row) throw new Error(`Task ${taskId} not found`);
  const current = row.data.status || "open";
  const next = TASK_STATUS_CYCLE[current] || "open";
  await updateCell("Tasks", row.rowNumber, colLetterFor("Tasks", "status"), next);
  return next;
}

export async function completeTask(taskId: string) {
  const rows = await readTab("Tasks");
  const row = rows.find((r) => r.data.id === taskId);
  if (!row) throw new Error(`Task ${taskId} not found`);
  await updateCell("Tasks", row.rowNumber, colLetterFor("Tasks", "status"), "done");
}

export async function findTasks(query: { project_id?: string; titleContains?: string }) {
  const rows = await readTab("Tasks");
  return rows.filter((r) => {
    const okProject = query.project_id ? r.data.project_id === query.project_id : true;
    const okTitle = query.titleContains
      ? r.data.title.toLowerCase().includes(query.titleContains.toLowerCase())
      : true;
    return okProject && okTitle;
  });
}

// ---- Project write operations ----

export async function logPayment(projectId: string, amount: number) {
  const rows = await readTab("Projects");
  const row = rows.find((r) => r.data.id === projectId);
  if (!row) throw new Error(`Project ${projectId} not found`);
  const currentPaid = Number(row.data.paid) || 0;
  await updateCell("Projects", row.rowNumber, colLetterFor("Projects", "paid"), String(currentPaid + amount));
}

export async function updateProjectPhase(projectId: string, phase: string) {
  const rows = await readTab("Projects");
  const row = rows.find((r) => r.data.id === projectId);
  if (!row) throw new Error(`Project ${projectId} not found`);
  await updateCell("Projects", row.rowNumber, colLetterFor("Projects", "current_phase"), phase);
}

// Moves a project between Ongoing / Prospective / Completed / On Hold —
// e.g. for a client that's gone quiet and needs to be parked without
// losing its place in the sheet.
export async function updateProjectCategory(projectId: string, category: string) {
  const rows = await readTab("Projects");
  const row = rows.find((r) => r.data.id === projectId);
  if (!row) throw new Error(`Project ${projectId} not found`);
  await updateCell("Projects", row.rowNumber, colLetterFor("Projects", "category"), category);
}

export async function addProject(input: {
  client: string;
  name: string;
  category: string;
  currency: string;
  total_fee: number;
  type: string;
}) {
  const rows = await readTab("Projects");
  const id = nextId(rows, "proj");
  await appendRow("Projects", [
    id,
    input.client,
    input.name,
    input.category,
    input.currency,
    String(input.total_fee),
    "0",
    "",
    "",
    "",
    input.type,
  ]);
  return id;
}

export async function findProjectByName(query: string): Promise<{ id: string; name: string; currency: string } | null> {
  const rows = await readTab("Projects");
  const q = query.toLowerCase();
  const match = rows.find(
    (r) => r.data.name.toLowerCase().includes(q) || r.data.client.toLowerCase().includes(q)
  );
  return match ? { id: match.data.id, name: match.data.name, currency: match.data.currency } : null;
}

// ---- Invoice forecasting (pure calculation, no sheet writes) ----

// Sets (or clears, if member === "") which team member gets credit for one of
// a project's up to 5 achievement slots, and whether their bonus has been paid.
// Creates a new row the first time a given project+slot is used, updates it after that.
export async function setAchievement(
  projectId: string,
  slot: number,
  member: string,
  paid: boolean
): Promise<void> {
  const rows = await readTab("Achievements");
  const existing = rows.find((r) => r.data.project_id === projectId && Number(r.data.slot) === slot);
  if (existing) {
    await updateCell("Achievements", existing.rowNumber, colLetterFor("Achievements", "member"), member);
    await updateCell("Achievements", existing.rowNumber, colLetterFor("Achievements", "paid"), String(paid));
  } else {
    const id = nextId(rows, "ach");
    await appendRow("Achievements", [id, projectId, String(slot), member, String(paid)]);
  }
}
const PAYMENT_TIERS = [
  { threshold: 0.5, label: "50% Deposit" },
  { threshold: 0.8, label: "30% Milestone" },
  { threshold: 1.0, label: "20% Final" },
];

// Returns every remaining unpaid tier for a project, not just the next one —
// e.g. a project at 50% paid gets both a "30% Milestone" AND a "20% Final" line,
// so the studio can see everything still owed, not just the immediate next invoice.
// This mirrors getRemainingInvoices() from the original Figma Make prototype —
// a pure calculation, not something that needs manual data entry.
export function computeRemainingInvoices(total: number, paid: number): { label: string; amount: number }[] {
  if (total <= 0) return [];
  const frac = paid / total;
  if (frac >= 1) return [];

  const results: { label: string; amount: number }[] = [];
  let prev = 0;
  for (const tier of PAYMENT_TIERS) {
    if (frac >= tier.threshold) {
      prev = tier.threshold;
      continue; // this tier is already fully covered by what's been paid
    }
    const isPartial = frac > prev;
    const amount = isPartial
      ? Math.round(tier.threshold * total - paid)
      : Math.round((tier.threshold - prev) * total);
    results.push({ label: isPartial ? `${tier.label} (partial)` : tier.label, amount });
    prev = tier.threshold;
  }
  return results;
}
