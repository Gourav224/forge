import React, { useState, useCallback } from "react";
import { Box, useApp } from "ink";
import { randomUUID } from "node:crypto";
import { StatusBar } from "./StatusBar";
import { ChatPane } from "./ChatPane";
import { Input } from "./Input";
import type { Message, ToolEvent } from "./types";
import { runAgentTui } from "../agent-tui";

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
  useApp(); // keep app alive
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);

  // Track per-tool start times for duration display
  const toolStartTimes = React.useRef<Record<string, number>>({});

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (isRunning) return;

      const userMsg: Message = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMsg]);
      setToolEvents([]);
      setCurrentText("");
      setIsRunning(true);

      let sid = sessionId;
      if (!sid) {
        sid = randomUUID();
        setSessionId(sid);
        onSessionCreate(sid);
      }

      onMessage(sid, "user", prompt);

      try {
        const provider = providerFactory();
        const existingForAgent = messages.map((m) => ({ role: m.role, content: m.content }));

        const result = await runAgentTui(provider, prompt, systemPrompt, existingForAgent, {
          onText: (chunk) => setCurrentText((t) => t + chunk),

          onToolStart: (id, name, input) => {
            toolStartTimes.current[id] = Date.now();
            setToolEvents((ev) => [
              ...ev,
              { id, name, input, status: "running", startMs: Date.now() },
            ]);
          },

          onToolDone: (id, result) => {
            const durationMs = toolStartTimes.current[id]
              ? Date.now() - toolStartTimes.current[id]!
              : undefined;
            delete toolStartTimes.current[id];
            setToolEvents((ev) =>
              ev.map((e) =>
                e.id === id ? { ...e, status: "done", result, durationMs } : e
              )
            );
          },
        });

        const assistantMsg: Message = { role: "assistant", content: result };
        setMessages((prev) => [...prev, assistantMsg]);
        setCurrentText("");
        setToolEvents([]);
        onMessage(sid, "assistant", result);
      } catch (err) {
        const errText = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errText}` },
        ]);
        setCurrentText("");
        setToolEvents([]);
      } finally {
        setIsRunning(false);
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
      <Input onSubmit={handleSubmit} disabled={isRunning} />
    </Box>
  );
}
