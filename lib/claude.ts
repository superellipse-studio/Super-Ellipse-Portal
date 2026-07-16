import type { PortalData } from "./types";
import * as db from "./sheets";

const MODEL = "claude-sonnet-5";

const TOOLS = [
  {
    name: "add_task",
    description: "Add a new task/to-do item to a project, or to the internal Studio list.",
    input_schema: {
      type: "object",
      properties: {
        project_name: {
          type: "string",
          description: "Client or project name to attach this task to. Use 'studio' for internal/studio tasks not tied to a client.",
        },
        title: { type: "string" },
        assignee: { type: "string", description: "Defaults to 'You' if not specified." },
        due_date: { type: "string", description: "ISO date YYYY-MM-DD. Leave empty if not mentioned." },
        scope: { type: "string", enum: ["this_week", "next_week", "unscheduled"], description: "Defaults to this_week." },
      },
      required: ["project_name", "title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark an existing task as done, matched by a text search on its title.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string", description: "Optional, narrows the search to one project." },
        title_search: { type: "string", description: "Words to search for in the task title." },
      },
      required: ["title_search"],
    },
  },
  {
    name: "log_payment",
    description: "Record that a payment was received for a project, adding to its 'paid' total.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        amount: { type: "number" },
      },
      required: ["project_name", "amount"],
    },
  },
  {
    name: "update_phase",
    description: "Update the current production phase label of a project.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        phase: { type: "string" },
      },
      required: ["project_name", "phase"],
    },
  },
  {
    name: "add_project",
    description: "Create a new project.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        name: { type: "string" },
        category: { type: "string", enum: ["ongoing", "prospective", "completed", "on_hold"] },
        currency: { type: "string", enum: ["USD", "IDR"] },
        total_fee: { type: "number" },
        type: { type: "string", enum: ["client", "collateral", "subscription"] },
      },
      required: ["client", "name", "category", "currency", "total_fee", "type"],
    },
  },
  {
    name: "update_project_category",
    description: "Move a project between sections — ongoing, prospective, completed, or on_hold. Use 'on_hold' for clients who have gone quiet / stopped responding / paused without a clear status. Use for requests like 'put X on hold', 'mark X as stalled', 'move X back to ongoing'.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        category: { type: "string", enum: ["ongoing", "prospective", "completed", "on_hold"] },
      },
      required: ["project_name", "category"],
    },
  },
];

function summarizeForContext(data: PortalData): string {
  const projects = data.projects
    .map((p) => `- ${p.id}: "${p.name}" (client: ${p.client}, category: ${p.category})`)
    .join("\n");
  const openTasks = data.tasks
    .filter((t) => t.status !== "done")
    .map((t) => `- ${t.id}: "${t.title}" [project: ${t.project_id}]`)
    .join("\n");
  return `Existing projects:\n${projects || "(none yet)"}\n\nOpen tasks:\n${openTasks || "(none yet)"}`;
}

export interface CommandResult {
  message: string;
  action?: string;
}

export async function runCommand(command: string, data: PortalData): Promise<CommandResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const system = `You are the command interpreter for a design studio's internal portal.
The user will type a plain-English instruction. Pick exactly one tool that matches their intent and call it.
Resolve project names loosely — the user may use a nickname or partial name, match it against the list below as best you can.
If the command doesn't clearly map to any tool, or is missing required info, do not call a tool — just respond with a short question or clarification instead.

${summarizeForContext(data)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: command }],
      tools: TOOLS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error: ${res.status} ${errText}`);
  }

  const result = await res.json();
  const toolUse = (result.content || []).find((c: any) => c.type === "tool_use");
  const textBlock = (result.content || []).find((c: any) => c.type === "text");

  if (!toolUse) {
    return { message: textBlock?.text || "I didn't catch an action in that — try rephrasing." };
  }

  return await executeTool(toolUse.name, toolUse.input);
}

async function resolveProjectId(name: string): Promise<{ id: string; name: string; currency: string }> {
  if (name.toLowerCase() === "studio") return { id: "studio", name: "Studio", currency: "USD" };
  const match = await db.findProjectByName(name);
  if (!match) throw new Error(`Couldn't find a project matching "${name}"`);
  return match;
}

async function executeTool(name: string, input: any): Promise<CommandResult> {
  switch (name) {
    case "add_task": {
      const project = await resolveProjectId(input.project_name);
      await db.addTask({
        project_id: project.id,
        title: input.title,
        assignee: input.assignee || "You",
        due_date: input.due_date || "",
        scope: input.scope || "this_week",
      });
      return { message: `Added "${input.title}" to ${project.name}.`, action: "add_task" };
    }
    case "complete_task": {
      const projectId = input.project_name
        ? (await resolveProjectId(input.project_name)).id
        : undefined;
      const matches = await db.findTasks({ project_id: projectId, titleContains: input.title_search });
      const open = matches.filter((m) => m.data.status !== "done");
      if (open.length === 0) throw new Error(`Couldn't find an open task matching "${input.title_search}"`);
      await db.completeTask(open[0].data.id);
      return { message: `Marked "${open[0].data.title}" as done.`, action: "complete_task" };
    }
    case "log_payment": {
      const project = await resolveProjectId(input.project_name);
      await db.logPayment(project.id, input.amount);
      return { message: `Logged payment of ${input.amount} for ${project.name}.`, action: "log_payment" };
    }
    case "update_phase": {
      const project = await resolveProjectId(input.project_name);
      await db.updateProjectPhase(project.id, input.phase);
      return { message: `${project.name} is now at "${input.phase}".`, action: "update_phase" };
    }
    case "add_project": {
      const id = await db.addProject({
        client: input.client,
        name: input.name,
        category: input.category,
        currency: input.currency,
        total_fee: input.total_fee,
        type: input.type,
      });
      return { message: `Created project "${input.name}" (${id}).`, action: "add_project" };
    }
    case "update_project_category": {
      const project = await resolveProjectId(input.project_name);
      await db.updateProjectCategory(project.id, input.category);
      const readable: Record<string, string> = {
        ongoing: "Ongoing",
        prospective: "Prospective",
        completed: "Completed",
        on_hold: "On Hold",
      };
      return {
        message: `Moved ${project.name} to ${readable[input.category] || input.category}.`,
        action: "update_project_category",
      };
    }
    default:
      return { message: `Unknown action: ${name}` };
  }
}
