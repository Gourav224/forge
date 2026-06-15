import React from "react";
import { Box, Text, useInput } from "ink";
import { theme, styleForTool } from "./theme";

interface PendingApproval {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface Props {
  pending: PendingApproval;
  onDecide: (decision: "yes" | "no" | "always") => void;
}

function describe(name: string, input: Record<string, unknown>): string {
  const v = (k: string) => String(input[k] ?? "");
  switch (name) {
    case "bash_exec": return v("command");
    case "write_file": return v("path");
    case "edit_file": return v("path");
    case "patch_file": return v("path");
    default: return v("path") || v("command") || JSON.stringify(input).slice(0, 80);
  }
}

export function Approval({ pending, onDecide }: Props) {
  const style = styleForTool(pending.name);

  useInput((input, key) => {
    const ch = input.toLowerCase();
    if (ch === "y") onDecide("yes");
    else if (ch === "a") onDecide("always");
    else if (ch === "n" || key.escape) onDecide("no");
    else if (key.return) onDecide("yes");
    else if (key.ctrl && input === "c") onDecide("no");
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.warning} paddingX={1}>
      <Box>
        <Text color={theme.warning} bold>{"⚠ permission "}</Text>
        <Text color={theme.muted}>Forge wants to run </Text>
        <Text color={style.color} bold>{style.icon} {style.label}</Text>
      </Box>
      <Box paddingLeft={2} marginTop={0}>
        <Text color={theme.text}>{describe(pending.name, pending.input).slice(0, 120)}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.success} bold>y</Text>
        <Text color={theme.muted}> allow   </Text>
        <Text color={theme.error} bold>n</Text>
        <Text color={theme.muted}> deny   </Text>
        <Text color={theme.accent} bold>a</Text>
        <Text color={theme.muted}> allow all this session   </Text>
        <Text color={theme.faint}>esc to deny</Text>
      </Box>
    </Box>
  );
}
