import React, { useState, useCallback, useRef } from "react";
import { Box, useApp } from "ink";
import { randomUUID } from "node:crypto";
import { StatusBar } from "./StatusBar";
import { ChatPane } from "./ChatPane";
import { Input } from "./Input";
import type { Message, ToolEvent } from "./types";
import { runAgentTui } from "../agent-tui";
import { discoverAllModels, formatModelListForDisplay } from "../providers/discovery";
import { getAllApiKeys } from "../db/index";

const HELP_TEXT = `Commands:
  /clear   — clear conversation
  /new     — start a new session
  /models  — list available models
  /help    — show this message
  /exit    — quit forge`;

interface Props {
  model: string;
  sessionId: string | null;
  systemPrompt: string;
  initialMessages?: Message[];
  providerFactory: () => import("../providers/types").ProviderClient;
  onSessionCreate: (sessionId: string) => void;
  onMessage: (sessionId: string, role: "user" | "assistant", content: string) => void;
}

export function App({
  model,
  sessionId: initialSessionId,
  systemPrompt,
  initialMessages = [],
  providerFactory,
  onSessionCreate,
  onMessage,
}: Props) {
  useApp();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);

  const abortRef = useRef<AbortController | null>(null);
  // Track live tool events in a ref so we can freeze them into the message on completion
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
          break;

        case "/exit":
          process.exit(0);

        case "/help":
          setMessages((prev) => [...prev, { role: "assistant", content: HELP_TEXT }]);
          break;

        case "/models": {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Discovering models…" },
          ]);
          const dbKeys = getAllApiKeys();
          const keys = {
            anthropic: process.env.ANTHROPIC_API_KEY || dbKeys.anthropic,
            openai: process.env.OPENAI_API_KEY || dbKeys.openai,
            openrouter: process.env.OPENROUTER_API_KEY || dbKeys.openrouter,
          };
          const result = formatModelListForDisplay(await discoverAllModels(keys));
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: result },
          ]);
          break;
        }

        default:
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Unknown command: ${base}\nType /help for available commands.` },
          ]);
      }
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
        const provider = providerFactory();
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
          },
          controller.signal
        );

        // Freeze tool events into the assistant message so they stay visible in history
        const frozenTools = liveToolEventsRef.current.length > 0
          ? [...liveToolEventsRef.current]
          : undefined;

        const assistantMsg: Message = {
          role: "assistant",
          content: result,
          toolEvents: frozenTools,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setCurrentText("");
        setToolEvents([]);
        liveToolEventsRef.current = [];

        if (result) onMessage(sid, "assistant", result);
      } catch (err) {
        const isAbort = controller.signal.aborted;
        if (!isAbort) {
          const errText = err instanceof Error ? err.message : String(err);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${errText}` },
          ]);
        }
        setCurrentText("");
        setToolEvents([]);
        liveToolEventsRef.current = [];
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [isRunning, messages, sessionId, systemPrompt, providerFactory, onSessionCreate, onMessage]
  );

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      <StatusBar model={model} sessionId={sessionId} isRunning={isRunning} />
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
