import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import path from "node:path";
import { mkdirSync } from "node:fs";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const dbDir = path.join(homedir(), ".forge");
    mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "forge.db");
    db = new Database(dbPath, { create: true });
    db.run("PRAGMA journal_mode = WAL;");
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, parent_id TEXT, title TEXT,
        model TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL,
        content TEXT NOT NULL, created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        provider TEXT PRIMARY KEY, key_value TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mcp_servers (
        name TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        args TEXT,
        env TEXT,
        enabled INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_id);
    `);
  }
  return db;
}

export function closeDb(): void {
  if (db) { db.close(); db = null; }
}
