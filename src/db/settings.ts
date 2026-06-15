import { getDb } from "./client";

export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  const now = Date.now();
  const exists = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(key);
  if (exists) {
    db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = ?").run(value, now, key);
  } else {
    db.prepare("INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)").run(key, value, now, now);
  }
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
