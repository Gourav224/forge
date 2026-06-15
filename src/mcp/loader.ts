import { listMcpServers } from "../db/mcp-servers";
import { McpClient } from "./client";
import type { McpTool } from "./client";

export type { McpTool };

let activeClients: McpClient[] = [];

export async function loadMcpTools(): Promise<{
  tools: any[];
  execute: (name: string, input: Record<string, unknown>) => Promise<string>;
}> {
  const servers = listMcpServers().filter((s) => s.enabled);
  activeClients = [];

  const allTools: McpTool[] = [];
  const toolToClient = new Map<string, McpClient>();

  for (const server of servers) {
    const client = new McpClient(server);
    try {
      await client.connect();
      const tools = await client.listTools();
      for (const tool of tools) {
        allTools.push(tool);
        toolToClient.set(tool.name, client);
      }
      activeClients.push(client);
      console.error(`MCP: connected to "${server.name}" (${tools.length} tools)`);
    } catch (err) {
      console.error(`MCP: failed to connect to "${server.name}": ${err instanceof Error ? err.message : err}`);
      client.disconnect();
    }
  }

  // Convert MCP tools to Forge's tool format
  const forgeTools = allTools.map((t) => ({
    name: t.name,
    description: `[${t.serverName}] ${t.description}`,
    input_schema: t.input_schema,
  }));

  const execute = async (name: string, input: Record<string, unknown>): Promise<string> => {
    const client = toolToClient.get(name);
    if (!client) return `MCP tool not found: ${name}`;
    return client.callTool(name, input);
  };

  return { tools: forgeTools, execute };
}

export function disconnectAllMcp(): void {
  for (const client of activeClients) client.disconnect();
  activeClients = [];
}
