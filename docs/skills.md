# Skills System

Skills are domain-specific guidance files that Forge loads into the agent's context when relevant. A skill is a `SKILL.md` file with YAML frontmatter describing when it should activate.

## How It Works

1. You ask a question or make a request
2. Forge checks all known skills against your message
3. If a skill's `triggers` match, the skill is offered as a `skill()` tool call
4. The agent reads the skill content and uses it as context

Skills don't load automatically — the LLM decides whether to call `skill({ name: "..." })` based on the trigger match. This keeps the prompt lean.

## Writing a SKILL.md

```markdown
---
name: my-skill
description: Short description shown when listing skills
triggers:
  - keyword one
  - keyword two
  - another phrase
---

# My Skill

Guidance text here. This is what the agent reads when the skill is activated.

Write actionable patterns, not general advice. The agent should be able to
apply this directly.
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique skill identifier (used in `skill({ name })`) |
| `description` | Yes | One-line summary shown in skill listings |
| `triggers` | Yes | Array of keywords/phrases that activate this skill |

### Body Content

The body is plain Markdown. Keep it focused:
- Prefer concrete patterns over abstract advice
- Use code blocks for examples
- Aim for 50–200 lines — too short is useless, too long dilutes the signal

## Discovery Order

Forge looks for `SKILL.md` files in these locations (highest to lowest priority):

1. `./skills/<name>/SKILL.md` — project-local skills in a `skills/` folder
2. `./SKILL.md` — single skill at repo root
3. `~/.forge/skills/<name>/SKILL.md` — global personal skills
4. Built-in skills shipped with Forge

All discovered skills are merged. If two skills have the same `name`, the higher-priority one wins.

## Built-in Skills

| Name | Triggers |
|------|----------|
| `git` | git, commit, branch, merge, rebase, pr |
| `typescript` | typescript, ts, types, interface, generic, type error |
| `react` | react, component, jsx, hooks, useState, props |
| `testing` | test, spec, bun test, mock, coverage |
| `bun` | bun, spawn, sqlite, bun:sqlite, bun build |
| `sql` | sql, sqlite, database, query, schema, migration |
| `code-review` | review, pr, pull request, code review, diff |
| `refactoring` | refactor, cleanup, extract, rename, dead code |
| `api-design` | api, rest, endpoint, route, openapi, versioning |

## Example: Project-Specific Skill

If your project uses a specific framework, create `skills/myframework/SKILL.md`:

```markdown
---
name: myframework
description: Patterns for working with MyFramework
triggers:
  - myframework
  - mf.component
  - mf.router
---

# MyFramework Patterns

Always use `mf.component()` to define components, never raw objects.

Router routes must be registered before `mf.start()` is called.

...
```

## Calling Skills Manually

In the TUI, you can trigger skill loading by mentioning the topic:

```
> How should I structure TypeScript interfaces here?
```

The agent will call `skill({ name: "typescript" })` if the TypeScript skill is registered.

You can also ask explicitly:

```
> Load the git skill and show me how to squash commits
```

## Creating a Global Skill

Personal skills that apply across all projects go in `~/.forge/skills/`:

```bash
mkdir -p ~/.forge/skills/myteam
cat > ~/.forge/skills/myteam/SKILL.md << 'EOF'
---
name: myteam
description: Team coding conventions
triggers:
  - convention
  - team style
  - naming
---

# Team Conventions

- Use kebab-case for file names
- Prefer named exports over default exports
...
EOF
```
