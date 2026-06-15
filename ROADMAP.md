# Roadmap

Honest status of Forge — what works today and what's next.

## ✅ Done

**Core agent**
- Multi-step agent loop (call model → run tools → repeat) with iteration guard — [`src/agent/loop.ts`](src/agent/loop.ts)
- One loop shared by CLI ([`src/agent.ts`](src/agent.ts)) and TUI ([`src/agent-tui.ts`](src/agent-tui.ts))
- 10 built-in tools: bash, read/write/edit/patch file, list dir, search, http fetch, skill, task
- Streaming output, abortable mid-response (Ctrl+C / Esc)

**Harness features**
- Operating modes: `plan` (read-only), `build` (approval-gated edits), `auto` (unattended) — [`src/agent/modes.ts`](src/agent/modes.ts)
- Permission gate for risky tools, with in-TUI approval (`y` / `n` / `a`) — [`src/ui/Approval.tsx`](src/ui/Approval.tsx)
- Sub-agents via the `task` tool (read-only, depth-guarded) — [`src/agent/subagent.ts`](src/agent/subagent.ts)
- Context compaction, automatic + manual `/compact` — [`src/agent/compaction.ts`](src/agent/compaction.ts)
- Context-window meter in the status bar — [`src/agent/context.ts`](src/agent/context.ts)
- Session branching / rewind (`parent_id` tree) — `/branch`, `/rewind`

**Providers & config**
- Anthropic, OpenAI, OpenRouter, Ollama, and custom OpenAI-compatible endpoints
- Interactive login (CLI `forge login` + TUI `/login`), masked key entry
- Dynamic model discovery (`/models`)
- SQLite-backed config: keys, settings, MCP servers; `forge config get/set/unset`
- Maintenance: `forge clean`, `forge reset`

**Extensibility & UX**
- Skills system (`SKILL.md` discovery + `skill` tool) — 9 built-in skills
- MCP client (JSON-RPC over stdio) — `forge mcp add/list/remove`
- `AGENTS.md` project instructions (frontmatter-stripped)
- Prompts externalized to Markdown files — [`src/prompts/`](src/prompts)
- Ink TUI: markdown rendering, welcome banner, tool-call rows, responsive status bar
- Full input editor: cursor movement (←→, ⌃A/⌃E), multi-line (⌃J), paste, history
- Single-binary compile (`bun run build`)

## 🔜 Next

- **Streaming sub-agent output** — surface a sub-agent's tool calls live in the TUI instead of only its final report.
- **Session tree viewer** — visualize and jump between branches (`parent_id` is already stored).
- **Diff preview on approval** — show the actual edit/diff in the permission prompt before `y/n`.
- **Per-tool / per-path permission rules** — remember "always allow `bash: bun test`", protect paths.
- **Token-accurate compaction** — use real tokenizer counts instead of the char/4 estimate.
- **LSP integration** — go-to-definition / references as tools (opencode-style).
- **Export/share** — dump a session to Markdown or an HTML transcript.

## 💡 Ideas

- Plugin/extension API (TypeScript extensions, pi.dev-style)
- Encrypted key storage
- Cost tracking per session
- Custom themes
