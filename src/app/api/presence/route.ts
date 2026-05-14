import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSession } from "@/lib/auth";
import { getDb } from "@/db/schema";
import { logActivity } from "@/lib/log";

export async function GET() {
  const guest = await getSession();
  if (!guest) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const presence = db.prepare("SELECT * FROM presence ORDER BY guest_name ASC").all();

  return NextResponse.json({ presence });
}

export async function POST(req: NextRequest) {
  try {
    const guest = await requireAuth();
    const { status, withSomeone } = await req.json();

    if (!["here", "terrain", "away"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      "UPDATE presence SET status = ?, with_someone = ?, updated_at = datetime('now') WHERE guest_id = ?"
    ).run(status, withSomeone ? 1 : 0, guest.id);

    const statusLabels: Record<string, string> = {
      here: "is at the apartment",
      terrain: "is at the pride",
      away: "left",
    };

    let detail = `${statusLabels[status]}`;
    if (withSomeone && status === "here") {
      detail += " (with someone)";
    }

    logActivity(guest.id, guest.name, `status_${status}`, detail, "presence");

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Onboarding required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Presence update failed" }, { status: 500 });
  }
}
