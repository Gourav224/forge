import { bashExec, bashTool } from "./bash";
import { readFile, readFileTool } from "./read-file";
import { writeFile, writeFileTool } from "./write-file";
import { editFile, editFileTool } from "./edit";
import { listDir, listDirTool } from "./list-dir";
import { searchText, searchTextTool } from "./search-text";
import { httpFetch, httpFetchTool } from "./http-fetch";
import { patchFile, patchFileTool } from "./patch-file";
import { skillTool, skillToolDef } from "./skill";

export { bashExec, readFile, writeFile, editFile, listDir, searchText, httpFetch, patchFile };

export const TOOLS = [
  bashTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirTool,
  searchTextTool,
  httpFetchTool,
  patchFileTool,
  skillToolDef,
];

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

// MCP executor registry — populated at runtime by mcp/loader.ts
let mcpExecutor: ((name: string, input: Record<string, unknown>) => Promise<string>) | null = null;

export function registerMcpExecutor(fn: (name: string, input: Record<string, unknown>) => Promise<string>) {
  mcpExecutor = fn;
}

export async function executeTool(tool: ToolCall, signal?: AbortSignal): Promise<string> {
  switch (tool.name) {
    case "bash_exec":   return bashExec(tool.input.command as string, tool.input.cwd as string | undefined, undefined, signal);
    case "read_file":   return readFile(tool.input.path as string, tool.input.start_line as number, tool.input.end_line as number);
    case "write_file":  return writeFile(tool.input.path as string, tool.input.content as string);
    case "edit_file":   return editFile(tool.input.path as string, tool.input.old_string as string, tool.input.new_string as string);
    case "list_dir":    return listDir(tool.input.path as string, tool.input.depth as number);
    case "search_text": return searchText(tool.input.pattern as string, tool.input.path as string, tool.input.glob as string);
    case "http_fetch":  return httpFetch(tool.input.url as string, undefined, undefined, signal);
    case "patch_file":  return patchFile(tool.input.path as string, tool.input.diff as string);
    case "skill":       return skillTool(tool.input.name as string | undefined);
    default:
      if (mcpExecutor) return mcpExecutor(tool.name, tool.input);
      return `Unknown tool: ${tool.name}`;
  }
}
