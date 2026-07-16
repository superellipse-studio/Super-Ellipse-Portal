import { NextRequest, NextResponse } from "next/server";
import { setAchievement } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const { project_id, slot, member } = await req.json();
    if (!project_id || !slot) {
      return NextResponse.json({ error: "Missing project_id or slot" }, { status: 400 });
    }
    await setAchievement(project_id, Number(slot), member || "");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save achievement" }, { status: 500 });
  }
}
