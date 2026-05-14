import { NextRequest, NextResponse } from "next/server";
import { getSession, requireAuth, isAccessWindowOpen } from "@/lib/auth";
import { getRecentActivity, getActivitySince, logActivity } from "@/lib/log";
import { announce } from "@/lib/ha";
import { checkAnnouncementRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const guest = await getSession();
  if (!guest) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const afterId = req.nextUrl.searchParams.get("after");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  if (afterId) {
    const entries = getActivitySince(parseInt(afterId));
    return NextResponse.json({ entries, hasMore: false });
  }

  const entries = getRecentActivity(limit);
  return NextResponse.json({ entries });
}

// POST: send a chat message, optionally as an announcement
export async function POST(req: NextRequest) {
  try {
    const guest = await requireAuth();
    if (!isAccessWindowOpen() && !guest.is_admin) {
      return NextResponse.json({ error: "Access not yet available" }, { status: 403 });
    }

    const { message, asAnnouncement } = await req.json();
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const trimmed = message.trim().slice(0, 200);

    // Always log as chat message
    logActivity(guest.id, guest.name, "chat_message", trimmed, "announce");

    // Optionally also announce on speakers
    if (asAnnouncement) {
      const rateCheck = checkAnnouncementRateLimit(guest.id);
      if (!rateCheck.allowed) {
        // Still save the chat message but skip the TTS
        return NextResponse.json({
          success: true,
          announced: false,
          reason: "Rate limited - message saved to chat but not announced on speakers",
        });
      }

      const ttsMessage = `${guest.name} says: ${trimmed}`;
      try {
        await announce(ttsMessage, "media_player.living_room_homepod");
        await new Promise((r) => setTimeout(r, 500));
        await announce(ttsMessage, "media_player.bathroom_homepod");
      } catch {
        // TTS failed but chat message was saved - don't fail the whole request
      }

      return NextResponse.json({ success: true, announced: true });
    }

    return NextResponse.json({ success: true, announced: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Onboarding required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
