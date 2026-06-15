# Forge Instructions for Forge Project Itself

This document shows how to structure `AGENTS.md` files in your projects.

## Context

Forge is a terminal-based coding agent built with Bun + TypeScript + SQLite.

**Stack:**
- Runtime: Bun (not Node.js)
- Database: SQLite (bun:sqlite, not external packages)
- CLI: Commander
- Files: Bun.file() (not fs module)
- Spawn: Bun.spawn() (not execa)

## Guidelines

### When Writing Code

1. **Prefer Bun APIs** over Node.js when available
   - Use `bun:sqlite` for databases
   - Use `Bun.file()` for file I/O
   - Use `Bun.spawn()` for shell commands
   - Use `Bun.write()` to write files

2. **Keep src/ modular**
   - `src/index.ts` = CLI entry point
   - `src/lib/*.ts` = Core logic (db, tools, agent, providers)
   - Each tool/feature = one small file

3. **Avoid bloat**
   - No heavy frameworks for CLI tools
   - SQLite is built-in, use it directly
   - Keep dependencies minimal (Anthropic SDK, Commander, that's it)

4. **Database patterns**
   - Use prepared statements: `db.prepare("...").run(...)`
   - Don't use ORMs; SQLite prepared queries are fast enough
   - Session branching via parent_id (not separate tables)

5. **Tool execution**
   - Each tool is a simple async function: `async (input) => Promise<string>`
   - Return tool output as a string
   - Tools are composable (bash can do anything)

### Error Handling

- Catch errors in tool handlers
- Return error message as string (don't throw)
- Let CLI handle process exit codes

### Naming

- Tools: snake_case (`bash_exec`, `read_file`)
- Functions: camelCase (`createSession`, `saveMessage`)
- Types: PascalCase (`Session`, `ToolCall`)

## Features in Development

- Interactive TUI (Phase 2) — Ink/React
- Skills system (Phase 3) — load project skill.md files
- Compaction (Phase 4) — auto-summarize long conversations
- Multi-provider (Phase 5) — OpenAI, Ollama, etc.

---

**Template for Other Projects:**

```markdown
# My Project AGENTS.md

## Context

[Brief description of your project]

## Tech Stack

[Language, framework, build tool, etc.]

## Guidelines

[Your coding standards]

[Tool preferences]

[Important constraints]
```

Then save it as `./AGENTS.md` in your project root and Forge will automatically load it.
