import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export interface CustomTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

async function loadToolFile(filePath: string): Promise<CustomTool | null> {
  try {
    const mod = await import(filePath);
    const def = mod.default;
    if (!def || typeof def.name !== "string" || typeof def.execute !== "function") return null;
    return {
      name: def.name,
      description: def.description || `Custom tool: ${def.name}`,
      input_schema: def.input_schema || { type: "object", properties: {}, required: [] },
      execute: def.execute,
    };
  } catch (err) {
    console.error(`Failed to load custom tool ${filePath}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function loadToolsFromDir(dir: string): Promise<CustomTool[]> {
  if (!existsSync(dir)) return [];
  const tools: CustomTool[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;
    const tool = await loadToolFile(path.join(dir, entry.name));
    if (tool) tools.push(tool);
  }
  return tools;
}

export async function discoverCustomTools(projectDir: string = process.cwd()): Promise<CustomTool[]> {
  const dirs = [
    path.join(homedir(), ".forge", "tools"),
    path.join(projectDir, ".forge", "tools"),
  ];

  const seen = new Set<string>();
  const tools: CustomTool[] = [];

  for (const dir of dirs) {
    for (const tool of await loadToolsFromDir(dir)) {
      if (!seen.has(tool.name)) {
        seen.add(tool.name);
        tools.push(tool);
      }
    }
  }

  return tools;
}
