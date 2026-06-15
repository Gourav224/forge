import { test, expect } from "bun:test";
import { estimateTokens, shouldCompact } from "./compaction";
import type { LoopMessage } from "./loop";

test("estimateTokens approximates by characters", () => {
  const msgs: LoopMessage[] = [{ role: "user", content: "a".repeat(400) }];
  expect(estimateTokens(msgs)).toBe(100); // 400 chars / 4
});

test("estimateTokens handles tool-use content blocks", () => {
  const msgs: LoopMessage[] = [
    { role: "assistant", content: [{ type: "tool_use", id: "1", name: "bash_exec", input: {}, text: "ok" }] as any },
  ];
  expect(estimateTokens(msgs)).toBeGreaterThan(0);
});

test("shouldCompact is false for short conversations", () => {
  const msgs: LoopMessage[] = [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ];
  expect(shouldCompact(msgs, "openai:gpt-4")).toBe(false);
});

test("shouldCompact triggers past the window threshold", () => {
  // gpt-4 window = 8192; 75% = 6144 tokens ≈ 24576 chars
  const big = "x".repeat(30_000);
  const msgs: LoopMessage[] = Array.from({ length: 10 }, (_, i) =>
    i === 0 ? { role: "user", content: big } : { role: "user", content: "short" }
  );
  expect(shouldCompact(msgs, "openai:gpt-4")).toBe(true);
});
