import { readdir } from "node:fs/promises";

export async function listDir(dir = ".", depth = 1): Promise<string> {
  const items: string[] = [];

  async function walk(d: string, currentDepth: number) {
    if (currentDepth > depth) return;
    try {
      const entries = await readdir(d, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") && currentDepth > 1) continue;
        const indent = "  ".repeat(currentDepth - 1);
        items.push(`${indent}${entry.name}${entry.isDirectory() ? "/" : ""}`);
        if (entry.isDirectory() && currentDepth < depth) {
          await walk(`${d}/${entry.name}`, currentDepth + 1);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  try {
    await walk(dir, 1);
    return items.length > 0 ? items.join("\n") : "(empty)";
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const listDirTool = {
  name: "list_dir",
  description: "List files and directories. Use depth > 1 to recurse into subdirectories.",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "Directory to list (default: current directory)" },
      depth: { type: "number", description: "How deep to recurse (default: 1)" },
    },
    required: [],
  },
};
