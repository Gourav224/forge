# Architecture

## Data Flow

```
User input (TUI or CLI)
        │
        ▼
   src/index.ts          ← CLI entry, Commander.js, launchTui()
        │
        ├── TUI mode ──► src/ui/App.tsx      ← Ink TUI, AbortController
        │                     │
        │                     ▼
        │               src/agent-tui.ts     ← TUI agent loop, callbacks
        │
        └── CLI mode ──► src/agent.ts        ← CLI agent loop, stdout
                              │
                              ▼
                    src/providers/index.ts   ← resolveProvider(modelString)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              Anthropic             OpenAI / Ollama / Custom
              streaming             (SSE or JSON)
                    │
                    ▼
              LLM Response
              (text + tool_calls)
                    │
                    ▼
              src/tools/index.ts     ← executeTool(name, input, signal?)
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       bash_exec  read_file  skill  ...
                              │
                              ▼
                    src/skills/loader.ts    ← discover + load SKILL.md
                              │
                              ▼
                         skill content injected as tool result
                              │
                    ◄─────────┘
              (loop: append tool result → re-call LLM)
                    │
                    ▼
              stop_reason == "end_turn"
                    │
                    ▼
              SQLite (src/db/)         ← sessions, messages, settings
```

## Module Map

```
src/
├── index.ts              CLI entry point, arg parsing, subcommands, TUI launcher
├── agent.ts              CLI adapter → runLoop (readline approval on a TTY)
├── agent-tui.ts          TUI adapter → runLoop (callback hooks)
│
├── agent/
│   ├── loop.ts           runLoop() — the core agent loop shared by CLI + TUI
│   ├── modes.ts          plan/build/auto, tool filtering, permission gate
│   ├── compaction.ts     maybeCompact()/compactNow() — summarize old turns
│   ├── context.ts        model context-window sizes, usedPct()
│   └── subagent.ts       runSubagent() — read-only child loop for the task tool
│
├── prompts/
│   ├── *.md              system + mode + sub-agent prompts (content, not code)
│   └── index.ts          Bun text-import loader
│
├── providers/
│   ├── types.ts          ProviderClient interface, StreamingResponse, TokenUsage
│   ├── anthropic.ts      Anthropic streaming (client.messages.stream)
│   ├── openai.ts         OpenAI SSE streaming (tool_calls accumulation)
│   ├── ollama.ts         Ollama JSON streaming (tool injection)
│   ├── custom.ts         Generic REST OpenAI-compatible
│   ├── discovery.ts      Dynamic model listing per provider
│   └── index.ts          resolveProvider() — picks provider from "provider:model" string
│
├── tools/
│   ├── index.ts          executeTool() dispatcher, signal threading
│   ├── bash.ts           bash_exec — 30s timeout, AbortSignal
│   ├── read-file.ts      read_file — Bun.file
│   ├── write-file.ts     write_file — Bun.write
│   ├── edit.ts           edit_file — string replace with context
│   ├── patch-file.ts     patch_file — unified diff via `patch` binary
│   ├── list-dir.ts       list_dir — readdir, ALWAYS_IGNORE set
│   ├── search-text.ts    search_text — grep via Bun.spawn
│   ├── http-fetch.ts     http_fetch — 15s timeout, AbortSignal
│   ├── skill.ts          skill — load SKILL.md guidance
│   └── task.ts           task — sub-agent tool definition (executor lazy-loaded)
│
├── skills/
│   ├── loader.ts         discoverSkills(), loadSkill() — 4 search paths
│   └── tool.ts           skill() tool definition
│
├── mcp/
│   └── client.ts         McpClient — JSON-RPC 2.0 over Bun.spawn stdio
│
├── db/
│   ├── client.ts         SQLite singleton, WAL mode, schema migrations
│   ├── sessions.ts       createSession, listSessions, saveMessage
│   ├── messages.ts       getSessionMessages
│   ├── api-keys.ts       getApiKey, setApiKey
│   ├── settings.ts       getSetting, setSetting
│   ├── mcp-servers.ts    addMcpServer, listMcpServers, removeMcpServer
│   └── index.ts          re-exports all DB functions
│
├── config/
│   ├── agents-md.ts      loadAgentsMd() — find + merge AGENTS.md files
│   ├── providers.ts      provider catalog (key prefixes, signup URLs)
│   ├── prompt.ts         readline helpers — ask/confirm/askSecret (masked)
│   ├── login.ts          interactive login, config show/get/set/unset
│   └── setup.ts          saveApiKey()
│
└── ui/
    ├── types.ts           Message, ToolEvent interfaces
    ├── theme.ts           color palette + per-tool styles
    ├── editor.ts          pure text-editor model (cursor, multiline)
    ├── markdown.tsx       dependency-free Markdown renderer
    ├── App.tsx            Root TUI component, commands, abort, overlays
    ├── ChatPane.tsx       Static history + live tool events (markdown)
    ├── ToolCall.tsx       spinner, tool summary, result preview
    ├── StatusBar.tsx      responsive mode/model/ctx/token bar
    ├── Banner.tsx         welcome banner
    ├── Spinner.tsx        working spinner with elapsed time
    ├── Approval.tsx       permission-gate overlay (y/n/a)
    ├── Login.tsx          in-TUI provider login overlay
    └── Input.tsx          editor view — cursor, multiline, history, slash menu
```

## Session Lifecycle

```
1. User starts forge (or /new in TUI)
   └── createSession() → SQLite row with UUID

2. User sends message
   └── saveMessage(sessionId, "user", content)

3. Agent loop runs
   ├── getSessionMessages() → rebuild messages array
   ├── provider.chat(messages, system, tools, onStream, signal)
   │   └── streams text + tool calls
   ├── For each tool call:
   │   ├── executeTool(name, input, signal)
   │   └── saveMessage(sessionId, "tool", result)
   └── saveMessage(sessionId, "assistant", finalText)

4. User sends next message → back to step 2

5. /sessions load <id>
   └── getSessionMessages() → restore full history
```

## Key Interfaces

### ProviderClient

```typescript
interface ProviderClient {
  chat(
    messages: Message[],
    systemPrompt: string,
    tools: Tool[],
    onStream?: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<StreamingResponse>;
}
```

### StreamingResponse

```typescript
interface StreamingResponse {
  content: ContentBlock[];
  text: string;
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "aborted";
  toolCalls: ToolCall[];
  usage?: TokenUsage;
}
```

### TuiCallbacks (agent-tui.ts)

```typescript
interface TuiCallbacks {
  onText: (chunk: string) => void;
  onToolStart: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolDone: (id: string, result: string) => void;
  onUsage?: (usage: TokenUsage) => void;
}
```

## Abort Flow

```
User presses Ctrl+C (TUI)
        │
        ▼
App.tsx: controller.abort()
        │
        ▼
agent-tui.ts: signal passed to provider.chat(...)
        │
        ├── Anthropic: stream.abort()
        ├── OpenAI/Ollama/Custom: fetch signal fires
        │
        ▼
agent-tui.ts: signal passed to executeTool(..., signal)
        │
        ├── bash_exec: proc.kill() on abort
        └── http_fetch: AbortSignal.any([signal, timeout])
```

## SQLite Schema

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  model TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
  role TEXT,              -- user | assistant | tool
  content TEXT,
  tool_name TEXT,         -- populated for role=tool
  tool_call_id TEXT,
  created_at INTEGER
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE api_keys (
  provider TEXT PRIMARY KEY,
  key TEXT
);

CREATE TABLE mcp_servers (
  name TEXT PRIMARY KEY,
  command TEXT,
  args TEXT,              -- JSON array
  env TEXT                -- JSON object
);
```
