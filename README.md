<div align="center">

# ◈ Forge

**A terminal-native AI coding agent — and a hackable harness you can make your own.**

Forge takes a natural-language task and carries it out in your codebase: reading files, running commands, editing code, searching, and verifying — across any LLM provider, with a clean Ink TUI.

Built with **Bun · TypeScript · SQLite · Ink** · inspired by [pi.dev](https://pi.dev) and [opencode](https://opencode.ai).

</div>

```
█▀▀ █▀█ █▀█ █▀▀ █▀▀
█▀▀ █▄█ █▀▄ █▄█ ██▄   forge your code with AI
```

---

## Why Forge

Most coding agents are a black box. Forge is a **small, readable harness** (~3k lines) you can actually understand and extend:

- 🧠 **Agent loop** — call model → run tools → repeat, with an iteration guard and context compaction. One core loop ([`src/agent/loop.ts`](src/agent/loop.ts)) shared by the CLI and the TUI.
- 🔐 **Permission modes** — `plan` (read-only, proposes a plan), `build` (edits require approval), `auto` (unattended). Risky tools are gated before they run.
- 🪄 **Sub-agents** — delegate a focused, read-only investigation to a child agent via the `task` tool, keeping your main context clean.
- 🗜️ **Context compaction** — long sessions auto-summarize older turns so they never blow the context window. Manual `/compact` too.
- 🌿 **Session branching** — every conversation is persisted to SQLite; `/branch` and `/rewind` fork a new path from any point (a `parent_id` tree).
- 🧩 **Skills & MCP** — drop a `SKILL.md` for domain guidance; connect any Model Context Protocol server for extra tools.
- 🎛️ **Multi-provider** — Anthropic, OpenAI, OpenRouter, Ollama (local), or any OpenAI-compatible endpoint. Switch live with `/model`.
- ✍️ **Prompts as files** — the system & mode prompts live in [`src/prompts/*.md`](src/prompts), not buried in code. Edit behavior without touching logic.

## Install

```bash
git clone <repo> forge && cd forge
bun install

# interactive setup — pick a provider, paste a key
bun src/index.ts login        # CLI wizard
#   …or launch the TUI and run /login

# build a standalone binary
bun run build                 # → ./dist/forge
```

## Quick start

```bash
forge                                            # launch the interactive TUI
forge "add a /health route and run the tests"    # one-shot task
forge --plan "refactor the auth module"          # read-only plan first
forge -m openai:gpt-4o "explain this codebase"   # pick a model
```

### The TUI

```
✦ forge
  ✓ ▸ read   src/server.ts            22ms
  ✓ ✎ edit   src/server.ts             8ms
  ✓ $ bash   bun test                 1.3s
    └ 12 pass

  I added the /health route and verified — all green.

╭──────────────────────────────────────────────────────────╮
│ ❯ ask Forge to build, fix, or explain…                   │
╰──────────────────────────────────────────────────────────╯
  ↵ send   ⌃J newline   ←→ move   ↑↓ history
─────────────────────────────────────────────────────────────
 ◈ forge · build · anthropic:claude-sonnet-4-6 · ⎇ main · ctx 23% · ready
```

## Commands

| TUI command | What it does |
|-------------|-------------|
| `/mode plan\|build\|auto` | switch operating mode |
| `/login` · `/config` | add a provider key · show configuration |
| `/model` · `/models` | switch model · discover available models |
| `/compact` | summarize the conversation to free context |
| `/branch` · `/rewind <n>` | fork the session · rewind to message *n* |
| `/sessions` · `/new` · `/clear` | browse history · fresh session · clear screen |

| CLI command | What it does |
|-------------|-------------|
| `forge login` | interactive provider + key setup |
| `forge provider list \| logout <id>` | manage providers |
| `forge config [path\|get\|set\|unset]` | view / edit settings |
| `forge clean` · `forge reset` | delete history · wipe everything |
| `forge mcp add\|list\|remove` | manage MCP servers |
| `--plan` · `--auto` · `--mode <m>` | run in a specific mode |

## Architecture

```
CLI / TUI ─► resolveProvider ─► runLoop ──► provider.chat (stream)
                                  │            │
                                  │            └─ tool_use ─► executeTool ─► tools / MCP / task(sub-agent)
                                  ├─ mode tool-filter + permission gate
                                  └─ compaction when context fills
                                               │
                                          SQLite (sessions · messages · keys · settings · mcp)
```

See [`docs/architecture.md`](docs/architecture.md) for the full module map, and [`docs/agent-loop.md`](docs/agent-loop.md) for the harness internals.

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Bun** | fast start, native SQLite, single-binary compile, text imports |
| TUI | **Ink (React)** | declarative terminal UI |
| Storage | **bun:sqlite** | zero-config, WAL, prepared statements — no ORM |
| Providers | Anthropic / OpenAI SDKs + `fetch` | streaming, abortable |
| Language | **TypeScript** (strict) | type-safe, no build step in dev |

## Documentation

[Docs index](docs/index.md) · [Modes & permissions](docs/modes.md) · [Agent loop](docs/agent-loop.md) · [Tools](docs/tools.md) · [Providers](docs/providers.md) · [Skills](docs/skills.md) · [MCP](docs/mcp.md) · [Troubleshooting](docs/troubleshooting.md)

See [ROADMAP.md](ROADMAP.md) for what's done and what's next.

## License

Personal project — MIT.
