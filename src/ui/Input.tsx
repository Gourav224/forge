import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function Input({ onSubmit, disabled = false }: Props) {
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (key.escape) return;

    if (!disabled && key.return) {
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setValue("");
      }
      return;
    }

    if (key.ctrl && input === "c") {
      process.exit(0);
    }

    if (disabled) return;

    if (key.ctrl && input === "u") {
      setValue("");
      return;
    }

    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      return;
    }

    if (!key.ctrl && !key.meta && input) {
      setValue((v) => v + input);
    }
  });

  const cols = process.stdout.columns || 80;

  return (
    <Box flexDirection="column">
      <Text color="gray">{"─".repeat(cols)}</Text>
      <Box paddingX={1} paddingY={0}>
        <Text bold color={disabled ? "gray" : "magenta"}>{" ❯ "}</Text>
        <Text>{value}</Text>
        {!disabled && <Text color="magenta">█</Text>}
        {disabled && <Text color="gray" dimColor> (working…)</Text>}
      </Box>
    </Box>
  );
}
