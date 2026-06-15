import { bashExec } from "./bash";

export async function patchFile(filePath: string, diff: string): Promise<string> {
  const tmp = `/tmp/forge-patch-${Date.now()}.diff`;
  try {
    await Bun.write(tmp, diff);
    const result = await bashExec(`patch "${filePath}" < "${tmp}"`);
    return result;
  } finally {
    await bashExec(`rm -f "${tmp}"`);
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
