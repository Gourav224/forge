import React, { useState, useEffect } from "react";
import { Box, Text, Static } from "ink";
import type { Message, ToolEvent } from "./types";
import { ToolCallRow } from "./ToolCall";
import { Markdown } from "./markdown";
import { Spinner } from "./Spinner";
import { Banner } from "./Banner";
import { theme } from "./theme";

interface Props {
  messages: Message[];
  toolEvents: ToolEvent[];
  currentText: string;
  isRunning: boolean;
  generation: number;
  turnStartMs: number;
  model: string;
  cwd: string;
  branch?: string | null;
}

function RoleHeader({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  return (
    <Text color={isUser ? theme.user : theme.accent} bold>
      {isUser ? "▌ you" : "✦ forge"}
    </Text>
  );
}

function MessageBody({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const hasTools = (msg.toolEvents?.length ?? 0) > 0;
  return (
    <Box flexDirection="column" marginTop={1}>
      <RoleHeader role={msg.role} />
      {msg.toolEvents?.map((ev) => (
        <ToolCallRow key={ev.id} event={ev} spinnerFrame={0} />
      ))}
      {msg.content ? (
        <Box paddingLeft={2} flexDirection="column" marginTop={hasTools ? 1 : 0}>
          {isUser ? (
            <Text color={theme.text}>{msg.content}</Text>
          ) : (
            <Markdown content={msg.content} />
          )}
        </Box>
      ) : null}
    </Box>
  );
}

export function ChatPane({
  messages,
  toolEvents,
  currentText,
  isRunning,
  generation,
  turnStartMs,
  model,
  cwd,
  branch,
}: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setFrame((f) => f + 1), 90);
    return () => clearInterval(t);
  }, [isRunning]);

  const hasActiveWork = isRunning || toolEvents.length > 0 || Boolean(currentText);
  const showBanner = messages.length === 0 && !hasActiveWork;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Completed messages — printed once, kept in terminal scrollback */}
      <Static key={generation} items={messages}>
        {(msg, i) => <MessageBody key={i} msg={msg} />}
      </Static>

      {/* Welcome banner on a fresh, idle session */}
      {showBanner && <Banner model={model} cwd={cwd} branch={branch} />}

      {/* Live turn in progress */}
      {hasActiveWork && (
        <Box flexDirection="column" marginTop={1}>
          <RoleHeader role="assistant" />

          {toolEvents.map((ev) => (
            <ToolCallRow key={ev.id} event={ev} spinnerFrame={frame} />
          ))}

          {currentText ? (
            <Box paddingLeft={2} flexDirection="column" marginTop={toolEvents.length > 0 ? 1 : 0}>
              <Markdown content={currentText} />
            </Box>
          ) : null}

          {isRunning && !currentText && (
            <Box marginTop={toolEvents.length > 0 ? 1 : 0}>
              <Spinner startMs={turnStartMs} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
