import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export function loadAgentsMd(startDir: string = process.cwd()): string | null {
  const parts: string[] = [];

  // 1. Global personal instructions
  const global = path.join(homedir(), ".forge", "AGENTS.md");
  if (existsSync(global)) parts.push(readFileSync(global, "utf-8"));

  // 2. Walk up from startDir to find project AGENTS.md
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, "AGENTS.md");
    if (existsSync(candidate)) {
      parts.push(readFileSync(candidate, "utf-8"));
      break; // stop at first project-level match
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}
