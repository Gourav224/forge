import React from "react";
import { Box, Text } from "ink";
import type { TokenUsage } from "../providers/types";

interface Props {
  model: string;
  sessionId: string | null;
  isRunning: boolean;
  usage?: TokenUsage | null;
}

export function StatusBar({ model, sessionId, isRunning, usage }: Props) {
  const shortModel = model.split(":").slice(1).join(":") || model;
  const shortSession = sessionId ? sessionId.slice(0, 8) : null;
  const totalTok = usage ? usage.inputTokens + usage.outputTokens : 0;
  const tokDisplay = totalTok > 0
    ? totalTok >= 1000 ? `${(totalTok / 1000).toFixed(1)}k tok` : `${totalTok} tok`
    : null;

  return (
    <Box flexDirection="column">
      <Box paddingX={1} paddingY={0} gap={2}>
        <Text bold color="magenta">◈ forge</Text>
        <Text color="gray">{shortModel}</Text>
        {shortSession && <Text color="gray">· {shortSession}</Text>}
        {tokDisplay && <Text color="gray">· {tokDisplay}</Text>}
        {isRunning && <Text color="yellow">· thinking…</Text>}
      </Box>
      <Text color="gray">{"─".repeat(process.stdout.columns || 80)}</Text>
    </Box>
  );
}
