import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { Message, ToolEvent } from "./types";
import { ToolCallRow } from "./ToolCall";

interface Props {
  messages: Message[];
  toolEvents: ToolEvent[];
  currentText: string;
  isRunning: boolean;
}

function MessageBlock({ msg, spinnerFrame }: { msg: Message; spinnerFrame: number }) {
  const isUser = msg.role === "user";
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color={isUser ? "blue" : "magenta"}>
        {isUser ? " you" : " forge"}
      </Text>
      {/* Frozen tool events from this turn */}
      {msg.toolEvents?.map((ev) => (
        <ToolCallRow key={ev.id} event={ev} spinnerFrame={spinnerFrame} />
      ))}
      {msg.content && (
        <Box paddingLeft={2}>
          <Text wrap="wrap">{msg.content}</Text>
        </Box>
      )}
    </Box>
  );
}

export function ChatPane({ messages, toolEvents, currentText, isRunning }: Props) {
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setSpinnerFrame((f) => f + 1), 80);
    return () => clearInterval(t);
  }, [isRunning]);

  const hasActiveWork = isRunning || toolEvents.length > 0 || Boolean(currentText);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
      {messages.map((msg, i) => (
        <MessageBlock key={i} msg={msg} spinnerFrame={spinnerFrame} />
      ))}

      {/* Active assistant turn */}
      {hasActiveWork && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="magenta"> forge</Text>

          {toolEvents.map((ev) => (
            <ToolCallRow key={ev.id} event={ev} spinnerFrame={spinnerFrame} />
          ))}

          {currentText && (
            <Box paddingLeft={2} marginTop={toolEvents.length > 0 ? 1 : 0}>
              <Text wrap="wrap">{currentText}</Text>
            </Box>
          )}

          {isRunning && !currentText && toolEvents.length === 0 && (
            <Box paddingLeft={2}>
              <Text color="gray" dimColor>…</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
