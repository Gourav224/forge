import { getDb } from "./client";

export function getApiKey(provider: string): string | null {
  const row = getDb().prepare("SELECT key_value FROM api_keys WHERE provider = ?").get(provider) as
    | { key_value: string }
    | undefined;
  return row?.key_value || null;
}

export function setApiKey(provider: string, key: string): void {
  const db = getDb();
  const now = Date.now();
  const exists = db.prepare("SELECT 1 FROM api_keys WHERE provider = ?").get(provider);
  if (exists) {
    db.prepare("UPDATE api_keys SET key_value = ?, updated_at = ? WHERE provider = ?").run(key, now, provider);
  } else {
    db.prepare("INSERT INTO api_keys (provider, key_value, created_at, updated_at) VALUES (?, ?, ?, ?)").run(provider, key, now, now);
  }
}

export function getAllApiKeys(): Record<string, string> {
  const rows = getDb().prepare("SELECT provider, key_value FROM api_keys").all() as Array<{
    provider: string;
    key_value: string;
  }>;
  return Object.fromEntries(rows.map((r) => [r.provider, r.key_value]));
}

export function deleteApiKey(provider: string): void {
  getDb().prepare("DELETE FROM api_keys WHERE provider = ?").run(provider);
}

export function hasApiKey(provider: string): boolean {
  return getApiKey(provider) !== null;
}

export function getConfiguredProviders(): string[] {
  return (getDb().prepare("SELECT provider FROM api_keys").all() as Array<{ provider: string }>).map((r) => r.provider);
}
