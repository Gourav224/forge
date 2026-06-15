# Forge Documentation

Forge is a terminal-based AI coding agent powered by multiple LLM providers. It runs as a TUI (terminal UI) with persistent sessions, tool use, and a skill system.

## Quick Start

```bash
# Install
bun install && bun run build

# Set up a provider (interactive)
forge login

# Launch TUI
forge

# One-shot query
forge "explain this codebase"
```

## Documentation

| Page | What it covers |
|------|---------------|
| [Modes & permissions](./modes.md) | plan / build / auto and the approval gate |
| [Agent loop](./agent-loop.md) | Harness internals: loop, hooks, compaction, sub-agents |
| [Architecture](./architecture.md) | Data flow, module map, session lifecycle |
| [Tools](./tools.md) | All built-in tools with parameters and examples |
| [Providers](./providers.md) | Configuring Anthropic, OpenAI, Ollama, OpenRouter, Custom |
| [Skills](./skills.md) | Writing and using the SKILL.md system |
| [MCP](./mcp.md) | Adding MCP servers and debugging |
| [Troubleshooting](./troubleshooting.md) | FAQ and common error fixes |

## Key Concepts

**Sessions** — Every conversation is persisted to SQLite. Use `/sessions` in the TUI to browse and load history.

**Providers** — Forge supports Anthropic, OpenAI, Ollama, OpenRouter, and any OpenAI-compatible API. Switch with `/model provider:model-name`.

**Skills** — Drop a `SKILL.md` file anywhere and Forge will load it as context when relevant triggers are matched. See [Skills](./skills.md).

**MCP** — Forge can connect to any Model Context Protocol server, adding tools from GitHub, web search, file systems, and more. See [MCP](./mcp.md).

**Tools** — The agent has 9 built-in tools: bash, file read/write/edit/patch, directory listing, text search, HTTP fetch, and skill loading. See [Tools](./tools.md).

## TUI Commands

| Command | What it does |
|---------|-------------|
| `/help` | Show all commands |
| `/mode plan\|build\|auto` | Switch operating mode |
| `/compact` | Summarize the conversation to free context |
| `/branch` · `/rewind <n>` | Fork the session · rewind to message *n* |
| `/login` · `/config` | Add a provider key · show configuration |
| `/model` · `/models` | Show/switch model · list available models |
| `/sessions` · `/sessions load <id>` | List / resume sessions |
| `/new` · `/clear` | New session · clear screen |
| `/clean confirm` · `/reset confirm` | Delete history · wipe everything |
| `/exit` | Quit |

**Keyboard:** `Ctrl+C` while the agent is running aborts the current response. `Ctrl+C` when idle exits.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (alternative to `--set-key`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `CUSTOM_API_KEY` | Key for custom provider |
| `CUSTOM_API_FORMAT` | Format for custom provider (`openai` or `ollama`) |
| `FORGE_DEBUG` | Set to `1` to enable verbose debug logging |

## See Also

- [README](../README.md) — Project overview and features
- [QUICKSTART](../QUICKSTART.md) — Detailed getting-started guide
- [AGENTS.md](../AGENTS.md) — Instructions for AI agents working on Forge
