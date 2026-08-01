import { NextRequest, NextResponse } from "next/server";
import { createDailyBrief } from "@/lib/dailyBrief";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, hasItems } = await createDailyBrief();

    // Set DAILY_BRIEF_SEND_EMPTY=true if you also want a quiet-day message.
    const shouldSend = hasItems || process.env.DAILY_BRIEF_SEND_EMPTY === "true";
    if (shouldSend) await sendTelegramMessage(message);

    return NextResponse.json({
      success: true,
      sent: shouldSend,
      preview: message,
    });
  } catch (error) {
    console.error("Daily Telegram brief failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
