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

export function ChatPane({ messages, toolEvents, currentText, isRunning }: Props) {
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setSpinnerFrame((f) => f + 1), 80);
    return () => clearInterval(t);
  }, [isRunning]);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
      {messages.map((msg, i) => (
        <Box key={i} flexDirection="column" marginTop={1}>
          <Text bold color={msg.role === "user" ? "blue" : "magenta"}>
            {msg.role === "user" ? " you" : " forge"}
          </Text>
          <Box paddingLeft={2}>
            <Text wrap="wrap">{msg.content}</Text>
          </Box>
        </Box>
      ))}

      {/* Active assistant turn */}
      {(isRunning || toolEvents.length > 0 || currentText) && (
        <Box flexDirection="column" marginTop={1}>
          {/* Show "forge" label once, at start of active turn */}
          {(isRunning && toolEvents.length === 0 && !currentText) ? (
            <Text bold color="magenta"> forge</Text>
          ) : (toolEvents.length > 0 || currentText) ? (
            <Text bold color="magenta"> forge</Text>
          ) : null}

          {/* Tool events inline */}
          {toolEvents.map((ev) => (
            <ToolCallRow key={ev.id} event={ev} spinnerFrame={spinnerFrame} />
          ))}

          {/* Streaming text */}
          {currentText && (
            <Box paddingLeft={2} marginTop={toolEvents.length > 0 ? 1 : 0}>
              <Text wrap="wrap">{currentText}</Text>
            </Box>
          )}

          {/* Initial working indicator */}
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
