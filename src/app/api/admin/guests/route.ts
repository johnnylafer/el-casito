import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/schema";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const guests = db.prepare("SELECT id, name, invite_code, agreed_at, is_admin, created_at, last_seen_at FROM guests ORDER BY name ASC").all();
    return NextResponse.json({ guests });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
