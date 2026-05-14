import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/schema";
import { logActivity } from "@/lib/log";
import crypto from "crypto";

const FUNNY_WORDS = [
  "THICC", "SPICY", "FUNKY", "TURBO", "MOIST", "CRISPY", "MEGA", "JUICY",
  "CHUNKY", "COSMIC", "ULTRA", "SAUCY", "WOBBLY", "CRUNCHY", "ZESTY",
  "DUCK", "BEAN", "NOODLE", "LLAMA", "SNAIL", "WAFFLE", "YEET", "POTATO",
  "CACTUS", "GOOSE", "PICKLE", "NUGGET", "PANDA", "TACO", "KEBAB",
  "CHAOS", "DISCO", "TURNT", "VIBES", "BONK", "SPLOOT", "CRONCH",
];

function generateInviteCode(name: string): string {
  const prefix = name.toUpperCase().slice(0, 6);
  const word1 = FUNNY_WORDS[crypto.randomInt(FUNNY_WORDS.length)];
  let word2 = FUNNY_WORDS[crypto.randomInt(FUNNY_WORDS.length)];
  while (word2 === word1) word2 = FUNNY_WORDS[crypto.randomInt(FUNNY_WORDS.length)];
  const suffix = crypto.randomInt(10).toString() + "ABCDEFGHJKLMNPQRSTUVWXYZ"[crypto.randomInt(24)];
  return `${prefix}-${word1}-${word2}-${suffix}`;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    const db = getDb();
    const guests = db.prepare(
      "SELECT id, name, invite_code, agreed_at, is_admin, family_friendly, created_at, last_seen_at FROM guests ORDER BY name ASC"
    ).all();
    return NextResponse.json({ guests, adminName: admin.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { name, familyFriendly } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const db = getDb();

    const existing = db.prepare("SELECT id FROM guests WHERE name = ? COLLATE NOCASE").get(trimmedName);
    if (existing) {
      return NextResponse.json({ error: "Guest already exists" }, { status: 400 });
    }

    const code = generateInviteCode(trimmedName);
    const ff = familyFriendly ? 1 : 0;

    const result = db.prepare(
      "INSERT INTO guests (name, invite_code, is_admin, family_friendly) VALUES (?, ?, 0, ?)"
    ).run(trimmedName, code, ff);

    db.prepare(
      "INSERT INTO presence (guest_id, guest_name, status) VALUES (?, ?, 'away')"
    ).run(result.lastInsertRowid, trimmedName);

    logActivity(admin.id, admin.name, "added_guest", `Added ${trimmedName} (code: ${code})`, "admin");

    return NextResponse.json({
      success: true,
      guest: { name: trimmedName, invite_code: code, familyFriendly: !!ff },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Admin required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to add guest" }, { status: 500 });
  }
}
