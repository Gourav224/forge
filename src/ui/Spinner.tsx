import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Forge-themed working words; cycles slowly so it feels alive, not frantic.
const WORDS = ["Forging", "Hammering", "Smithing", "Tempering", "Kindling", "Working", "Thinking"];

interface Props {
  startMs: number;
}

export function Spinner({ startMs }: Props) {
  const [frame, setFrame] = useState(0);
  const [now, setNow] = useState(() => startMs);

  useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => f + 1);
      setNow(Date.now());
    }, 90);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  const word = WORDS[Math.floor(elapsed / 3) % WORDS.length]!;
  const glyph = FRAMES[frame % FRAMES.length]!;

  return (
    <Box paddingLeft={1}>
      <Text color={theme.accent}>{glyph} </Text>
      <Text color={theme.ember}>{word}…</Text>
      <Text color={theme.muted}>{`  ${elapsed}s · esc to interrupt`}</Text>
    </Box>
  );
}
