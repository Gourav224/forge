import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

const SLASH_COMMANDS = ["/clear", "/new", "/help", "/models", "/exit"];

interface Props {
  onSubmit: (text: string) => void;
  onCommand: (cmd: string) => void;
  onAbort: () => void;
  disabled?: boolean;
}

export function Input({ onSubmit, onCommand, onAbort, disabled = false }: Props) {
  const [value, setValue] = useState("");

  const hint = value.startsWith("/")
    ? SLASH_COMMANDS.filter((c) => c.startsWith(value) && c !== value)[0]
    : undefined;

  useInput((input, key) => {
    if (key.escape) return;

    if (key.ctrl && input === "c") {
      if (disabled) onAbort();
      else process.exit(0);
      return;
    }

    if (key.return) {
      if (disabled) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("/")) {
        onCommand(trimmed);
        setValue("");
      } else {
        onSubmit(trimmed);
        setValue("");
      }
      return;
    }

    if (disabled) return;

    if (key.tab && hint) {
      setValue(hint);
      return;
    }

    if (key.ctrl && input === "u") { setValue(""); return; }
    if (key.backspace || key.delete) { setValue((v) => v.slice(0, -1)); return; }
    if (!key.ctrl && !key.meta && input) setValue((v) => v + input);
  });

  const cols = process.stdout.columns || 80;

  return (
    <Box flexDirection="column">
      <Text color="gray">{"─".repeat(cols)}</Text>
      <Box paddingX={1}>
        <Text bold color={disabled ? "gray" : "magenta"}>{" ❯ "}</Text>
        <Text>{value}</Text>
        {hint && <Text color="gray" dimColor>{hint.slice(value.length)}</Text>}
        {!disabled && <Text color="magenta">█</Text>}
        {disabled && <Text color="gray" dimColor> Ctrl+C to cancel</Text>}
      </Box>
    </Box>
  );
}
