import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAccessWindowOpen } from "@/lib/auth";
import { unlockDoor } from "@/lib/ha";
import { logActivity } from "@/lib/log";
import { checkDoorRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/db/schema";

const ALLOWED_DOORS: Record<string, { entityId: string; label: string }> = {
  downstairs: { entityId: "lock.intercom", label: "downstairs door" },
  upstairs: { entityId: "lock.upstairs_door", label: "upstairs door" },
};

export async function POST(req: NextRequest) {
  try {
    const guest = await requireAuth();

    if (!isAccessWindowOpen() && !guest.is_admin) {
      return NextResponse.json({ error: "Access not yet available" }, { status: 403 });
    }

    const { door, companions } = await req.json();
    const doorConfig = ALLOWED_DOORS[door];
    if (!doorConfig) {
      return NextResponse.json({ error: "Invalid door" }, { status: 400 });
    }

    const rateCheck = checkDoorRateLimit(guest.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too fast! Wait a moment.", retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    await unlockDoor(doorConfig.entityId);
    logActivity(guest.id, guest.name, `unlocked_${door}`, `Opened ${doorConfig.label}`, "door");

    // Auto-set presence to "here" when unlocking
    const db = getDb();
    const companionNames = Array.isArray(companions) ? companions : [];
    const withSomeone = companionNames.length > 0 ? 1 : 0;

    db.prepare(
      "UPDATE presence SET status = 'here', with_someone = ?, updated_at = datetime('now') WHERE guest_id = ?"
    ).run(withSomeone, guest.id);

    logActivity(guest.id, guest.name, "status_here",
      `entered the apartment${companionNames.length > 0 ? ` with ${companionNames.join(", ")}` : ""}`,
      "presence"
    );

    // Also update companions' presence if they're guests
    if (companionNames.length > 0) {
      for (const name of companionNames) {
        const companion = db.prepare("SELECT id FROM guests WHERE name = ? COLLATE NOCASE").get(name) as { id: number } | undefined;
        if (companion) {
          db.prepare(
            "UPDATE presence SET status = 'here', updated_at = datetime('now') WHERE guest_id = ?"
          ).run(companion.id);
        }
      }
    }

    return NextResponse.json({ success: true, door, label: doorConfig.label });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Onboarding required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to unlock door" }, { status: 500 });
  }
}
