import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import type { Skill } from "./types";

function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const yaml = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).trim();
  const meta: Record<string, any> = {};

  // Parse simple key: value lines
  for (const line of yaml.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1 || line.startsWith(" ")) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (!val) { meta[key] = []; continue; }
    meta[key] = val;
  }

  // Parse list blocks (triggers: \n  - item)
  const triggerMatch = yaml.match(/triggers:\s*\n((?:\s+-\s+.+\n?)*)/);
  if (triggerMatch && triggerMatch[1]) {
    meta.triggers = triggerMatch[1]
      .trim()
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }

  return { meta, body };
}

function loadSkillsFromDir(dir: string): Skill[] {
  if (!existsSync(dir)) return [];
  const skills: Skill[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(dir, entry.name, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const raw = readFileSync(skillMd, "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    skills.push({
      name: meta.name || entry.name,
      description: meta.description || `Skill: ${entry.name}`,
      triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
      content: body,
      dir: path.join(dir, entry.name),
    });
  }
  return skills;
}

// Search order: global → project → hidden project → claude-compat
export function discoverSkills(projectDir: string = process.cwd()): Skill[] {
  const dirs = [
    path.join(homedir(), ".forge", "skills"),
    path.join(projectDir, "skills"),
    path.join(projectDir, ".forge", "skills"),
    path.join(projectDir, ".claude", "skills"),
  ];

  const seen = new Set<string>();
  const skills: Skill[] = [];

  for (const dir of dirs) {
    for (const skill of loadSkillsFromDir(dir)) {
      if (!seen.has(skill.name)) {
        seen.add(skill.name);
        skills.push(skill);
      }
    }
  }

  return skills;
}

export function getSkill(name: string, projectDir?: string): Skill | null {
  return discoverSkills(projectDir).find((s) => s.name === name) || null;
}
