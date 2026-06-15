import { unlinkSync } from "node:fs";

export async function patchFile(filePath: string, diff: string): Promise<string> {
  const tmp = `${process.env.TMPDIR || "/tmp"}/forge-patch-${Date.now()}.diff`;
  try {
    await Bun.write(tmp, diff);
    const proc = Bun.spawn(["patch", "-p1", filePath, "--input", tmp], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    if (code !== 0) return `patch failed (exit ${code})\n${stderr || stdout}`;
    return stdout || `Patched ${filePath}`;
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    try { unlinkSync(tmp); } catch { /* already gone */ }
  }
}

export const patchFileTool = {
  name: "patch_file",
  description: "Apply a unified diff patch to a file. Safer than rewriting the entire file.",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File to patch" },
      diff: { type: "string", description: "Unified diff content (output of `diff -u`)" },
    },
    required: ["path", "diff"],
  },
};
