import { discoverSkills, getSkill } from "../skills/loader";

export async function skillTool(name?: string): Promise<string> {
  if (!name) {
    // List all available skills
    const skills = discoverSkills();
    if (skills.length === 0) return "No skills available. Add SKILL.md files to ./skills/<name>/SKILL.md";
    const list = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
    return `Available skills:\n\n${list}\n\nLoad a skill with: skill({ name: "<skill-name>" })`;
  }

  const skill = getSkill(name);
  if (!skill) {
    const available = discoverSkills().map((s) => s.name).join(", ");
    return `Skill "${name}" not found. Available: ${available || "none"}`;
  }

  return `## ${skill.name}\n\n${skill.content}`;
}

export const skillToolDef = {
  name: "skill",
  description:
    "List available skills or load a skill's instructions by name. Call with no arguments to see available skills. Call with a name to load that skill's guidance into context.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Name of the skill to load. Omit to list all available skills.",
      },
    },
    required: [],
  },
};
