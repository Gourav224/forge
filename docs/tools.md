# Built-in Tools

Forge ships with 10 built-in tools. The LLM chooses which to call; you don't invoke them directly.

## Tool Summary

| Name | What it does | Risky? |
|------|-------------|--------|
| `bash_exec` | Run shell commands (30s timeout) | ⚠ |
| `read_file` | Read a file's contents | |
| `write_file` | Write/overwrite a file | ⚠ |
| `edit_file` | Replace a specific string in a file | ⚠ |
| `patch_file` | Apply a unified diff patch | ⚠ |
| `list_dir` | List files and directories | |
| `search_text` | Grep for text across files | |
| `http_fetch` | Fetch a URL (15s timeout) | |
| `skill` | Load a skill for domain guidance | |
| `task` | Delegate to a read-only sub-agent | |

⚠ = a "risky" tool that requires approval in **build** mode and is unavailable in **plan** mode. See [modes.md](./modes.md).

---

## bash_exec

Runs a shell command and returns stdout + stderr.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | string | Yes | Shell command to run |
| `cwd` | string | No | Working directory (default: current) |

**Timeout:** 30 seconds. The process is killed if it exceeds this.

**Abort:** Respects the session AbortSignal — Ctrl+C kills the process.

**Example:**
```json
{ "command": "git log --oneline -10", "cwd": "/path/to/repo" }
```

---

## read_file

Reads the entire content of a file.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | File path to read |

**Returns:** File contents as a string, or an error message.

**Example:**
```json
{ "path": "src/index.ts" }
```

---

## write_file

Creates or overwrites a file with new content.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | File path to write |
| `content` | string | Yes | Content to write |

**Caution:** This replaces the entire file. Use `edit_file` for targeted changes.

**Example:**
```json
{ "path": "src/config.ts", "content": "export const VERSION = '1.0.0';\n" }
```

---

## edit_file

Replaces a specific string within a file. Safer than `write_file` for targeted edits.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | File path to edit |
| `old_string` | string | Yes | Exact string to find (must be unique in file) |
| `new_string` | string | Yes | Replacement string |

**Returns:** Success message or error if the string wasn't found.

**Example:**
```json
{
  "path": "src/server.ts",
  "old_string": "const PORT = 3000;",
  "new_string": "const PORT = parseInt(process.env.PORT || '3000', 10);"
}
```

---

## patch_file

Applies a unified diff patch to a file. Best for multi-line structural changes where `edit_file` would be awkward.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | File to patch |
| `diff` | string | Yes | Unified diff content (`diff -u` format) |

**Requires:** The `patch` binary must be installed (`apt install patch` / already on macOS).

**Example:**
```json
{
  "path": "src/utils.ts",
  "diff": "--- a/src/utils.ts\n+++ b/src/utils.ts\n@@ -1,3 +1,4 @@\n export function add(a: number, b: number) {\n-  return a + b;\n+  // Add two numbers\n+  return a + b;\n }\n"
}
```

---

## list_dir

Lists files and directories. Skips `node_modules`, `.git`, `dist`, `.next`, `.turbo`, `.cache`, `coverage` automatically.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | No | Directory to list (default: `.`) |
| `depth` | number | No | Recursion depth (default: 1) |

**Example:**
```json
{ "path": "src", "depth": 2 }
```

**Output:**
```
providers/
  anthropic.ts
  openai.ts
  types.ts
tools/
  bash.ts
  read-file.ts
index.ts
```

---

## search_text

Searches for a pattern across files using grep.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pattern` | string | Yes | Search pattern (supports regex) |
| `path` | string | No | Directory or file to search (default: `.`) |
| `case_sensitive` | boolean | No | Default: false |
| `include` | string | No | File glob to filter (e.g. `*.ts`) |

**Example:**
```json
{ "pattern": "resolveProvider", "path": "src", "include": "*.ts" }
```

---

## http_fetch

Fetches a URL and returns the response body.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string | Yes | URL to fetch |
| `method` | string | No | HTTP method (default: `GET`) |
| `headers` | object | No | Request headers |
| `body` | string | No | Request body (for POST/PUT) |

**Timeout:** 15 seconds. Respects AbortSignal.

**Example:**
```json
{
  "url": "https://api.github.com/repos/owner/repo/issues",
  "headers": { "Authorization": "token ghp_..." }
}
```

---

## skill

Loads a skill file and returns its content as context. The agent calls this automatically when relevant, or you can ask it to load one explicitly.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Skill name (must match a `name:` in a SKILL.md) |

**Returns:** The skill's Markdown body content.

**Example:**
```json
{ "name": "typescript" }
```

See [Skills documentation](./skills.md) for how to create custom skills.

---

## task

Delegates a focused, self-contained investigation to a **read-only sub-agent**. The sub-agent has only read tools (read/list/search/fetch/skill), runs its own mini agent loop, and returns a concise report — keeping the main agent's context clean.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `prompt` | string | Yes | A self-contained task or question for the sub-agent |

**Example:**
```json
{ "prompt": "Find where JWT tokens are validated and summarize the flow with file:line references." }
```

A sub-agent cannot spawn further sub-agents (depth-guarded). See [agent-loop.md](./agent-loop.md#sub-agents).
