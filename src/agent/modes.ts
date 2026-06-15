// Agent operating modes — the core of the harness.
//
//   plan  — read-only. The agent can explore and propose a plan, but cannot
//           run shell commands or modify files. Risky tools are removed.
//   build — full access, but risky tools (bash/write/edit/patch) require
//           explicit approval before they run.
//   auto  — full access with no approval prompts ("yolo"). Use with care.

import { planPrompt, buildPrompt, autoPrompt } from "../prompts/index";

export type AgentMode = "plan" | "build" | "auto";

export const DEFAULT_MODE: AgentMode = "build";

export function isMode(s: string): s is AgentMode {
  return s === "plan" || s === "build" || s === "auto";
}

// Tools that only observe — never mutate the filesystem or run commands.
export const READONLY_TOOLS = new Set([
  "read_file",
  "list_dir",
  "search_text",
  "http_fetch",
  "skill",
]);

/** A tool is "risky" if it can change the system. MCP/custom tools are risky by default. */
export function isRiskyTool(name: string): boolean {
  return !READONLY_TOOLS.has(name);
}

/** In plan mode, strip out anything that can mutate state. */
export function toolsForMode<T extends { name: string }>(mode: AgentMode, tools: T[]): T[] {
  if (mode !== "plan") return tools;
  return tools.filter((t) => READONLY_TOOLS.has(t.name));
}

/** Whether a tool call needs user approval before executing in this mode. */
export function needsApproval(mode: AgentMode, toolName: string): boolean {
  if (mode === "auto") return false;
  if (mode === "plan") return false; // risky tools aren't even offered
  return isRiskyTool(toolName); // build mode
}

export function modePrompt(mode: AgentMode): string {
  switch (mode) {
    case "plan": return `\n\n${planPrompt}`;
    case "auto": return `\n\n${autoPrompt}`;
    default: return `\n\n${buildPrompt}`;
  }
}

export function describeMode(mode: AgentMode): string {
  switch (mode) {
    case "plan": return "plan · read-only, proposes changes";
    case "auto": return "auto · full access, no prompts";
    default: return "build · edits need approval";
  }
}
