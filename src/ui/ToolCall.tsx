import React from "react";
import { Box, Text } from "ink";
import type { ToolEvent } from "./types";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function toolSummary(name: string, input: Record<string, unknown> = {}): string {
  const s = (k: string) => String(input[k] || "").slice(0, 50);
  switch (name) {
    case "bash_exec":    return s("command");
    case "read_file":    return s("path");
    case "write_file":   return s("path");
    case "edit_file":    return s("path");
    case "patch_file":   return s("path");
    case "list_dir":     return s("path") || ".";
    case "search_text":  return `${s("pattern")}  ${s("path")}`.trim();
    case "http_fetch":   return s("url").replace(/^https?:\/\//, "");
    case "skill":        return s("name") || "list";
    default:             return "";
  }
}

interface Props {
  event: ToolEvent;
  spinnerFrame: number;
}

export function ToolCallRow({ event, spinnerFrame }: Props) {
  const isRunning = event.status === "running";
  const isError   = event.status === "error";

  const icon  = isRunning ? SPINNER[spinnerFrame % SPINNER.length]!
              : isError   ? "✗"
              : "✓";
  const iconColor = isRunning ? "yellow" : isError ? "red" : "green";

  const summary = toolSummary(event.name, event.input);
  const duration = event.durationMs != null ? `${event.durationMs}ms` : "";

  return (
    <Box paddingLeft={2} gap={1}>
      <Text color={iconColor}>{icon}</Text>
      <Text color="cyan" dimColor>{event.name}</Text>
      {summary ? <Text color="gray" dimColor>{summary}</Text> : null}
      {duration ? <Text color="gray" dimColor>{duration}</Text> : null}
    </Box>
  );
}
