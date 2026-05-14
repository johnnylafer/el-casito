import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "@/db/schema";

const SESSION_COOKIE = "casito_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";

interface Guest {
  id: number;
  name: string;
  invite_code: string;
  agreed_at: string | null;
  session_token: string | null;
  is_admin: number;
  created_at: string;
  last_seen_at: string | null;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

export async function getSession(): Promise<Guest | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const guest = db
    .prepare("SELECT * FROM guests WHERE session_token = ?")
    .get(hashToken(token)) as Guest | undefined;

  if (!guest) return null;

  // Update last seen
  db.prepare("UPDATE guests SET last_seen_at = datetime('now') WHERE id = ?").run(guest.id);

  return guest;
}

export async function requireAuth(): Promise<Guest> {
  const guest = await getSession();
  if (!guest) throw new Error("Unauthorized");
  if (!guest.agreed_at) throw new Error("Onboarding required");
  return guest;
}

export async function requireAdmin(): Promise<Guest> {
  const guest = await requireAuth();
  if (!guest.is_admin) throw new Error("Admin required");
  return guest;
}

export function loginWithCode(code: string): { token: string; guest: Guest } | null {
  const db = getDb();
  const guest = db
    .prepare("SELECT * FROM guests WHERE invite_code = ? COLLATE NOCASE")
    .get(code.trim().toUpperCase()) as Guest | undefined;

  if (!guest) return null;

  const rawToken = generateSessionToken();
  const hashed = hashToken(rawToken);

  db.prepare("UPDATE guests SET session_token = ?, last_seen_at = datetime('now') WHERE id = ?").run(
    hashed,
    guest.id
  );

  return { token: rawToken, guest: { ...guest, session_token: hashed } };
}

export function isAccessWindowOpen(): boolean {
  const now = new Date();
  const start = new Date(process.env.ACCESS_START || "2026-05-16T08:30:00Z");
  const end = new Date(process.env.ACCESS_END || "2026-05-18T16:00:00Z");
  return now >= start && now <= end;
}

export function getAccessWindowInfo(): { open: boolean; start: Date; end: Date; now: Date } {
  const now = new Date();
  const start = new Date(process.env.ACCESS_START || "2026-05-16T08:30:00Z");
  const end = new Date(process.env.ACCESS_END || "2026-05-18T16:00:00Z");
  return { open: now >= start && now <= end, start, end, now };
}
