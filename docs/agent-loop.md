# The Agent Loop (Harness Internals)

Forge's harness is one small, readable loop — [`src/agent/loop.ts`](../src/agent/loop.ts) — driven by hooks. The CLI and TUI are thin adapters over it.

## The loop

```
runLoop(messages, opts):
  tools  = toolsForMode(mode, opts.tools)      # plan mode strips risky tools
  system = systemPrompt + modePrompt(mode)
  repeat (max N iterations):
    maybeCompact(messages)                     # summarize if context is filling
    response = provider.chat(messages, system, tools, onText, signal)
    if response has no tool calls: break
    for each tool call:
      if needsApproval(mode, name): ask onApproval → maybe skip
      result = executeTool(name, input, signal)
    append assistant + tool results to messages
  return { text, usage, messages }
```

### Hooks

`runLoop` is UI-agnostic — all interaction happens through optional hooks:

| Hook | Purpose |
|------|---------|
| `onText(chunk)` | streamed assistant text |
| `onToolStart(id, name, input)` | a tool began |
| `onToolDone(id, result)` | a tool finished |
| `onUsage(usage)` | cumulative token spend |
| `onContext(tokens)` | current context-window fill (for the meter) |
| `onApproval(id, name, input)` | gate a risky tool — return `false` to deny |
| `onCompact(summary)` | the conversation was compacted |

The TUI ([`agent-tui.ts`](../src/agent-tui.ts)) maps these to React state; the CLI ([`agent.ts`](../src/agent.ts)) maps them to stdout + readline prompts.

## Modes

Tool filtering and the permission gate are mode-driven — see [modes.md](modes.md). The relevant helpers in [`src/agent/modes.ts`](../src/agent/modes.ts):

- `toolsForMode(mode, tools)` — plan mode → read-only subset
- `needsApproval(mode, name)` — build mode → risky tools need approval
- `modePrompt(mode)` — appends the mode's `.md` prompt

## Context compaction

[`src/agent/compaction.ts`](../src/agent/compaction.ts) keeps long sessions alive:

- `estimateTokens(messages)` — rough char/4 estimate
- `shouldCompact(messages, model)` — true past ~75% of the model's window ([`context.ts`](../src/agent/context.ts))
- when triggered, older messages are replaced by a single LLM-generated `<conversation-summary>`, keeping the most recent turns verbatim

Trigger it yourself with `/compact`.

## Sub-agents

The `task` tool delegates a focused, **read-only** investigation to a child `runLoop` ([`src/agent/subagent.ts`](../src/agent/subagent.ts)):

- gets only read-only tools and the [`subagent-explore`](../src/prompts/subagent-explore.md) prompt
- `depth: 1` guard — a sub-agent cannot spawn further sub-agents
- returns its final text as the tool result, so the parent's context stays clean

The executor is lazy-imported inside [`executeTool`](../src/tools/index.ts) to avoid an import cycle (`tools → subagent → loop → tools`).

## Prompts

All prompts are Markdown files in [`src/prompts/`](../src/prompts), loaded via Bun text imports so they bundle into the compiled binary. Edit `system.md` or a `mode-*.md` to change behavior without touching code.
