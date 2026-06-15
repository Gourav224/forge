export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  content: string; // full SKILL.md body (without frontmatter)
  dir: string;
}
