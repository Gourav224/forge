import { mkdirSync } from "node:fs";
import path from "node:path";

export async function writeFile(filePath: string, content: string): Promise<string> {
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    await Bun.write(filePath, content);
    return `Written: ${filePath}`;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const writeFileTool = {
  name: "write_file",
  description: "Write content to a file. Creates parent directories automatically.",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path to write" },
      content: { type: "string", description: "Content to write" },
    },
    required: ["path", "content"],
  },
};
