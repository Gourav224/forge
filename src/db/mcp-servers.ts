import { getDb } from "./client";

export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  created_at: number;
}

type McpServerRow = {
  name: string;
  command: string;
  args: string | null;
  env: string | null;
  enabled: number;
  created_at: number;
};

function rowToServer(row: McpServerRow): McpServer {
  return {
    name: row.name,
    command: row.command,
    args: row.args ? JSON.parse(row.args) : [],
    env: row.env ? JSON.parse(row.env) : {},
    enabled: row.enabled === 1,
    created_at: row.created_at,
  };
}

export function addMcpServer(name: string, command: string, args: string[] = [], env: Record<string, string> = {}): void {
  const db = getDb();
  const now = Date.now();
  const exists = db.prepare("SELECT 1 FROM mcp_servers WHERE name = ?").get(name);
  if (exists) {
    db.prepare("UPDATE mcp_servers SET command = ?, args = ?, env = ? WHERE name = ?").run(
      command, JSON.stringify(args), JSON.stringify(env), name
    );
  } else {
    db.prepare(
      "INSERT INTO mcp_servers (name, command, args, env, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)"
    ).run(name, command, JSON.stringify(args), JSON.stringify(env), now);
  }
}

export function listMcpServers(): McpServer[] {
  return (getDb().prepare("SELECT * FROM mcp_servers ORDER BY name").all() as McpServerRow[]).map(rowToServer);
}

export function getMcpServer(name: string): McpServer | null {
  const row = getDb().prepare("SELECT * FROM mcp_servers WHERE name = ?").get(name) as McpServerRow | undefined;
  return row ? rowToServer(row) : null;
}

export function removeMcpServer(name: string): void {
  getDb().prepare("DELETE FROM mcp_servers WHERE name = ?").run(name);
}

export function toggleMcpServer(name: string, enabled: boolean): void {
  getDb().prepare("UPDATE mcp_servers SET enabled = ? WHERE name = ?").run(enabled ? 1 : 0, name);
}
