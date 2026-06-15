import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme";
import { PROVIDERS, validateKey, maskKey } from "../config/providers";

interface Props {
  onComplete: (message: string) => void;
  onCancel: () => void;
  saveKey: (provider: string, key: string) => void;
}

export function Login({ onComplete, onCancel, saveKey }: Props) {
  const [step, setStep] = useState<"pick" | "key">("pick");
  const [providerId, setProviderId] = useState<string>("");
  const [key, setKey] = useState("");
  const [warn, setWarn] = useState<string | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId);

  useInput((input, k) => {
    if (k.escape) {
      onCancel();
      return;
    }

    if (step === "pick") {
      const n = Number(input);
      if (n >= 1 && n <= PROVIDERS.length) {
        const p = PROVIDERS[n - 1]!;
        if (!p.needsKey) {
          onComplete(`${p.label} runs locally — no key needed. Use \`/model ${p.exampleModel}\`.`);
          return;
        }
        setProviderId(p.id);
        setStep("key");
      }
      return;
    }

    // step === "key"
    if (k.return) {
      if (!key) {
        setWarn("Enter a key or press esc to cancel.");
        return;
      }
      const w = validateKey(providerId, key);
      if (w && !warn) {
        // First Enter with a suspicious key: show warning, require a second Enter.
        setWarn(`${w} Press Enter again to save anyway.`);
        return;
      }
      saveKey(providerId, key);
      onComplete(`Saved ${provider?.label} key (${maskKey(key)}). Switch with \`/model ${provider?.exampleModel}\`.`);
      return;
    }
    if (k.backspace || k.delete) {
      setKey((v) => v.slice(0, -1));
      setWarn(null);
      return;
    }
    if (k.ctrl && input === "c") {
      onCancel();
      return;
    }
    if (!k.ctrl && !k.meta && input) {
      setKey((v) => v + input);
      setWarn(null);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accentDim} paddingX={1}>
      <Text color={theme.accent} bold>◈ provider login</Text>

      {step === "pick" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.muted}>Choose a provider:</Text>
          {PROVIDERS.map((p, i) => (
            <Box key={p.id}>
              <Text color={theme.accent}>{`  ${i + 1}. `}</Text>
              <Text color={theme.text}>{p.label}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text color={theme.faint}>press a number · esc to cancel</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color={theme.muted}>Key for </Text>
            <Text color={theme.info}>{provider?.label}</Text>
          </Box>
          {provider?.signupUrl ? (
            <Text color={theme.faint}>get one at {provider.signupUrl}</Text>
          ) : null}
          <Box marginTop={1}>
            <Text color={theme.accent} bold>{"❯ "}</Text>
            <Text color={theme.text}>{"•".repeat(key.length)}</Text>
            <Text color={theme.accent}>▏</Text>
          </Box>
          {warn ? (
            <Box marginTop={1}>
              <Text color={theme.warning}>{warn}</Text>
            </Box>
          ) : (
            <Box marginTop={1}>
              <Text color={theme.faint}>↵ save · esc to cancel</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
