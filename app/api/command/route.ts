import { NextRequest, NextResponse } from "next/server";
import { runCommand } from "@/lib/claude";
import { getAllData } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();
    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Missing command" }, { status: 400 });
    }
    const data = await getAllData();
    const result = await runCommand(command, data);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
