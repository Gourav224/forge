import React from "react";
import { Box, Text } from "ink";

interface Props {
  model: string;
  sessionId: string | null;
  isRunning: boolean;
}

export function StatusBar({ model, sessionId, isRunning }: Props) {
  const shortModel = model.split(":").slice(1).join(":") || model;
  const shortSession = sessionId ? sessionId.slice(0, 8) : null;

  return (
    <Box flexDirection="column">
      <Box paddingX={1} paddingY={0} gap={2}>
        <Text bold color="magenta">◈ forge</Text>
        <Text color="gray">{shortModel}</Text>
        {shortSession && <Text color="gray">· {shortSession}</Text>}
        {isRunning && <Text color="yellow">· thinking…</Text>}
      </Box>
      <Text color="gray">{"─".repeat(process.stdout.columns || 80)}</Text>
    </Box>
  );
}
