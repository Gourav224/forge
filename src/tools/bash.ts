export async function bashExec(command: string, cwd?: string): Promise<string> {
  try {
    const proc = Bun.spawn(["bash", "-c", command], {
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) return `Exit ${exitCode}\n${stderr || stdout}`;
    return stdout || "(no output)";
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const bashTool = {
  name: "bash_exec",
  description: "Execute bash commands. Use for git, npm/bun, building, testing, or any shell operation.",
  input_schema: {
    type: "object" as const,
    properties: {
      command: { type: "string", description: "The bash command to run" },
      cwd: { type: "string", description: "Working directory (optional, defaults to project root)" },
    },
    required: ["command"],
  },
};
