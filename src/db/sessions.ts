import { randomUUID } from "node:crypto";
import { getDb } from "./client";

export interface Session {
  id: string;
  parent_id: string | null;
  title: string;
  model: string;
  created_at: number;
  updated_at: number;
}

export interface SessionMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: number;
}

export function createSession(model: string, title: string): Session {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (id, parent_id, title, model, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?)"
  ).run(id, title, model, now, now);
  return { id, parent_id: null, title, model, created_at: now, updated_at: now };
}

export function getSession(id: string): Session | null {
  return (getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Session) || null;
}

export function listSessions(limit = 20): Session[] {
  return getDb().prepare("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?").all(limit) as Session[];
}

export function saveMessage(sessionId: string, role: "user" | "assistant" | "tool", content: string): void {
  const db = getDb();
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(), sessionId, role, content, Date.now()
  );
  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(Date.now(), sessionId);
}

export function getSessionMessages(sessionId: string): SessionMessage[] {
  return getDb()
    .prepare("SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC")
    .all(sessionId) as SessionMessage[];
}
