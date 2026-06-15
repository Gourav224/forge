import React from "react";
import { Box, Text } from "ink";
import type { ToolEvent } from "./types";
import { theme, styleForTool } from "./theme";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function toolSummary(name: string, input: Record<string, unknown> = {}): string {
  const s = (k: string) => String(input[k] ?? "").replace(/\s+/g, " ").slice(0, 60);
  switch (name) {
    case "bash_exec":   return s("command");
    case "read_file":   return s("path");
    case "write_file":  return s("path");
    case "edit_file":   return s("path");
    case "patch_file":  return s("path");
    case "list_dir":    return s("path") || ".";
    case "search_text": return `${s("pattern")} ${input.path ? `in ${s("path")}` : ""}`.trim();
    case "http_fetch":  return s("url").replace(/^https?:\/\//, "");
    case "skill":       return s("name") || "list";
    default:            return s("path") || s("command") || "";
  }
}

// First non-empty line of a tool result, trimmed for preview.
function resultPreview(result: string | undefined): { text: string; lines: number } | null {
  if (!result) return null;
  const all = result.split("\n");
  const nonEmpty = all.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return null;
  const first = nonEmpty[0]!.replace(/\s+/g, " ").slice(0, 64);
  return { text: first, lines: all.length };
}

function fmtDuration(ms: number | undefined): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface Props {
  event: ToolEvent;
  spinnerFrame: number;
}

export function ToolCallRow({ event, spinnerFrame }: Props) {
  const isRunning = event.status === "running";
  const isError = event.status === "error";
  const style = styleForTool(event.name);

  const icon = isRunning
    ? SPINNER[spinnerFrame % SPINNER.length]!
    : isError
      ? "✗"
      : "✓";
  const iconColor = isRunning ? theme.accent : isError ? theme.error : theme.success;

  const summary = toolSummary(event.name, event.input);
  const duration = fmtDuration(event.durationMs);
  const preview = !isRunning ? resultPreview(event.result) : null;

  return (
    <Box flexDirection="column">
      {/* Header row: status icon · tool glyph · label · summary · duration */}
      <Box paddingLeft={1}>
        <Text color={iconColor}>{icon} </Text>
        <Text color={style.color} bold>
          {style.icon} {style.label}
        </Text>
        {summary ? <Text color={theme.muted}>{`  ${summary}`}</Text> : null}
        {duration ? <Text color={theme.faint}>{`  ${duration}`}</Text> : null}
      </Box>

      {/* Result preview line under completed tools */}
      {preview ? (
        <Box paddingLeft={3}>
          <Text color={theme.faint}>{"└ "}</Text>
          <Text color={isError ? theme.error : theme.muted} dimColor>
            {preview.text}
            {preview.lines > 1 ? `  (+${preview.lines - 1} ${preview.lines - 1 === 1 ? "line" : "lines"})` : ""}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
