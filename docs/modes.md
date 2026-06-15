# Modes & Permissions

Forge runs in one of three **modes** that control what the agent is allowed to do. This is the core safety mechanism of the harness.

| Mode | Tools available | Risky tools (bash/write/edit/patch) |
|------|-----------------|-------------------------------------|
| `plan` | read-only only | **removed** — not offered to the model |
| `build` *(default)* | all | **require approval** before running |
| `auto` | all | run with **no prompts** |

Switch modes:
- TUI: `/mode plan` · `/mode build` · `/mode auto`
- CLI: `--plan`, `--auto`, or `--mode <mode>`

The current mode is shown in the status bar.

## Plan mode

Read-only. The agent can `read_file`, `list_dir`, `search_text`, `http_fetch`, and `skill` — but the file-mutating and shell tools are stripped from its toolset entirely ([`toolsForMode`](../src/agent/modes.ts)). The system prompt instructs it to investigate and present a numbered plan.

Use it to scope work safely before letting the agent touch anything:

```bash
forge --plan "migrate the config layer to zod"
```

Then switch to build mode to execute.

## Build mode (default)

Full tool access, but every **risky** tool call pauses for your approval first.

A tool is "risky" if it can change the system — `bash_exec`, `write_file`, `edit_file`, `patch_file`, and any MCP/custom tool (unknown tools are risky by default). Read-only tools never prompt.

**In the TUI**, an approval box appears:

```
⚠ permission  Forge wants to run  ✎ edit
  src/server.ts
  y allow   n deny   a allow all this session   esc to deny
```

- `y` — run it once
- `n` / `esc` — deny; the agent is told and adapts
- `a` — allow all risky tools for the rest of the session

**In the CLI**, you get a `[y/N]` prompt (only on a TTY — piped/non-interactive runs skip prompting).

## Auto mode

Full access, no prompts — for when you trust the task and want it to run unattended. The system prompt reminds the agent to be careful with destructive commands.

```bash
forge --auto "format all files and run the linter"
```

## How it's wired

The gate lives in the shared loop ([`src/agent/loop.ts`](../src/agent/loop.ts)):

```ts
if (needsApproval(mode, toolCall.name) && hooks.onApproval) {
  const ok = await hooks.onApproval(id, name, input);
  if (!ok) { /* return a "denied by user" tool result */ }
}
```

- The TUI supplies `onApproval` via the [`Approval`](../src/ui/Approval.tsx) overlay.
- The CLI supplies a readline-based `onApproval` (TTY only).
- Sub-agents run read-only, so they never need approval.

See [agent-loop.md](agent-loop.md) for the full loop.
