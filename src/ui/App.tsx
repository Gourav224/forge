import React, { useState, useCallback, useRef } from "react";
import { Box, useApp } from "ink";
import { randomUUID } from "node:crypto";
import { StatusBar } from "./StatusBar";
import { ChatPane } from "./ChatPane";
import { Input } from "./Input";
import type { Message, ToolEvent } from "./types";
import type { TokenUsage } from "../providers/types";
import { runAgentTui } from "../agent-tui";
import { discoverAllModels, formatModelListForDisplay } from "../providers/discovery";
import { getAllApiKeys, listSessions, getSessionMessages, saveMessage } from "../db/index";
import { resolveProvider } from "../providers/index";

const HELP_TEXT = `Commands:
  /clear              — clear conversation display
  /new                — start a fresh session
  /sessions           — list recent sessions
  /sessions load <id> — load a past session by ID prefix
  /model              — show current model
  /model <spec>       — switch model (e.g. /model openai:gpt-4o)
  /models             — discover all available models
  /help               — show this message
  /exit               — quit forge`;

interface Props {
  model: string;
  sessionId: string | null;
  systemPrompt: string;
  initialMessages?: Message[];
  createProvider: (modelString: string) => import("../providers/types").ProviderClient;
  onSessionCreate: (sessionId: string) => void;
  onMessage: (sessionId: string, role: "user" | "assistant", content: string) => void;
}

export function App({
  model,
  sessionId: initialSessionId,
  systemPrompt,
  initialMessages = [],
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

  const abortRef = useRef<AbortController | null>(null);
  const liveToolEventsRef = useRef<ToolEvent[]>([]);
  const toolStartTimesRef = useRef<Record<string, number>>({});

  const handleAbort = useCallback(() => {
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
          break;

        case "/new":
          setMessages([]);
          setToolEvents([]);
          setCurrentText("");
          setSessionId(null);
          setUsage(null);
          break;

        case "/exit":
          process.exit(0);

        case "/help":
          setMessages((prev) => [...prev, { role: "assistant", content: HELP_TEXT }]);
          break;

        case "/sessions": {
          const sub = parts[1];
          if (sub === "load" && parts[2]) {
            const prefix = parts[2]!;
            const all = listSessions(20);
            const match = all.find((s) => s.id.startsWith(prefix));
            if (!match) {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `No session found matching: ${prefix}` },
              ]);
              break;
            }
            const msgs = getSessionMessages(match.id).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }));
            setMessages(msgs);
            setSessionId(match.id);
            setToolEvents([]);
            setCurrentText("");
            setUsage(null);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `Loaded: ${match.id.slice(0, 8)} — ${match.title}` },
            ]);
            break;
          }
          const sessions = listSessions(10);
          const lines = sessions.length === 0
            ? "No sessions yet."
            : sessions
                .map((s) => `${s.id.slice(0, 8)}  ${new Date(s.updated_at).toLocaleString().slice(0, 16)}  ${s.title}`)
                .join("\n");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Recent sessions:\n\n${lines}\n\nLoad one: /sessions load <id-prefix>` },
          ]);
          break;
        }

        case "/model": {
          const spec = parts[1];
          if (!spec) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `Current model: ${currentModel}\nSwitch: /model provider:model-id` },
            ]);
            break;
          }
          try {
            resolveProvider(spec); // validate
            setCurrentModel(spec);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `Switched to ${spec}` },
            ]);
          } catch (e) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `Invalid model: ${e instanceof Error ? e.message : String(e)}` },
            ]);
          }
          break;
        }

        case "/models": {
          setMessages((prev) => [...prev, { role: "assistant", content: "Discovering models…" }]);
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
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Unknown command: ${base}\nType /help for available commands.` },
          ]);
      }
    },
    [currentModel]
  );

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (isRunning) return;

      const userMsg: Message = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMsg]);
      setToolEvents([]);
      setCurrentText("");
      liveToolEventsRef.current = [];
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
          },
          controller.signal
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
        if (!isAbort) {
          const errText = err instanceof Error ? err.message : String(err);
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errText}` }]);
        }
        setCurrentText("");
        setToolEvents([]);
        liveToolEventsRef.current = [];
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [isRunning, messages, sessionId, systemPrompt, createProvider, currentModel, onSessionCreate, onMessage]
  );

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      <StatusBar model={currentModel} sessionId={sessionId} isRunning={isRunning} usage={usage} />
      <ChatPane
        messages={messages}
        toolEvents={toolEvents}
        currentText={currentText}
        isRunning={isRunning}
      />
      <Input
        onSubmit={handleSubmit}
        onCommand={handleCommand}
        onAbort={handleAbort}
        disabled={isRunning}
      />
    </Box>
  );
}
