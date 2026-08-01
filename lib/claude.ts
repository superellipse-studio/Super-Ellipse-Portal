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
    name: "add_timeline_stage",
    description: "Add a dated production stage to a project timeline/calendar.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        label: { type: "string" },
        start_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        end_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        status: { type: "string", enum: ["upcoming", "current", "completed"] },
        sort_order: { type: "number" },
      },
      required: ["project_name", "label", "start_date", "end_date"],
    },
  },
  {
    name: "update_timeline_stage",
    description: "Reschedule, rename, or change the status of an existing project timeline stage.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        stage_search: { type: "string" },
        label: { type: "string" },
        start_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        end_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        status: { type: "string", enum: ["upcoming", "current", "completed"] },
        sort_order: { type: "number" },
      },
      required: ["project_name", "stage_search"],
    },
  },
  {
    name: "set_current_timeline_stage",
    description: "Make one timeline stage the current phase of a project. This also synchronizes the project's current_phase field.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        stage_search: { type: "string" },
      },
      required: ["project_name", "stage_search"],
    },
  },
  {
    name: "set_project_timeline_color",
    description: "Set a project's calendar color using a CSS hex color such as #D97757.",
    input_schema: {
      type: "object",
      properties: { project_name: { type: "string" }, color: { type: "string" } },
      required: ["project_name", "color"],
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
    case "add_timeline_stage": {
      const project = await resolveProjectId(input.project_name);
      const id = await db.addTimelineItem({
        project_id: project.id,
        label: input.label,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status || "upcoming",
        sort_order: input.sort_order || 0,
      });
      if (input.status === "current") await db.setCurrentTimelineStage(project.id, id);
      return { message: `Added ${input.label} to ${project.name}'s timeline.`, action: "add_timeline_stage" };
    }
    case "update_timeline_stage": {
      const project = await resolveProjectId(input.project_name);
      const matches = await db.findTimelineItems({ project_id: project.id, labelContains: input.stage_search });
      if (matches.length === 0) throw new Error(`Couldn't find a timeline stage matching "${input.stage_search}"`);
      const target = matches[0];
      await db.updateTimelineItem(target.data.id, {
        label: input.label,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status,
        sort_order: input.sort_order,
      });
      if (input.status === "current") await db.setCurrentTimelineStage(project.id, target.data.id);
      return { message: `Updated "${target.data.label}" for ${project.name}.`, action: "update_timeline_stage" };
    }
    case "set_current_timeline_stage": {
      const project = await resolveProjectId(input.project_name);
      const matches = await db.findTimelineItems({ project_id: project.id, labelContains: input.stage_search });
      if (matches.length === 0) throw new Error(`Couldn't find a timeline stage matching "${input.stage_search}"`);
      await db.setCurrentTimelineStage(project.id, matches[0].data.id);
      return { message: `${project.name} is now at "${matches[0].data.label}".`, action: "set_current_timeline_stage" };
    }
    case "set_project_timeline_color": {
      const project = await resolveProjectId(input.project_name);
      const color = String(input.color || "").trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Color must be a 6-digit hex value, for example #D97757");
      await db.updateProjectTimelineColor(project.id, color);
      return { message: `Updated ${project.name}'s calendar color.`, action: "set_project_timeline_color" };
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
