import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/db/schema";
import { logActivity } from "@/lib/log";

export async function POST() {
  const guest = await getSession();

  if (guest) {
    const db = getDb();
    db.prepare("UPDATE guests SET session_token = NULL WHERE id = ?").run(guest.id);
    logActivity(guest.id, guest.name, "logged_out", null, "auth");
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("casito_session");
  return response;
}
