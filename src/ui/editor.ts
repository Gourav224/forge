// Pure text-editor model for the TUI input. No React — just transforms on
// { value, cursor }. Keeps Input.tsx thin and makes editing logic testable.

export interface EditorState {
  value: string;
  cursor: number; // index into value, 0..value.length
}

export const emptyEditor: EditorState = { value: "", cursor: 0 };

function clampCursor(value: string, cursor: number): number {
  return Math.max(0, Math.min(value.length, cursor));
}

/** Start/end indices of the line containing `cursor`. */
function lineBounds(value: string, cursor: number): { start: number; end: number } {
  const start = value.lastIndexOf("\n", cursor - 1) + 1;
  let end = value.indexOf("\n", cursor);
  if (end === -1) end = value.length;
  return { start, end };
}

export function insert(s: EditorState, text: string): EditorState {
  if (!text) return s;
  const value = s.value.slice(0, s.cursor) + text + s.value.slice(s.cursor);
  return { value, cursor: s.cursor + text.length };
}

export function deleteBack(s: EditorState): EditorState {
  if (s.cursor === 0) return s;
  const value = s.value.slice(0, s.cursor - 1) + s.value.slice(s.cursor);
  return { value, cursor: s.cursor - 1 };
}

export function deleteForward(s: EditorState): EditorState {
  if (s.cursor >= s.value.length) return s;
  const value = s.value.slice(0, s.cursor) + s.value.slice(s.cursor + 1);
  return { value, cursor: s.cursor };
}

export function moveLeft(s: EditorState): EditorState {
  return { ...s, cursor: clampCursor(s.value, s.cursor - 1) };
}

export function moveRight(s: EditorState): EditorState {
  return { ...s, cursor: clampCursor(s.value, s.cursor + 1) };
}

export function moveLineStart(s: EditorState): EditorState {
  return { ...s, cursor: lineBounds(s.value, s.cursor).start };
}

export function moveLineEnd(s: EditorState): EditorState {
  return { ...s, cursor: lineBounds(s.value, s.cursor).end };
}

export function moveUp(s: EditorState): EditorState {
  const { start } = lineBounds(s.value, s.cursor);
  if (start === 0) return { ...s, cursor: 0 };
  const col = s.cursor - start;
  const prevEnd = start - 1; // the '\n' ending the previous line
  const prevStart = s.value.lastIndexOf("\n", prevEnd - 1) + 1;
  return { ...s, cursor: Math.min(prevStart + col, prevEnd) };
}

export function moveDown(s: EditorState): EditorState {
  const { start, end } = lineBounds(s.value, s.cursor);
  if (end === s.value.length) return { ...s, cursor: s.value.length };
  const col = s.cursor - start;
  const nextStart = end + 1;
  let nextEnd = s.value.indexOf("\n", nextStart);
  if (nextEnd === -1) nextEnd = s.value.length;
  return { ...s, cursor: Math.min(nextStart + col, nextEnd) };
}

export function killToLineEnd(s: EditorState): EditorState {
  const { end } = lineBounds(s.value, s.cursor);
  if (end === s.cursor) return s;
  return { value: s.value.slice(0, s.cursor) + s.value.slice(end), cursor: s.cursor };
}

export function clear(): EditorState {
  return { value: "", cursor: 0 };
}

export function setValue(value: string): EditorState {
  return { value, cursor: value.length };
}

export function isMultiline(s: EditorState): boolean {
  return s.value.includes("\n");
}

/** Row/column of the cursor (for rendering the caret). */
export function cursorRowCol(s: EditorState): { row: number; col: number } {
  const before = s.value.slice(0, s.cursor);
  const row = (before.match(/\n/g) || []).length;
  const col = s.cursor - (before.lastIndexOf("\n") + 1);
  return { row, col };
}
