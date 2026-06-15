const DEFAULT_TIMEOUT_MS = 30_000;

export async function bashExec(
  command: string,
  cwd?: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<string> {
  try {
    const proc = Bun.spawn(["bash", "-c", command], {
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), timeoutMs)
    );
    const aborted = signal
      ? new Promise<"aborted">((resolve) =>
          signal.addEventListener("abort", () => resolve("aborted"), { once: true })
        )
      : null;

    const races: Promise<string>[] = [proc.exited.then(() => "done"), timeout];
    if (aborted) races.push(aborted);

    const winner = await Promise.race(races);

    if (winner === "timeout") {
      proc.kill();
      return `Error: command timed out after ${timeoutMs / 1000}s\n$ ${command}`;
    }
    if (winner === "aborted") {
      proc.kill();
      return `Error: command aborted\n$ ${command}`;
    }

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
