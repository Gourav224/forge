import { test, expect } from "bun:test";
import { render } from "ink-testing-library";
import React from "react";
import { Markdown } from "./markdown";
import { Banner } from "./Banner";
import { StatusBar } from "./StatusBar";
import { ToolCallRow } from "./ToolCall";

test("markdown renders headings, bold, code, lists", () => {
  const md = `## Title

Some **bold** and \`inline code\` and *italic*.

- first bullet
- second bullet

1. one
2. two

\`\`\`ts
const x = 1;
\`\`\`

> a quote
`;
  const { lastFrame } = render(<Markdown content={md} />);
  const out = lastFrame() || "";
  expect(out).toContain("Title");
  expect(out).toContain("bold");
  expect(out).toContain("inline code");
  expect(out).toContain("first bullet");
  expect(out).toContain("const x = 1;");
  expect(out).toContain("a quote");
});

test("banner renders wordmark + model + cwd", () => {
  const { lastFrame } = render(<Banner model="anthropic:claude-sonnet-4-6" cwd="/Users/x/proj" branch="main" />);
  const out = lastFrame() || "";
  expect(out).toContain("claude-sonnet-4-6");
  expect(out).toContain("main");
});

test("statusbar shows provider, tokens, working state", () => {
  const { lastFrame } = render(
    <StatusBar model="openai:gpt-4o" sessionId="abcdef123" isRunning usage={{ inputTokens: 1200, outputTokens: 800 }} cwd="/Users/x/proj" branch="main" />
  );
  const out = lastFrame() || "";
  expect(out).toContain("forge");
  expect(out).toContain("openai");
  expect(out).toContain("2.0k tok");
  expect(out).toContain("working");
});

test("tool row shows label, summary, result preview", () => {
  const { lastFrame } = render(
    <ToolCallRow event={{ id: "1", name: "bash_exec", input: { command: "ls -la" }, status: "done", result: "total 5\nfile.txt\nother.txt", durationMs: 120 }} spinnerFrame={0} />
  );
  const out = lastFrame() || "";
  expect(out).toContain("bash");
  expect(out).toContain("ls -la");
  expect(out).toContain("total 5");
  expect(out).toContain("120ms");
});
