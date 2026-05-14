import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/db/schema";
import { logActivity } from "@/lib/log";

export async function POST() {
  const guest = await getSession();
  if (!guest) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  db.prepare("UPDATE guests SET agreed_at = datetime('now') WHERE id = ?").run(guest.id);

  logActivity(guest.id, guest.name, "agreed_to_rules", null, "auth");

  return NextResponse.json({ success: true });
}
