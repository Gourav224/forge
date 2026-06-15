#!/usr/bin/env bun

import { Command } from "commander";
import { resolveProvider } from "./providers/index";
import {
  getDb, closeDb,
  createSession, saveMessage, listSessions, getSession, getSessionMessages,
  getAllApiKeys,
  addMcpServer, listMcpServers, removeMcpServer,
} from "./db/index";
import { runAgent } from "./agent";
import { discoverAllModels, formatModelListForDisplay } from "./providers/discovery";
import { saveApiKey, showConfigStatus } from "./config/setup";
import { loadAgentsMd } from "./config/agents-md";
import { loadMcpTools, disconnectAllMcp } from "./mcp/loader";
import { registerMcpExecutor, TOOLS } from "./tools/index";
import { discoverCustomTools } from "./tools/custom-loader";

const BASE_SYSTEM_PROMPT = `You are Forge, a personal coding agent running in the terminal.

You have access to tools:
- bash_exec: Run shell commands (git, bun, npm, etc.)
- read_file: Read file contents with optional line ranges
- write_file: Create or overwrite files (auto-creates dirs)
- edit_file: Replace an exact string in a file — preferred for small targeted edits
- patch_file: Apply unified diffs
- list_dir: List directory contents with depth control
- search_text: Grep with regex and file glob support
- http_fetch: Fetch URLs for docs or APIs
- skill: List or load available skills for additional guidance

Work directly and efficiently. Use edit_file over write_file when making targeted changes. Read files before modifying them. Use skill() to load relevant skill guidance when starting a specialized task.`;

const DEFAULT_MODEL = "anthropic:claude-3-5-sonnet-20241022";

async function buildSystemPrompt(): Promise<string> {
  let system = BASE_SYSTEM_PROMPT;
  const agentsMd = loadAgentsMd();
  if (agentsMd) {
    system += `\n\n<project-instructions>\n${agentsMd}\n</project-instructions>`;
  }
  return system;
}

async function handleMcp(argv: string[]) {
  getDb();
  const sub = argv[0];

  if (sub === "add") {
    const name = argv[1];
    const command = argv[2];
    if (!name || !command) {
      console.error("\nUsage: forge mcp add <name> <command> [--env KEY=VAL,...]\n");
      process.exit(1);
    }
    const envIdx = argv.indexOf("--env");
    const env: Record<string, string> = {};
    if (envIdx !== -1 && argv[envIdx + 1]) {
      for (const pair of argv[envIdx + 1]!.split(",")) {
        const eq = pair.indexOf("=");
        if (eq > 0) env[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
    }
    addMcpServer(name, command, [], env);
    console.log(`\n✅ MCP server "${name}" added. Run: forge mcp list\n`);
  } else if (sub === "list" || !sub) {
    const servers = listMcpServers();
    if (servers.length === 0) {
      console.log("\nNo MCP servers configured.");
      console.log("Add one: forge mcp add github 'bunx @modelcontextprotocol/server-github' --env GITHUB_TOKEN=ghp_...\n");
    } else {
      console.log("\nMCP Servers:\n");
      for (const s of servers) {
        const envKeys = Object.keys(s.env);
        console.log(`  ${s.enabled ? "✅" : "⏸"} ${s.name}  ${s.command}`);
        if (envKeys.length > 0) console.log(`     env: ${envKeys.join(", ")}`);
      }
      console.log();
    }
  } else if (sub === "remove") {
    const name = argv[1];
    if (!name) { console.error("\nUsage: forge mcp remove <name>\n"); process.exit(1); }
    removeMcpServer(name);
    console.log(`\n✅ Removed MCP server "${name}"\n`);
  } else {
    console.error(`\nUnknown mcp command: ${sub}. Use: add, list, remove\n`);
    process.exit(1);
  }

  closeDb();
}

async function main() {
  // Handle "forge mcp ..." before Commander parses (avoids subcommand conflicts)
  if (process.argv[2] === "mcp") {
    await handleMcp(process.argv.slice(3));
    return;
  }

  const program = new Command();
  program
    .name("forge")
    .description("Personal coding agent — multi-provider, MCP-ready")
    .version("0.1.0")
    .argument("[prompt...]", "Task for the agent")
    .option("-m, --model <model>", "Provider and model", DEFAULT_MODEL)
    .option("-l, --list", "List recent sessions")
    .option("-s, --session <id>", "Continue a previous session by ID")
    .option("-c, --continue", "Continue the most recent session")
    .option("--list-models", "Show available models from all providers")
    .option("--set-key <provider>", "Save an API key")
    .option("--show-config", "Show configured providers")
    .addHelpText("after", "\nMCP commands:\n  forge mcp add <name> <command> [--env KEY=VAL,...]\n  forge mcp list\n  forge mcp remove <name>")
    .parse();

  const args = program.args;
  const opts = program.opts();

  // --set-key
  if (opts.setKey) {
    getDb();
    const argv = process.argv.slice(2);
    const idx = argv.findIndex((a) => a === "--set-key");
    const provider = argv[idx + 1];
    const key = argv[idx + 2];
    if (!provider || !key) {
      console.error("\nUsage: forge --set-key <provider> <key>\nExample: forge --set-key anthropic sk-ant-...\n");
      process.exit(1);
    }
    saveApiKey(provider, key);
    closeDb();
    return;
  }

  // --show-config
  if (opts.showConfig) {
    getDb();
    showConfigStatus();
    closeDb();
    return;
  }

  // --list-models
  if (opts.listModels) {
    console.log("Discovering available models...\n");
    getDb();
    const dbKeys = getAllApiKeys();
    const keys = {
      anthropic: process.env.ANTHROPIC_API_KEY || dbKeys.anthropic,
      openai: process.env.OPENAI_API_KEY || dbKeys.openai,
      openrouter: process.env.OPENROUTER_API_KEY || dbKeys.openrouter,
    };
    console.log(formatModelListForDisplay(await discoverAllModels(keys)));
    closeDb();
    return;
  }

  // --list
  if (opts.list) {
    getDb();
    const sessions = listSessions();
    if (sessions.length === 0) {
      console.log("\nNo sessions yet.\n");
    } else {
      console.log("\nRecent sessions:\n");
      for (const s of sessions) {
        console.log(`  ${s.id.slice(0, 8)}  ${new Date(s.created_at).toLocaleString()}  ${s.title}`);
      }
      console.log();
    }
    closeDb();
    return;
  }

  // No prompt + TTY = launch interactive TUI
  if (args.length === 0) {
    if (process.stdin.isTTY) {
      await launchTui(opts);
      return;
    }
    program.help();
    return;
  }

  const prompt = args.join(" ");
  const modelString = opts.model || DEFAULT_MODEL;

  try {
    getDb();

    // Resolve session continuation
    let sessionId: string | null = null;
    let existingMessages: Array<{ role: string; content: string }> = [];

    if (opts.continue) {
      const sessions = listSessions(1);
      if (sessions.length > 0) {
        sessionId = sessions[0]!.id;
        console.log(`\n  Continuing session: ${sessionId!.slice(0, 8)}`);
      }
    } else if (opts.session) {
      const s = getSession(opts.session);
      if (!s) { console.error(`\nSession not found: ${opts.session}\n`); process.exit(1); }
      sessionId = s.id;
      console.log(`\n  Continuing session: ${sessionId.slice(0, 8)}`);
    }

    if (sessionId) {
      existingMessages = getSessionMessages(sessionId).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    const { provider, displayName } = resolveProvider(modelString);

    // Load MCP tools and register executor
    const { tools: mcpTools, execute: mcpExecute } = await loadMcpTools();
    if (mcpTools.length > 0) {
      registerMcpExecutor(mcpExecute);
      TOOLS.push(...mcpTools);
    }

    // Load custom tools from .forge/tools/
    const customTools = await discoverCustomTools();
    for (const ct of customTools) {
      TOOLS.push({ name: ct.name, description: ct.description, input_schema: ct.input_schema as any });
      // Register custom tool executor inline (extends MCP fallback)
      const prevExecutor = mcpExecute;
      registerMcpExecutor(async (name, input) => {
        const found = customTools.find((t) => t.name === name);
        if (found) return found.execute(input);
        return prevExecutor(name, input);
      });
    }

    const systemPrompt = await buildSystemPrompt();

    console.log(`\n  Model: ${displayName}`);
    console.log(`  Task:  ${prompt}\n`);
    console.log("─".repeat(60) + "\n");

    const session = sessionId
      ? { id: sessionId }
      : createSession(modelString, prompt.slice(0, 60));

    const result = await runAgent(provider, prompt, systemPrompt, (chunk) => {
      process.stdout.write(chunk);
    }, existingMessages);

    console.log("\n\n" + "─".repeat(60));
    saveMessage(session.id, "user", prompt);
    saveMessage(session.id, "assistant", result);
    console.log(`\n  Session: ${session.id}\n`);

    disconnectAllMcp();
    closeDb();
  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}\n`);
    disconnectAllMcp();
    closeDb();
    process.exit(1);
  }
}

async function launchTui(opts: Record<string, any>) {
  const { render } = await import("ink");
  const React = (await import("react")).default;
  const { App } = await import("./ui/App");

  const modelString: string = opts.model || DEFAULT_MODEL;

  getDb();

  // First-run check: no API key configured
  const { getConfiguredProviders } = await import("./db/index");
  const configured = getConfiguredProviders();
  const hasEnvKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (configured.length === 0 && !hasEnvKey) {
    console.log("\n  Welcome to Forge!\n");
    console.log("  No API key found. Set one to get started:\n");
    console.log("    forge --set-key anthropic sk-ant-...");
    console.log("    forge --set-key openai sk-...\n");
    console.log("  Or set an environment variable: ANTHROPIC_API_KEY=...\n");
    closeDb();
    process.exit(0);
  }

  // Load MCP + custom tools
  const { tools: mcpTools, execute: mcpExecute } = await loadMcpTools();
  if (mcpTools.length > 0) { registerMcpExecutor(mcpExecute); TOOLS.push(...mcpTools); }
  const customTools = await discoverCustomTools();
  for (const ct of customTools) {
    TOOLS.push({ name: ct.name, description: ct.description, input_schema: ct.input_schema as any });
  }

  const systemPrompt = await buildSystemPrompt();

  // Session resolution
  let sessionId: string | null = null;
  let initialMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (opts.continue) {
    const sessions = listSessions(1);
    if (sessions.length > 0) {
      sessionId = sessions[0]!.id;
      initialMessages = getSessionMessages(sessionId).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    }
  } else if (opts.session) {
    const s = getSession(opts.session);
    if (s) {
      sessionId = s.id;
      initialMessages = getSessionMessages(sessionId).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    }
  }

  const { waitUntilExit } = render(
    React.createElement(App, {
      model: modelString,
      sessionId,
      systemPrompt,
      initialMessages,
      createProvider: (m: string) => resolveProvider(m).provider,
      onSessionCreate: (sid: string) => {
        try {
          getDb().prepare(
            "INSERT OR IGNORE INTO sessions (id, parent_id, title, model, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?)"
          ).run(sid, "interactive session", modelString, Date.now(), Date.now());
        } catch { /* already exists */ }
      },
      onMessage: (sid: string, role: "user" | "assistant", content: string) => {
        saveMessage(sid, role, content);
      },
    })
  );

  await waitUntilExit();
  disconnectAllMcp();
  closeDb();
}

main();
