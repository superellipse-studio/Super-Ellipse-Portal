import { NextRequest, NextResponse } from "next/server";
import { cycleTaskStatus } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing task id" }, { status: 400 });
    const status = await cycleTaskStatus(id);
    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 });
  }
}
