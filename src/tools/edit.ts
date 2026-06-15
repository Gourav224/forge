export async function editFile(filePath: string, oldString: string, newString: string): Promise<string> {
  try {
    const original = await Bun.file(filePath).text();

    if (!original.includes(oldString)) {
      // Give a helpful error — show context around where it might be
      return `Error: old_string not found in ${filePath}.\n\nMake sure the text matches exactly (including whitespace and newlines). Use read_file to see the current content first.`;
    }

    const count = (original.split(oldString).length - 1);
    if (count > 1) {
      return `Error: old_string appears ${count} times in ${filePath}. Provide more surrounding context to make it unique.`;
    }

    const updated = original.replace(oldString, newString);
    await Bun.write(filePath, updated);
    return `Edited ${filePath}`;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const editFileTool = {
  name: "edit_file",
  description:
    "Replace an exact string in a file with new content. Safer than write_file for targeted edits. The old_string must appear exactly once — use read_file first if unsure of exact content.",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File to edit" },
      old_string: { type: "string", description: "Exact text to find (must appear exactly once)" },
      new_string: { type: "string", description: "Replacement text" },
    },
    required: ["path", "old_string", "new_string"],
  },
};
