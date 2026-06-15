import React from "react";
import { Box, Text } from "ink";
import type { TokenUsage } from "../providers/types";
import type { AgentMode } from "../agent/modes";
import { usedPct } from "../agent/context";
import { theme } from "./theme";

interface Props {
  model: string;
  sessionId: string | null;
  isRunning: boolean;
  usage?: TokenUsage | null;
  contextTokens?: number;
  cwd: string;
  branch?: string | null;
  mode?: AgentMode;
}

const MODE_COLOR: Record<AgentMode, string> = {
  plan: theme.info,
  build: theme.accent,
  auto: theme.warning,
};

function ctxColor(pct: number): string {
  if (pct >= 85) return theme.error;
  if (pct >= 60) return theme.warning;
  return theme.success;
}

function shortenPath(p: string): string {
  const home = process.env.HOME || "";
  const short = home && p.startsWith(home) ? "~" + p.slice(home.length) : p;
  const parts = short.split("/");
  return parts.length > 3 ? "…/" + parts.slice(-2).join("/") : short;
}

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// A segment with a priority — lower priority numbers are dropped first when the
// terminal is too narrow to fit everything on one line.
interface Seg { text: string; color: string; bold?: boolean; priority: number }

export function StatusBar({ model, sessionId, isRunning, usage, contextTokens, cwd, branch, mode = "build" }: Props) {
  const shortModel = model.split(":").slice(1).join(":") || model;
  const provider = model.split(":")[0] ?? "";
  const totalTok = usage ? usage.inputTokens + usage.outputTokens : 0;
  const ctxPct = contextTokens ? usedPct(contextTokens, model) : 0;
  const cols = process.stdout.columns || 80;

  // priority: 100 = always keep, lower = drop sooner
  const all: Seg[] = [
    { text: "◈ forge", color: theme.accent, bold: true, priority: 100 },
    { text: mode, color: MODE_COLOR[mode], bold: true, priority: 95 },
    { text: `${provider}:${shortModel}`, color: theme.info, priority: 90 },
    { text: shortenPath(cwd), color: theme.muted, priority: 40 },
    ...(branch ? [{ text: `⎇ ${branch}`, color: theme.success, priority: 50 }] : []),
    ...(sessionId ? [{ text: `⧉ ${sessionId.slice(0, 6)}`, color: theme.muted, priority: 30 }] : []),
    ...(totalTok > 0 ? [{ text: `${fmtTokens(totalTok)} tok`, color: theme.muted, priority: 60 }] : []),
    ...(ctxPct > 0 ? [{ text: `ctx ${ctxPct}%`, color: ctxColor(ctxPct), priority: 70 }] : []),
    { text: isRunning ? "● working" : "ready", color: isRunning ? theme.ember : theme.faint, priority: 85 },
  ];

  // Drop lowest-priority segments until the line fits (sep " · " = 3 chars).
  const budget = cols - 2;
  const kept = [...all];
  const width = (segs: Seg[]) => segs.reduce((w, s) => w + s.text.length, 0) + (segs.length - 1) * 3;
  while (width(kept) > budget && kept.length > 1) {
    let minIdx = 0;
    for (let i = 1; i < kept.length; i++) {
      if (kept[i]!.priority < kept[minIdx]!.priority) minIdx = i;
    }
    kept.splice(minIdx, 1);
  }

  return (
    <Box flexDirection="column">
      <Text color={theme.faint}>{"─".repeat(cols)}</Text>
      <Box paddingX={1}>
        {kept.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <Text color={theme.faint}> · </Text> : null}
            <Text color={s.color} bold={s.bold}>{s.text}</Text>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
