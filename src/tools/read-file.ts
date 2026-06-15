export async function readFile(path: string, startLine?: number, endLine?: number): Promise<string> {
  try {
    const text = await Bun.file(path).text();
    if (!startLine && !endLine) return text;
    const lines = text.split("\n");
    return lines.slice((startLine || 1) - 1, endLine || lines.length).join("\n");
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const readFileTool = {
  name: "read_file",
  description: "Read the contents of a file. Use start_line/end_line for large files.",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path to read" },
      start_line: { type: "number", description: "First line to read (1-indexed)" },
      end_line: { type: "number", description: "Last line to read (inclusive)" },
    },
    required: ["path"],
  },
};
