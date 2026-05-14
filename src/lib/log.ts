import { getDb } from "@/db/schema";

export type LogCategory = "door" | "scene" | "media" | "presence" | "announce" | "auth" | "system" | "admin";

export function logActivity(
  guestId: number | null,
  guestName: string,
  action: string,
  detail?: string | null,
  category: LogCategory = "system"
) {
  const db = getDb();
  db.prepare(
    "INSERT INTO activity_log (guest_id, guest_name, action, detail, category) VALUES (?, ?, ?, ?, ?)"
  ).run(guestId, guestName, action, detail || null, category);
}

export function getRecentActivity(limit: number = 50, afterId?: number) {
  const db = getDb();
  if (afterId) {
    return db
      .prepare("SELECT * FROM activity_log WHERE id > ? ORDER BY id ASC LIMIT ?")
      .all(afterId, limit);
  }
  return db
    .prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?")
    .all(limit)
    .reverse();
}

export function getActivitySince(sinceId: number) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM activity_log WHERE id > ? ORDER BY id ASC")
    .all(sinceId);
}
