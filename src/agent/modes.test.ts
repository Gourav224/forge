import { test, expect } from "bun:test";
import { toolsForMode, isRiskyTool, needsApproval, modePrompt, isMode } from "./modes";

const TOOLS = [
  { name: "read_file" }, { name: "list_dir" }, { name: "search_text" },
  { name: "bash_exec" }, { name: "write_file" }, { name: "edit_file" }, { name: "skill" },
];

test("plan mode strips risky tools", () => {
  const names = toolsForMode("plan", TOOLS).map((t) => t.name);
  expect(names).toContain("read_file");
  expect(names).toContain("skill");
  expect(names).not.toContain("bash_exec");
  expect(names).not.toContain("write_file");
});

test("build/auto modes keep all tools", () => {
  expect(toolsForMode("build", TOOLS).length).toBe(TOOLS.length);
  expect(toolsForMode("auto", TOOLS).length).toBe(TOOLS.length);
});

test("isRiskyTool classifies correctly", () => {
  expect(isRiskyTool("bash_exec")).toBe(true);
  expect(isRiskyTool("write_file")).toBe(true);
  expect(isRiskyTool("read_file")).toBe(false);
  expect(isRiskyTool("skill")).toBe(false);
  expect(isRiskyTool("some_mcp_tool")).toBe(true); // unknown = risky
});

test("needsApproval depends on mode", () => {
  expect(needsApproval("build", "bash_exec")).toBe(true);
  expect(needsApproval("build", "read_file")).toBe(false);
  expect(needsApproval("auto", "bash_exec")).toBe(false);
  expect(needsApproval("plan", "bash_exec")).toBe(false); // not offered at all
});

test("modePrompt returns mode-specific text", () => {
  expect(modePrompt("plan")).toContain("PLAN MODE");
  expect(modePrompt("build")).toContain("BUILD MODE");
  expect(modePrompt("auto")).toContain("AUTO MODE");
});

test("isMode type guard", () => {
  expect(isMode("plan")).toBe(true);
  expect(isMode("build")).toBe(true);
  expect(isMode("nope")).toBe(false);
});
