# MCP Integration

MCP (Model Context Protocol) lets you add external tools to Forge. Any MCP-compatible server can be connected — the tools it exposes become available to the agent alongside the 9 built-in tools.

## What is MCP?

MCP is an open protocol for connecting LLM agents to external capabilities over a standard JSON-RPC 2.0 interface. Tools are discovered at runtime via `tools/list` and called via `tools/call`.

Forge connects to MCP servers over **stdio** — it spawns the server as a child process and communicates over stdin/stdout. This is the most common deployment mode.

## Adding an MCP Server

```bash
forge mcp add <name> <command> [args...]
```

Examples:

```bash
# Official GitHub MCP server
forge mcp add github npx @modelcontextprotocol/server-github

# Filesystem access (restrict to a specific path)
forge mcp add files npx @modelcontextprotocol/server-filesystem /path/to/allow

# Brave Search
forge mcp add search npx @modelcontextprotocol/server-brave-search

# Puppeteer / browser automation
forge mcp add browser npx @modelcontextprotocol/server-puppeteer
```

## Listing and Removing Servers

```bash
forge mcp list      # show all configured servers
forge mcp remove <name>
```

## Popular MCP Servers

| Server | Package | What it adds |
|--------|---------|-------------|
| GitHub | `@modelcontextprotocol/server-github` | Issues, PRs, code search, file access |
| Filesystem | `@modelcontextprotocol/server-filesystem` | Read/write files outside the project |
| Brave Search | `@modelcontextprotocol/server-brave-search` | Real-time web search |
| Puppeteer | `@modelcontextprotocol/server-puppeteer` | Browser automation, screenshots |
| Fetch | `@modelcontextprotocol/server-fetch` | Raw HTTP with headers/cookies |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Query your Postgres database |
| SQLite | `@modelcontextprotocol/server-sqlite` | Query any SQLite file |

Most are available on npm under `@modelcontextprotocol/server-*`.

## How Tools Are Merged

When Forge starts, it connects to all configured MCP servers and calls `tools/list`. The resulting tools are merged with the 9 built-ins and presented to the LLM.

MCP tool names are namespaced by server name to avoid conflicts:
- Built-in: `bash_exec`, `read_file`, etc.
- MCP: `github_create_issue`, `files_read`, etc. (server name prefixed)

The agent picks the right tool for the task automatically.

## Environment Variables for MCP Servers

Some MCP servers need API keys. Pass them when registering:

```bash
# The command runs in a shell, so env vars work as expected
GITHUB_TOKEN=ghp_xxx forge mcp add github npx @modelcontextprotocol/server-github
```

Or set them globally in your shell profile, since MCP servers inherit Forge's environment.

## Debugging

Enable verbose MCP logging:

```bash
FORGE_DEBUG=1 forge
```

This prints:
- Each `tools/list` call and its results
- Each `tools/call` request and response
- Parse errors from MCP server stdout (with the raw bytes)
- Timeouts (15s per call)

If an MCP server isn't working:
1. Run it standalone first: `npx @modelcontextprotocol/server-github`
2. Check it outputs valid JSON-RPC on stdout
3. Check for missing env vars (API keys, paths)
4. Use `FORGE_DEBUG=1` to see what Forge receives

## MCP Server Timeout

Forge times out MCP tool calls after **15 seconds**. If a call times out:
- The pending entry is cleaned up (no memory leak)
- The agent receives an error result: `MCP call timed out (15s): <method> on <server>`
- The session continues; the agent can retry or take a different approach

## Writing Your Own MCP Server

Any process that:
1. Reads JSON-RPC requests from stdin
2. Writes JSON-RPC responses to stdout
3. Implements `initialize`, `tools/list`, and `tools/call`

...can be used as an MCP server with Forge.

See the [MCP specification](https://modelcontextprotocol.io) for the full protocol.
