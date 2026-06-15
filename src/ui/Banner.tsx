import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme";

const WORDMARK = [
  "█▀▀ █▀█ █▀█ █▀▀ █▀▀",
  "█▀▀ █▄█ █▀▄ █▄█ ██▄",
];

interface Props {
  model: string;
  cwd: string;
  branch?: string | null;
}

function shortenPath(p: string): string {
  const home = process.env.HOME || "";
  return home && p.startsWith(home) ? "~" + p.slice(home.length) : p;
}

export function Banner({ model, cwd, branch }: Props) {
  const shortModel = model.split(":").slice(1).join(":") || model;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accentDim}
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Box flexDirection="column" marginBottom={1}>
        {WORDMARK.map((line, i) => (
          <Text key={i} color={theme.accent} bold>
            {line}
          </Text>
        ))}
      </Box>

      <Text color={theme.muted}>
        Terminal coding agent · <Text color={theme.ember}>forge</Text> your code with AI
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color={theme.faint}>{"model   "}</Text>
          <Text color={theme.info}>{shortModel}</Text>
        </Box>
        <Box>
          <Text color={theme.faint}>{"cwd     "}</Text>
          <Text color={theme.text}>{shortenPath(cwd)}</Text>
          {branch ? <Text color={theme.success}>{`  ⎇ ${branch}`}</Text> : null}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.muted}>
          <Text color={theme.accent}>/help</Text> for commands ·{" "}
          <Text color={theme.accent}>/model</Text> to switch ·{" "}
          <Text color={theme.accent}>Ctrl+C</Text> to exit
        </Text>
      </Box>
    </Box>
  );
}
