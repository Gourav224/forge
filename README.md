# Forge - Personal Coding Agent

A **terminal-based coding agent** powered by Claude, built with Bun, SQLite, and TypeScript.

Forge takes natural language tasks and executes them in your codebase—reading files, running commands, writing code, searching patterns, and everything in between.

## Features

✨ **Multi-tool Agent Loop**
- Execute bash commands, read/write files, search code
- Understands context and plans multi-step operations
- Streams output in real-time

✨ **Built with Bun**
- Native SQLite support (`bun:sqlite`)
- Fast startup, single binary
- Direct JSX/TSX support

✨ **Session Persistence**
- All conversations saved to `~/.forge/forge.db`
- Resume previous sessions
- Branching support (explore different approaches)

✨ **Multi-Provider Ready**
- Anthropic Claude (default)
- OpenAI/OpenRouter (stubs)
- Ollama local models (stubs)

✨ **Project Instructions**
- Load `AGENTS.md` from your project
- Inject custom instructions without bloating the system prompt
- Skills system for domain-specific guidance

## Installation

```bash
# Clone
git clone <repo> forge
cd forge

# Install
bun install

# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run
bun src/index.ts "read src/index.ts"
```

Or build a standalone binary:

```bash
bun run build
./dist/forge "your task here"
```

## Usage

### One-shot Task

```bash
forge "create a hello world in TypeScript"
forge "read src/cli/index.ts"
forge "search for all TODO comments"
```

### List Sessions

```bash
forge --list
```

### Continue Session (Future)

```bash
forge --session <id>
```

## Tools

The agent has access to:

| Tool | Purpose |
|------|---------|
| `bash_exec` | Run shell commands (git, npm, bun, etc.) |
| `read_file` | Read file contents (with line ranges) |
| `write_file` | Create/modify files |
| `list_dir` | List directories (with depth control) |
| `search_text` | Search files (grep, regex) |
| `http_fetch` | Fetch URLs (docs, APIs) |

## Project Instructions

Create an `AGENTS.md` in your project root to customize Forge's behavior:

```markdown
# My Project Instructions

This is a React web app. Prefer:
- ESM imports
- React hooks
- Bun for builds/tests
- TypeScript strict mode

When refactoring auth, preserve JWT token validation.
```

Forge will automatically load and inject these instructions into every task.

## Database

Sessions are stored in `~/.forge/forge.db`:

```bash
# View sessions
sqlite3 ~/.forge/forge.db "SELECT id, title, created_at FROM sessions LIMIT 10;"

# View conversation
sqlite3 ~/.forge/forge.db "SELECT role, content FROM messages WHERE session_id='<id>' ORDER BY created_at;"
```

## Architecture

```
src/
├── index.ts           # CLI entry point
└── lib/
    ├── db.ts          # SQLite session management
    ├── tools.ts       # 6 built-in tools
    └── agent.ts       # Main Claude agent loop
```

**No external UI libraries** (yet). Phase 2 will add Ink (React TUI).

## What's Built (Phase 1-3)

- ✅ Agent loop with Claude
- ✅ 6 core tools
- ✅ SQLite session persistence
- ✅ Project instructions (AGENTS.md)
- ✅ Multi-provider registry
- ✅ Modular Bun-native setup

## What's Next

- [ ] Phase 2: Interactive TUI with Ink
- [ ] Phase 3: Skills system
- [ ] Phase 4: Context compaction (token limits)
- [ ] Phase 5: OpenAI/Ollama full support
- [ ] Phase 6: Settings UI for API keys
- [ ] Phase 7: CLI modes (JSON, interactive)
- [ ] Phase 8: TUI polish & keybindings
- [ ] Phase 9: Plugin system
- [ ] Phase 10: Docs & examples

## Environment Variables

```bash
ANTHROPIC_API_KEY     # Required: Anthropic Claude API key
OPENAI_API_KEY        # Optional: OpenAI API key
OPENROUTER_API_KEY    # Optional: OpenRouter API key
```

## Development

```bash
# Watch mode
bun run dev

# Run tests (coming soon)
bun test

# Build binary
bun run build
```

## License

MIT

---

**Built with Bun, SQLite, and Claude. Inspired by [pi.dev](https://pi.dev).**
