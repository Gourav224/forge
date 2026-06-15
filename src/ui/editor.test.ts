import { test, expect } from "bun:test";
import {
  insert, deleteBack, deleteForward, moveLeft, moveRight,
  moveLineStart, moveLineEnd, moveUp, moveDown, killToLineEnd,
  isMultiline, cursorRowCol, setValue, emptyEditor,
} from "./editor";

test("insert at cursor mid-string", () => {
  const s = { value: "helo", cursor: 3 };
  const r = insert(s, "l");
  expect(r.value).toBe("hello");
  expect(r.cursor).toBe(4);
});

test("insert multi-char paste with newlines", () => {
  const r = insert(emptyEditor, "line1\nline2");
  expect(r.value).toBe("line1\nline2");
  expect(r.cursor).toBe(11);
  expect(isMultiline(r)).toBe(true);
});

test("deleteBack removes char before cursor", () => {
  const s = { value: "hello", cursor: 5 };
  expect(deleteBack(s)).toEqual({ value: "hell", cursor: 4 });
});

test("deleteBack at start is a no-op", () => {
  const s = { value: "hello", cursor: 0 };
  expect(deleteBack(s)).toEqual(s);
});

test("deleteForward removes char at cursor", () => {
  const s = { value: "hello", cursor: 0 };
  expect(deleteForward(s)).toEqual({ value: "ello", cursor: 0 });
});

test("moveLeft/right clamp at boundaries", () => {
  expect(moveLeft({ value: "ab", cursor: 0 }).cursor).toBe(0);
  expect(moveRight({ value: "ab", cursor: 2 }).cursor).toBe(2);
  expect(moveRight({ value: "ab", cursor: 0 }).cursor).toBe(1);
});

test("line start/end within a multiline value", () => {
  const s = { value: "foo\nbarbaz", cursor: 7 }; // inside "barbaz"
  expect(moveLineStart(s).cursor).toBe(4);
  expect(moveLineEnd(s).cursor).toBe(10);
});

test("moveUp keeps column", () => {
  const s = { value: "hello\nworld", cursor: 9 }; // 'r' on line 2 (col 3)
  const up = moveUp(s);
  expect(cursorRowCol(up)).toEqual({ row: 0, col: 3 });
});

test("moveDown keeps column, clamps to shorter line", () => {
  const s = { value: "hello\nhi", cursor: 4 }; // col 4 on line 1
  const down = moveDown(s);
  // line 2 "hi" has length 2 → clamp to end
  expect(down.cursor).toBe(8);
  expect(cursorRowCol(down)).toEqual({ row: 1, col: 2 });
});

test("killToLineEnd removes to end of current line only", () => {
  const s = { value: "foo\nbar", cursor: 1 };
  expect(killToLineEnd(s)).toEqual({ value: "f\nbar", cursor: 1 });
});

test("cursorRowCol on first line", () => {
  expect(cursorRowCol({ value: "abc", cursor: 2 })).toEqual({ row: 0, col: 2 });
});

test("setValue places cursor at end", () => {
  expect(setValue("hello")).toEqual({ value: "hello", cursor: 5 });
});
