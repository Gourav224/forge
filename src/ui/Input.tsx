import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme";
import {
  type EditorState, emptyEditor,
  insert, deleteBack, deleteForward, moveLeft, moveRight,
  moveLineStart, moveLineEnd, moveUp, moveDown, killToLineEnd,
  clear, setValue, isMultiline, cursorRowCol,
} from "./editor";

const COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: "/help", desc: "show all commands" },
  { cmd: "/clear", desc: "clear the screen" },
  { cmd: "/new", desc: "start a fresh session" },
  { cmd: "/sessions", desc: "list & load past sessions" },
  { cmd: "/model", desc: "show or switch the model" },
  { cmd: "/models", desc: "discover available models" },
  { cmd: "/mode", desc: "plan · build · auto" },
  { cmd: "/compact", desc: "summarize the conversation" },
  { cmd: "/branch", desc: "fork the current session" },
  { cmd: "/rewind", desc: "rewind to message n" },
  { cmd: "/login", desc: "add a provider API key" },
  { cmd: "/config", desc: "show configuration" },
  { cmd: "/clean", desc: "delete session history" },
  { cmd: "/reset", desc: "wipe everything" },
  { cmd: "/exit", desc: "quit forge" },
];

const PLACEHOLDER = "Ask Forge to build, fix, or explain…  (/ for commands)";
const MAX_VISIBLE_LINES = 12;

interface Props {
  onSubmit: (text: string) => void;
  onCommand: (cmd: string) => void;
  onAbort: () => void;
  disabled?: boolean;
}

// Render the editor's lines with an inverse caret at the cursor position.
function EditorView({ state, focused, ghost }: { state: EditorState; focused: boolean; ghost?: string }) {
  const lines = state.value.split("\n");
  const { row, col } = cursorRowCol(state);

  // Window large inputs so the box never explodes.
  let winStart = 0;
  let winEnd = lines.length;
  if (lines.length > MAX_VISIBLE_LINES) {
    winStart = Math.max(0, Math.min(row - 6, lines.length - MAX_VISIBLE_LINES));
    winEnd = winStart + MAX_VISIBLE_LINES;
  }

  // Empty input: prompt + caret + placeholder.
  if (state.value === "") {
    return (
      <Box>
        <Text color={focused ? theme.accent : theme.faint} bold>{"❯ "}</Text>
        {focused ? <Text inverse> </Text> : null}
        {!focused ? null : <Text color={theme.faint}>{PLACEHOLDER}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {winStart > 0 ? <Text color={theme.faint}>{`  ⋯ ${winStart} more`}</Text> : null}
      {lines.slice(winStart, winEnd).map((line, idx) => {
        const i = winStart + idx;
        const prefix = i === 0 ? "❯ " : "  ";
        const isCaretRow = focused && i === row;
        if (!isCaretRow) {
          return (
            <Box key={i}>
              <Text color={i === 0 ? theme.accent : theme.faint} bold={i === 0}>{prefix}</Text>
              <Text color={theme.text}>{line || " "}</Text>
            </Box>
          );
        }
        const left = line.slice(0, col);
        const caret = line[col] ?? " ";
        const right = line.slice(col + 1);
        const atEnd = col >= line.length;
        return (
          <Box key={i}>
            <Text color={i === 0 ? theme.accent : theme.faint} bold={i === 0}>{prefix}</Text>
            <Text color={theme.text}>{left}</Text>
            <Text inverse>{caret}</Text>
            <Text color={theme.text}>{right}</Text>
            {atEnd && ghost ? <Text color={theme.faint}>{ghost}</Text> : null}
          </Box>
        );
      })}
      {winEnd < lines.length ? <Text color={theme.faint}>{`  ⋯ ${lines.length - winEnd} more`}</Text> : null}
    </Box>
  );
}

export function Input({ onSubmit, onCommand, onAbort, disabled = false }: Props) {
  const [state, setState] = useState<EditorState>(emptyEditor);

  // History — refs so mutations never trigger a re-render.
  const historyRef = useRef<string[]>([]);
  const histCursorRef = useRef(-1);
  const draftRef = useRef("");

  const value = state.value;
  const singleLine = !isMultiline(state);
  const isSlash = singleLine && value.startsWith("/") && !value.includes(" ");
  const matches = isSlash ? COMMANDS.filter((c) => c.cmd.startsWith(value) && c.cmd !== value) : [];
  const ghost = matches[0] ? matches[0].cmd.slice(value.length) : undefined;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    historyRef.current.push(trimmed);
    histCursorRef.current = -1;
    draftRef.current = "";
    setState(clear());
    if (trimmed.startsWith("/")) onCommand(trimmed);
    else onSubmit(trimmed);
  };

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      if (disabled) onAbort();
      else process.exit(0);
      return;
    }
    if (key.escape) {
      if (disabled) onAbort();
      return;
    }

    // While the agent runs, ignore editing keys (Ctrl+C/Esc handled above).
    if (disabled) return;

    // Cursor movement
    if (key.leftArrow) { setState(moveLeft); return; }
    if (key.rightArrow) { setState(moveRight); return; }
    if (key.ctrl && input === "a") { setState(moveLineStart); return; }
    if (key.ctrl && input === "e") { setState(moveLineEnd); return; }
    if (key.ctrl && input === "k") { setState(killToLineEnd); return; }
    if (key.ctrl && input === "u") { setState(clear()); return; }

    // Up/Down: cursor in multiline, history in single-line
    if (key.upArrow) {
      if (!singleLine) { setState(moveUp); return; }
      if (histCursorRef.current === -1) draftRef.current = value;
      const next = histCursorRef.current + 1;
      if (next < historyRef.current.length) {
        histCursorRef.current = next;
        setState(setValue(historyRef.current[historyRef.current.length - 1 - next]!));
      }
      return;
    }
    if (key.downArrow) {
      if (!singleLine) { setState(moveDown); return; }
      const next = histCursorRef.current - 1;
      if (next < 0) {
        histCursorRef.current = -1;
        setState(setValue(draftRef.current));
      } else {
        histCursorRef.current = next;
        setState(setValue(historyRef.current[historyRef.current.length - 1 - next]!));
      }
      return;
    }

    if (key.tab && ghost) { setState((s) => insert(s, ghost)); return; }

    if (key.backspace || key.delete) { setState(deleteBack); return; }

    // Newline: Ctrl+J, or trailing backslash + Enter (reliable across terminals)
    if (key.ctrl && input === "j") { setState((s) => insert(s, "\n")); return; }

    if (key.return) {
      if (state.value[state.cursor - 1] === "\\") {
        setState((s) => insert(deleteBack(s), "\n"));
        return;
      }
      submit();
      return;
    }

    // Printable input and pastes (multi-char, may contain newlines)
    if (input && !key.ctrl && !key.meta) {
      setState((s) => insert(s, input));
    }
  });

  const borderColor = disabled ? theme.faint : theme.accentDim;

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={borderColor} paddingX={1}>
        <EditorView state={state} focused={!disabled} ghost={ghost} />
      </Box>

      {matches.length > 0 && !disabled ? (
        <Box flexDirection="column" paddingX={2}>
          {matches.slice(0, 5).map((m, i) => (
            <Box key={m.cmd}>
              <Text color={i === 0 ? theme.accent : theme.muted}>{m.cmd.padEnd(12)}</Text>
              <Text color={theme.faint}>{m.desc}</Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Box paddingX={2}>
          <Text color={theme.faint}>
            {disabled
              ? "esc or Ctrl+C to interrupt"
              : "↵ send   ⌃J / \\↵ newline   ←→ move   ⌃A/⌃E line   ↑↓ history"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
