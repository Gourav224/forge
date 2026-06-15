export async function searchText(pattern: string, searchPath = ".", glob?: string): Promise<string> {
  try {
    const args = ["-r", "-E", "--line-number"];
    if (glob) args.push("--include", glob);
    args.push(pattern, searchPath);

    const proc = Bun.spawn(["grep", ...args], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = await new Response(proc.stdout).text();
    return stdout.trim() || "No matches found";
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const searchTextTool = {
  name: "search_text",
  description: "Search for text patterns using grep. Supports regex and file glob filtering.",
  input_schema: {
    type: "object" as const,
    properties: {
      pattern: { type: "string", description: "Regex pattern to search for" },
      path: { type: "string", description: "Directory to search in (default: current directory)" },
      glob: { type: "string", description: "File glob filter, e.g. '*.ts' or '*.{ts,tsx}'" },
    },
    required: ["pattern"],
  },
};
