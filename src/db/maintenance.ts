import { homedir } from "node:os";
import path from "node:path";
import { getDb } from "./client";

export function getDbPath(): string {
  return path.join(homedir(), ".forge", "forge.db");
}

export interface DbStats {
  sessions: number;
  messages: number;
  apiKeys: number;
  mcpServers: number;
  settings: number;
}

export function getDbStats(): DbStats {
  const db = getDb();
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  return {
    sessions: count("sessions"),
    messages: count("messages"),
    apiKeys: count("api_keys"),
    mcpServers: count("mcp_servers"),
    settings: count("settings"),
  };
}

/** Delete conversation history (sessions + messages). Keeps keys, settings, MCP servers. */
export function clearSessions(): { sessions: number; messages: number } {
  const db = getDb();
  const before = getDbStats();
  db.run("DELETE FROM messages;");
  db.run("DELETE FROM sessions;");
  return { sessions: before.sessions, messages: before.messages };
}

/** Wipe everything — sessions, messages, keys, settings, MCP servers. */
export function resetAll(): DbStats {
  const db = getDb();
  const before = getDbStats();
  db.run("DELETE FROM messages;");
  db.run("DELETE FROM sessions;");
  db.run("DELETE FROM api_keys;");
  db.run("DELETE FROM settings;");
  db.run("DELETE FROM mcp_servers;");
  return before;
}
