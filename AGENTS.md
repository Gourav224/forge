# Forge — Self-Development Instructions

This file is read by AI agents (including Forge itself) when working on the Forge codebase.

## What Forge Is

A terminal-based coding agent. Users type natural language, Forge calls tools (bash, file read/write, grep, HTTP), and streams back results. Supports multiple LLM providers, persistent SQLite sessions, a TUI built with Ink, and an extensible skill system.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Bun | NEVER use Node.js APIs when Bun has an equivalent |
| Database | `bun:sqlite` | WAL mode, prepared statements, no ORM |
| TUI | Ink v7 (React) | Box/Text/useInput — no blessed, no chalk for layout |
| CLI parsing | Commander.js | Subcommands: `mcp add/list/remove` handled manually |
| HTTP | `fetch` (built-in) | AbortSignal for cancellation |
| File I/O | `Bun.file()`, `Bun.write()` | Not `fs.readFile` / `fs.writeFile` |
| Shell | `Bun.spawn()` | Not `execa`, not `child_process.exec` |
| Config | SQLite | API keys + settings in `~/.local/share/forge/forge.db` |

## Module Map

```
src/
├── index.ts           CLI entry — Commander, subcommands (login/config/reset/clean/mcp), launchTui()
├── agent.ts           CLI adapter → runLoop (readline approval on a TTY)
├── agent-tui.ts       TUI adapter → runLoop (callback hooks)
├── agent/             loop.ts (the core loop) + modes.ts + compaction.ts + context.ts + subagent.ts
├── prompts/           system + mode + sub-agent prompts as *.md, loaded via Bun text imports
├── providers/         One file per LLM provider + types.ts + discovery.ts + index.ts
├── tools/             One file per tool + index.ts (executeTool dispatcher) + task.ts (sub-agent)
├── skills/            loader.ts (discovery) + tool.ts (skill() tool definition)
├── mcp/               client.ts — JSON-RPC 2.0 over Bun.spawn stdio
├── db/                client.ts (singleton) + one file per domain (sessions, api-keys, maintenance…)
├── config/            agents-md.ts, providers.ts (catalog), prompt.ts (readline), login.ts
└── ui/                App.tsx + ChatPane/ToolCall/StatusBar/Input/Banner/Approval/Login + editor.ts + markdown.tsx + theme.ts
```

## The agent loop

`src/agent/loop.ts` is the single source of truth. `agent.ts` (CLI) and `agent-tui.ts` (TUI) are thin adapters that build a `LoopHooks` object and call `runLoop()`. Don't fork the loop — add a hook. Modes (`plan`/`build`/`auto`) filter tools and gate risky calls; see `src/agent/modes.ts`.

## Key Patterns

### Provider Interface

All providers implement `ProviderClient` from `src/providers/types.ts`:

```typescript
interface ProviderClient {
  chat(messages, systemPrompt, tools, onStream?, signal?): Promise<StreamingResponse>
}
```

`signal` is an `AbortSignal` from `AbortController`. Thread it to fetch calls and `Bun.spawn` processes.

### Tool Execution

All tools return `Promise<string>`. The dispatcher in `src/tools/index.ts` calls them and returns the string result to the agent loop. Tool errors are returned as strings, not thrown.

### Agent Loop

```
1. Build messages array from session history
2. Call provider.chat(messages, system, tools, onStream, signal)
3. If stopReason == "tool_use": execute each tool, append results, goto 2
4. If stopReason == "end_turn": done
5. Guard: max 40 iterations (getSetting("agent.max_iterations") ?? 40)
```

### TUI Abort

`App.tsx` creates an `AbortController`. Ctrl+C calls `controller.abort()`. The signal flows through `agent-tui.ts` → `provider.chat` → `executeTool`. Anthropic uses `stream.abort()`. OpenAI/Ollama/Custom use `fetch signal`. `bash_exec` uses `proc.kill()`.

### SQLite

```typescript
import { db } from "../db/client";
// WAL mode + foreign_keys enabled at startup
const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
const row = stmt.get(id);
```

Never interpolate values into SQL strings.

### AGENTS.md Loading

`src/config/agents-md.ts` walks up from CWD looking for `AGENTS.md`, then checks `~/.forge/AGENTS.md`. YAML frontmatter is stripped before injection into the system prompt.

## Coding Rules

1. **Bun over Node**: `Bun.file()` not `fs.readFile`, `Bun.spawn()` not `execa`, `bun:sqlite` not `better-sqlite3`
2. **verbatimModuleSyntax**: Type-only imports must use `import type { ... }` — the TypeScript config enforces this
3. **No ORMs, no Express, no dotenv** — SQLite directly, `Bun.serve()` for HTTP, Bun loads `.env` automatically
4. **Tools return strings**: Never throw from a tool handler — return the error as a string
5. **Feature files, not monoliths**: Each tool is one file, each provider is one file
6. **AbortSignal threading**: Any long-running operation should accept and respect a signal
7. **ALWAYS_IGNORE in list_dir**: `new Set([".git","node_modules",".next","dist",".turbo"])` — never list these

## Common Gotchas

- `Bun.spawn` stdout is a `ReadableStream`, not a `number` — cast before calling `.getReader()`
- `Bun.spawn` stdin is a `FileSink`, not a `number` — check `typeof stdin !== "number"` before `.write()`
- MCP pending map can leak if timeout fires after response arrives — always `clearTimeout` + `pending.delete` on both resolve and reject paths
- Anthropic streaming: use `stream.abort()`, not `stream.controller.abort()` — the method is on the stream directly
- OpenAI tool_calls come in chunks indexed by array position — accumulate by index, not by id
- The `task` tool's executor is **lazy-imported** inside `executeTool` to break the `tools → subagent → loop → tools` import cycle — keep it that way
- Prompts are `.md` files imported with `with { type: "text" }`; a `*.md` ambient type lives in `src/prompts/md.d.ts`. Edit the markdown, not inline strings
- `bun build --compile` needs `react-devtools-core` installed (Ink's optional peer) or it fails to resolve

## Build and Run

```bash
bun install                    # install dependencies
bun --hot ./src/index.ts       # dev mode with hot reload
bun run build                  # compile to ./dist/forge binary
bun run install:global         # install to /usr/local/bin/forge
bun test                       # run tests
bunx tsc --noEmit              # type-check without emitting
```

## Skills Directory

`skills/<name>/SKILL.md` — YAML frontmatter with `name`, `description`, `triggers`. The body is injected as tool result when the agent calls `skill({ name })`. Built-in skills: git, typescript, react, testing, bun, sql, code-review, refactoring, api-design.

## Docs

Full documentation is in `docs/`:
- `docs/index.md` — navigation
- `docs/architecture.md` — full module map and data flow
- `docs/tools.md` — all 9 built-in tools
- `docs/providers.md` — provider setup
- `docs/mcp.md` — MCP integration
- `docs/skills.md` — skills system
- `docs/troubleshooting.md` — FAQ
