import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAccessWindowOpen } from "@/lib/auth";
import { announce } from "@/lib/ha";
import { logActivity } from "@/lib/log";
import { checkAnnouncementRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/db/schema";

const MAX_MESSAGE_LENGTH = 200;

export async function POST(req: NextRequest) {
  try {
    const guest = await requireAuth();
    if (!isAccessWindowOpen() && !guest.is_admin) {
      return NextResponse.json({ error: "Access not yet available" }, { status: 403 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    const rateCheck = checkAnnouncementRateLimit(guest.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Wait a bit before sending another announcement", retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    // Save to DB
    const db = getDb();
    db.prepare("INSERT INTO announcements (guest_id, guest_name, message) VALUES (?, ?, ?)").run(
      guest.id,
      guest.name,
      trimmed
    );

    // Send TTS to both HomePods
    const ttsMessage = `Message from ${guest.name}: ${trimmed}`;
    await announce(ttsMessage, "media_player.living_room_homepod");
    // Small delay to avoid overlap
    await new Promise((r) => setTimeout(r, 500));
    await announce(ttsMessage, "media_player.bathroom_homepod");

    logActivity(guest.id, guest.name, "announcement", trimmed, "announce");

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Onboarding required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Announcement failed" }, { status: 500 });
  }
}
