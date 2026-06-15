import React, { useState, useCallback, useRef } from "react";
import { Box, useApp } from "ink";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { StatusBar } from "./StatusBar";
import { ChatPane } from "./ChatPane";
import { Input } from "./Input";
import { Approval } from "./Approval";
import { Login } from "./Login";
import type { Message, ToolEvent } from "./types";
import type { TokenUsage } from "../providers/types";
import { runAgentTui } from "../agent-tui";
import { discoverAllModels, formatModelListForDisplay } from "../providers/discovery";
import {
  getAllApiKeys, listSessions, getSessionMessages, saveMessage,
  setApiKey, getConfiguredProviders, getAllSettings,
  getDbStats, getDbPath, resetAll, clearSessions, branchSession,
} from "../db/index";
import { compactNow } from "../agent/compaction";
import { resolveProvider } from "../providers/index";
import { PROVIDERS } from "../config/providers";
import { type AgentMode, DEFAULT_MODE, isMode, describeMode } from "../agent/modes";

const HELP_TEXT = `## Commands

- **/help** — show this message
- **/clear** — clear the screen
- **/new** — start a fresh session
- **/sessions** — list recent sessions · \`/sessions load <id>\` to resume
- **/model** \`<spec>\` — show or switch model (e.g. \`/model openai:gpt-4o\`)
- **/models** — discover available models
- **/mode** \`plan|build|auto\` — switch agent mode
- **/compact** — summarize the conversation to free up context
- **/branch** — fork the current session into a new one
- **/rewind** \`<n>\` — keep the first n messages, branch from there
- **/login** — add a provider API key
- **/config** — show configuration
- **/clean confirm** — delete all session history
- **/reset confirm** — wipe everything (keys, settings, history)
- **/exit** — quit forge

**Modes:** \`plan\` reads only & proposes a plan · \`build\` edits with approval · \`auto\` runs unattended.`;

const CWD = process.cwd();
const BRANCH = detectBranch();

function detectBranch(): string | null {
  try {
    const head = readFileSync(".git/HEAD", "utf8").trim();
    const m = head.match(/ref:\s*refs\/heads\/(.+)$/);
    return m ? m[1]! : head.slice(0, 7);
  } catch {
    return null;
  }
}

interface PendingApproval {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface Props {
  model: string;
  sessionId: string | null;
  systemPrompt: string;
  initialMessages?: Message[];
  initialMode?: AgentMode;
  createProvider: (modelString: string) => import("../providers/types").ProviderClient;
  onSessionCreate: (sessionId: string) => void;
  onMessage: (sessionId: string, role: "user" | "assistant", content: string) => void;
}

export function App({
  model,
  sessionId: initialSessionId,
  systemPrompt,
  initialMessages = [],
  initialMode = DEFAULT_MODE,
  createProvider,
  onSessionCreate,
  onMessage,
}: Props) {
  useApp();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [currentModel, setCurrentModel] = useState(model);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [contextTokens, setContextTokens] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [turnStartMs, setTurnStartMs] = useState(0);
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const liveToolEventsRef = useRef<ToolEvent[]>([]);
  const toolStartTimesRef = useRef<Record<string, number>>({});
  const approvalResolverRef = useRef<((v: boolean) => void) | null>(null);
  const autoApproveRef = useRef(false);

  const say = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  }, []);

  const resolveApproval = useCallback((decision: "yes" | "no" | "always") => {
    if (decision === "always") autoApproveRef.current = true;
    const r = approvalResolverRef.current;
    approvalResolverRef.current = null;
    setPendingApproval(null);
    r?.(decision !== "no");
  }, []);

  const handleAbort = useCallback(() => {
    // If we're paused on an approval, deny it so the loop can unwind.
    if (approvalResolverRef.current) {
      const r = approvalResolverRef.current;
      approvalResolverRef.current = null;
      setPendingApproval(null);
      r(false);
    }
    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort();
    }
  }, []);

  const handleCommand = useCallback(
    async (cmd: string) => {
      const parts = cmd.trim().split(/\s+/);
      const base = parts[0]!;

      switch (base) {
        case "/clear":
          setMessages([]);
          setToolEvents([]);
          setCurrentText("");
          setGeneration((g) => g + 1);
          break;

        case "/new":
          setMessages([]);
          setToolEvents([]);
          setCurrentText("");
          setSessionId(null);
          setUsage(null);
          setGeneration((g) => g + 1);
          break;

        case "/exit":
          process.exit(0);

        case "/help":
          say(HELP_TEXT);
          break;

        case "/mode": {
          const m = parts[1];
          if (!m) {
            say(`Current mode: **${mode}** — ${describeMode(mode)}\n\nSwitch with \`/mode plan|build|auto\`.`);
            break;
          }
          if (!isMode(m)) {
            say(`Unknown mode \`${m}\`. Use \`plan\`, \`build\`, or \`auto\`.`);
            break;
          }
          autoApproveRef.current = false;
          setMode(m);
          say(`Switched to **${m}** mode — ${describeMode(m)}`);
          break;
        }

        case "/login":
          setLoginOpen(true);
          break;

        case "/compact": {
          if (messages.length < 4) { say("Not enough conversation to compact yet."); break; }
          say("Compacting conversation…");
          try {
            const provider = createProvider(currentModel);
            const loopMsgs = messages.map((m) => ({ role: m.role, content: m.content }));
            const res = await compactNow(loopMsgs, provider);
            if (!res) {
              setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: "Nothing to compact." }]);
              break;
            }
            const recent = messages.slice(-4);
            setMessages([
              { role: "assistant", content: `**Context compacted.** Older messages summarized:\n\n${res.summary}` },
              ...recent,
            ]);
            setGeneration((g) => g + 1);
          } catch (e) {
            setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: `Compaction failed: ${e instanceof Error ? e.message : String(e)}` }]);
          }
          break;
        }

        case "/branch": {
          if (!sessionId) { say("No active session to branch."); break; }
          const b = branchSession(sessionId);
          if (!b) { say("Could not branch this session."); break; }
          setSessionId(b.id);
          say(`Branched to \`${b.id.slice(0, 8)}\` — continue here without affecting the original.`);
          break;
        }

        case "/rewind": {
          const n = parseInt(parts[1] || "", 10);
          if (!sessionId) { say("No active session to rewind."); break; }
          if (!Number.isFinite(n) || n < 0) { say("Usage: `/rewind <n>` — keep the first n messages, branch from there."); break; }
          const b = branchSession(sessionId, n);
          if (!b) { say("Could not rewind."); break; }
          setSessionId(b.id);
          setMessages([
            ...messages.slice(0, n),
            { role: "assistant", content: `*Rewound to ${n} message${n === 1 ? "" : "s"} on a new branch \`${b.id.slice(0, 8)}\`.*` },
          ]);
          setGeneration((g) => g + 1);
          break;
        }

        case "/config": {
          const stats = getDbStats();
          const configured = getConfiguredProviders();
          const envProviders = PROVIDERS.filter((p) => p.envVar && process.env[p.envVar]).map((p) => p.id);
          const all = [...new Set([...configured, ...envProviders])];
          const settings = getAllSettings();
          const provLines = all.length
            ? all.map((id) => `- ${id} (${envProviders.includes(id) ? "env var" : "saved key"})`).join("\n")
            : "- none — run `/login`";
          const setLines = Object.keys(settings).length
            ? Object.entries(settings).map(([k, v]) => `- \`${k}\` = ${v}`).join("\n")
            : "- (defaults)";
          say(
            `## Configuration\n\n` +
            `**database** \`${getDbPath()}\`\n` +
            `**sessions** ${stats.sessions} (${stats.messages} messages)\n` +
            `**mode** ${mode}\n\n` +
            `### Providers\n${provLines}\n\n### Settings\n${setLines}`
          );
          break;
        }

        case "/reset": {
          if (parts[1] !== "confirm") {
            say("⚠ This wipes **all** keys, settings, and history.\n\nType `/reset confirm` to proceed.");
            break;
          }
          resetAll();
          setMessages([]);
          setUsage(null);
          setSessionId(null);
          setGeneration((g) => g + 1);
          say("Everything wiped. You'll need to `/login` again.");
          break;
        }

        case "/clean": {
          if (parts[1] !== "confirm") {
            say("⚠ This deletes all session history (keys & settings kept).\n\nType `/clean confirm` to proceed.");
            break;
          }
          const { sessions } = clearSessions();
          setMessages([]);
          setSessionId(null);
          setGeneration((g) => g + 1);
          say(`Cleared ${sessions} session${sessions === 1 ? "" : "s"}.`);
          break;
        }

        case "/sessions": {
          const sub = parts[1];
          if (sub === "load" && parts[2]) {
            const prefix = parts[2]!;
            const all = listSessions(20);
            const match = all.find((s) => s.id.startsWith(prefix));
            if (!match) {
              say(`No session found matching: \`${prefix}\``);
              break;
            }
            const msgs = getSessionMessages(match.id).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }));
            setSessionId(match.id);
            setToolEvents([]);
            setCurrentText("");
            setUsage(null);
            setMessages([
              ...msgs,
              { role: "assistant", content: `*Loaded session \`${match.id.slice(0, 8)}\` — ${match.title}*` },
            ]);
            setGeneration((g) => g + 1);
            break;
          }
          const sessions = listSessions(10);
          const lines = sessions.length === 0
            ? "No sessions yet."
            : sessions
                .map((s) => `- \`${s.id.slice(0, 8)}\`  ${new Date(s.updated_at).toLocaleString().slice(0, 16)}  ${s.title}`)
                .join("\n");
          say(`## Recent sessions\n\n${lines}\n\nLoad one with \`/sessions load <id-prefix>\``);
          break;
        }

        case "/model": {
          const spec = parts[1];
          if (!spec) {
            say(`Current model: \`${currentModel}\`\n\nSwitch with \`/model provider:model-id\``);
            break;
          }
          try {
            resolveProvider(spec);
            setCurrentModel(spec);
            say(`Switched to \`${spec}\``);
          } catch (e) {
            say(`**Invalid model:** ${e instanceof Error ? e.message : String(e)}`);
          }
          break;
        }

        case "/models": {
          say("Discovering models…");
          const dbKeys = getAllApiKeys();
          const keys = {
            anthropic: process.env.ANTHROPIC_API_KEY || dbKeys.anthropic,
            openai: process.env.OPENAI_API_KEY || dbKeys.openai,
            openrouter: process.env.OPENROUTER_API_KEY || dbKeys.openrouter,
          };
          const result = formatModelListForDisplay(await discoverAllModels(keys));
          setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: result }]);
          break;
        }

        default:
          say(`Unknown command: \`${base}\`\n\nType \`/help\` for available commands.`);
      }
    },
    [currentModel, mode, say]
  );

  const onApproval = useCallback(
    (id: string, name: string, input: Record<string, unknown>): Promise<boolean> => {
      if (autoApproveRef.current) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        approvalResolverRef.current = resolve;
        setPendingApproval({ id, name, input });
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (isRunning) return;

      const userMsg: Message = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMsg]);
      setToolEvents([]);
      setCurrentText("");
      liveToolEventsRef.current = [];
      setTurnStartMs(Date.now());
      setIsRunning(true);

      let sid = sessionId;
      if (!sid) {
        sid = randomUUID();
        setSessionId(sid);
        onSessionCreate(sid);
      }
      onMessage(sid, "user", prompt);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const provider = createProvider(currentModel);
        const existingForAgent = messages.map((m) => ({ role: m.role, content: m.content }));

        const result = await runAgentTui(
          provider,
          prompt,
          systemPrompt,
          existingForAgent,
          {
            onText: (chunk) => setCurrentText((t) => t + chunk),

            onToolStart: (id, name, input) => {
              toolStartTimesRef.current[id] = Date.now();
              const ev: ToolEvent = { id, name, input, status: "running", startMs: Date.now() };
              liveToolEventsRef.current = [...liveToolEventsRef.current, ev];
              setToolEvents([...liveToolEventsRef.current]);
            },

            onToolDone: (id, toolResult) => {
              const durationMs = toolStartTimesRef.current[id]
                ? Date.now() - toolStartTimesRef.current[id]!
                : undefined;
              delete toolStartTimesRef.current[id];
              liveToolEventsRef.current = liveToolEventsRef.current.map((e) =>
                e.id === id ? { ...e, status: "done" as const, result: toolResult, durationMs } : e
              );
              setToolEvents([...liveToolEventsRef.current]);
            },

            onUsage: (u) => setUsage(u),
            onContext: (t) => setContextTokens(t),
            onApproval,
            onCompact: () => {
              setMessages((prev) => [...prev, { role: "assistant", content: "*Context compacted — older messages summarized to stay within the window.*" }]);
            },
          },
          controller.signal,
          mode,
          currentModel
        );

        const frozenTools = liveToolEventsRef.current.length > 0
          ? [...liveToolEventsRef.current]
          : undefined;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result, toolEvents: frozenTools },
        ]);
        setCurrentText("");
        setToolEvents([]);
        liveToolEventsRef.current = [];

        if (result) onMessage(sid, "assistant", result);
      } catch (err) {
        const isAbort = controller.signal.aborted;
        if (isAbort) {
          setMessages((prev) => [...prev, { role: "assistant", content: "*Interrupted.*" }]);
        } else {
          const errText = err instanceof Error ? err.message : String(err);
          setMessages((prev) => [...prev, { role: "assistant", content: `**Error:** ${errText}` }]);
        }
        setCurrentText("");
        setToolEvents([]);
        liveToolEventsRef.current = [];
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [isRunning, messages, sessionId, systemPrompt, createProvider, currentModel, mode, onApproval, onSessionCreate, onMessage]
  );

  return (
    <Box flexDirection="column">
      <ChatPane
        messages={messages}
        toolEvents={toolEvents}
        currentText={currentText}
        isRunning={isRunning}
        generation={generation}
        turnStartMs={turnStartMs}
        model={currentModel}
        cwd={CWD}
        branch={BRANCH}
      />

      {loginOpen ? (
        <Login
          saveKey={(p, k) => setApiKey(p, k)}
          onComplete={(msg) => {
            setLoginOpen(false);
            say(msg);
          }}
          onCancel={() => {
            setLoginOpen(false);
            say("*Login cancelled.*");
          }}
        />
      ) : pendingApproval ? (
        <Approval pending={pendingApproval} onDecide={resolveApproval} />
      ) : (
        <Input
          onSubmit={handleSubmit}
          onCommand={handleCommand}
          onAbort={handleAbort}
          disabled={isRunning}
        />
      )}

      <StatusBar
        model={currentModel}
        sessionId={sessionId}
        isRunning={isRunning}
        usage={usage}
        contextTokens={contextTokens}
        cwd={CWD}
        branch={BRANCH}
        mode={mode}
      />
    </Box>
  );
}
