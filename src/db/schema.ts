import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "casito.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      agreed_at TEXT,
      session_token TEXT UNIQUE,
      is_admin INTEGER DEFAULT 0,
      family_friendly INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_seen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      guest_name TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      category TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (guest_id) REFERENCES guests(id)
    );

    CREATE TABLE IF NOT EXISTS presence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL UNIQUE,
      guest_name TEXT NOT NULL,
      status TEXT DEFAULT 'away',
      with_someone INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (guest_id) REFERENCES guests(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      guest_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (guest_id) REFERENCES guests(id)
    );

    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
    CREATE INDEX IF NOT EXISTS idx_guests_session ON guests(session_token);
    CREATE INDEX IF NOT EXISTS idx_guests_invite ON guests(invite_code);
  `);
}

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

export function seedGuests() {
  const db = getDb();
  const existing = db.prepare("SELECT COUNT(*) as c FROM guests").get() as { c: number };
  if (existing.c > 0) return;

  const guests = [
    { name: "Rick", admin: 0, ff: 0 },
    { name: "Sjef", admin: 0, ff: 0 },
    { name: "Carlos", admin: 0, ff: 0 },
    { name: "Perry", admin: 0, ff: 0 },
    { name: "Anthony", admin: 0, ff: 0 },
    { name: "Thomas", admin: 0, ff: 0 },
    { name: "Lazzy", admin: 0, ff: 0 },
    { name: "Requinard", admin: 0, ff: 0 },
    { name: "Kass", admin: 0, ff: 0 },
    { name: "Luppo", admin: 0, ff: 0 },
    { name: "Pazuzu", admin: 0, ff: 0 },
    { name: "Fen", admin: 1, ff: 0 },
    { name: "Kura", admin: 1, ff: 0 },
    { name: "Xavier", admin: 0, ff: 1 },
    { name: "Marta", admin: 0, ff: 1 },
  ];

  const insert = db.prepare(
    "INSERT INTO guests (name, invite_code, is_admin, family_friendly) VALUES (?, ?, ?, ?)"
  );
  const insertPresence = db.prepare(
    "INSERT INTO presence (guest_id, guest_name, status) VALUES (?, ?, 'away')"
  );

  const txn = db.transaction(() => {
    for (const g of guests) {
      const code = generateInviteCode(g.name);
      const result = insert.run(g.name, code, g.admin, g.ff);
      insertPresence.run(result.lastInsertRowid, g.name);
    }
  });
  txn();
}
