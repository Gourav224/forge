// Prompt content lives in Markdown files (not inline strings), loaded via Bun
// text imports so they bundle into the compiled binary. Edit the `.md` files to
// change Forge's behavior without touching code.

import systemMd from "./system.md" with { type: "text" };
import planMd from "./mode-plan.md" with { type: "text" };
import buildMd from "./mode-build.md" with { type: "text" };
import autoMd from "./mode-auto.md" with { type: "text" };
import subagentExploreMd from "./subagent-explore.md" with { type: "text" };

export const systemPrompt = systemMd.trim();
export const planPrompt = planMd.trim();
export const buildPrompt = buildMd.trim();
export const autoPrompt = autoMd.trim();
export const subagentExplorePrompt = subagentExploreMd.trim();
