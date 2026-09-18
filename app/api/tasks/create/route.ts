import { NextRequest, NextResponse } from "next/server";
import { addTask } from "@/lib/sheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const projectId = String(body.project_id || "").trim();
    const startDate = String(body.start_date || "");
    const endDate = String(body.due_date || "");
    if (!title || !projectId) return NextResponse.json({ error: "Task and project are required." }, { status: 400 });
    if (!startDate || !endDate) return NextResponse.json({ error: "Start Date and End Date are required." }, { status: 400 });
    if (startDate > endDate) return NextResponse.json({ error: "End Date cannot be before Start Date." }, { status: 400 });
    const id = await addTask({
      project_id: projectId,
      timeline_id: String(body.timeline_id || ""),
      title,
      assignee: String(body.assignee || "You"),
      start_date: startDate,
      due_date: endDate,
      scope: String(body.scope || "this_week"),
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create task." }, { status: 500 });
  }
}
