# Troubleshooting

## Common Errors

### API Key Not Set

**Error:** `Anthropic API key not set. Run: forge --set-key anthropic sk-ant-...`

**Cause:** No API key has been configured for the selected provider.

**Fix:**
```bash
forge --set-key anthropic sk-ant-...
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Verify: `forge --status`

---

### Invalid Model String

**Error:** `Invalid model string: "gpt-4o". Use provider:model`

**Cause:** Model string is missing the `provider:` prefix.

**Fix:** Use the full format: `openai:gpt-4o`, `anthropic:claude-sonnet-4-6`, etc.

---

### Ollama Not Running

**Error:** `fetch failed` or `ECONNREFUSED localhost:11434`

**Cause:** Ollama isn't running, or it's on a different port.

**Fix:**
```bash
ollama serve           # start Ollama
ollama pull mistral    # pull a model if needed
```

For a custom endpoint: `forge --model ollama:mistral@http://your-host:11434`

---

### MCP Server Fails to Start

**Error:** `MCP call timed out (15s): initialize on <server>`

**Cause:** The MCP server process failed to start or is not responding.

**Debug steps:**
1. Run the server command directly: `npx @modelcontextprotocol/server-github`
2. Check for missing env vars (GitHub token, etc.)
3. Enable debug logging: `FORGE_DEBUG=1 forge`

**Common causes:**
- Missing API key for the MCP server (e.g., `GITHUB_TOKEN` not set)
- Package not installed — try `bunx` instead of `npx`, or pre-install it
- Wrong command path

---

### Context Limit Reached

**Error:** `stop_reason: max_tokens` or response truncated

**Cause:** The conversation history or a tool result exceeded the model's context window.

**Fix:**
- Start a fresh session: `/new` or `forge --new`
- Use `/clear` to clear the display (doesn't affect history — use `/new` for a fresh context)
- For very long files, ask the agent to read specific line ranges

---

### Bash Command Timeout

**Output:** `Error: command timed out after 30s`

**Cause:** A `bash_exec` tool call exceeded the 30-second limit.

**Fix:** The agent will show this as a tool result and can retry or break the command into smaller parts. If a command genuinely needs more than 30s, consider running it manually and pasting the output.

---

### TUI Rendering Issues

**Symptom:** Garbled output, overlapping text, missing colors.

**Possible causes and fixes:**

1. **Terminal too narrow** — Forge's TUI requires at least 80 columns. Widen your terminal.

2. **`TERM` not set** — Make sure your terminal reports `$TERM` correctly (usually `xterm-256color` or `screen-256color`).

3. **Inside `tmux` or `screen`** — Add to your `~/.tmux.conf`:
   ```
   set -g default-terminal "screen-256color"
   set -ga terminal-overrides ",xterm-256color:Tc"
   ```

4. **Ink rendering bug** — Try `FORCE_COLOR=1 forge` to force color output.

---

### `bunx tsc` Type Errors After Upgrade

**Error:** Various `TS2345`, `TS2339`, etc. after pulling new changes.

**Fix:**
```bash
bun install           # ensure dependencies are up to date
bunx tsc --noEmit     # see full error list
```

Common causes:
- Missing `import type { ... }` for type-only imports (required by `verbatimModuleSyntax`)
- Provider interface changed — check `src/providers/types.ts`

---

### AGENTS.md Not Loading

**Symptom:** The agent doesn't seem to follow project instructions.

**Cause:** The `AGENTS.md` file has YAML frontmatter that was not stripped, or the file isn't in the right location.

**Fix:** Forge strips frontmatter automatically. Ensure the file is at the repo root or in `~/.forge/AGENTS.md` for global instructions.

Debug: `FORGE_DEBUG=1 forge` — look for `[agents-md]` log lines.

---

## Debug Mode

`FORGE_DEBUG=1` enables verbose logging for:
- MCP server communication (each JSON-RPC message)
- Parse errors from MCP stdout
- Provider request/response details

```bash
FORGE_DEBUG=1 forge "debug my issue"
```

Output goes to stderr, so it won't interfere with the TUI.

---

## Resetting Configuration

```bash
# Remove all stored API keys and settings
rm -f ~/.local/share/forge/forge.db   # Linux
rm -f ~/Library/Application\ Support/forge/forge.db  # macOS

# Or just remove a specific key
forge --set-key anthropic ""
```

The DB location can also be found in the `forge --status` output.

---

## Reporting Bugs

If you hit an issue not covered here:
1. Capture the error with `FORGE_DEBUG=1`
2. Note your OS, Bun version (`bun --version`), and Forge version (`forge --version`)
3. Open an issue or check existing issues in the project repository
