import { test, expect } from "bun:test";
import { getProviderInfo, validateKey, maskKey, PROVIDERS } from "./providers";

test("catalog includes the core providers", () => {
  const ids = PROVIDERS.map((p) => p.id);
  expect(ids).toEqual(expect.arrayContaining(["anthropic", "openai", "openrouter", "ollama"]));
});

test("getProviderInfo returns metadata", () => {
  const a = getProviderInfo("anthropic");
  expect(a?.keyPrefix).toBe("sk-ant-");
  expect(a?.needsKey).toBe(true);
  expect(getProviderInfo("nope")).toBeUndefined();
});

test("validateKey checks prefix and length", () => {
  expect(validateKey("anthropic", "sk-ant-abc123def456")).toBeNull();
  expect(validateKey("anthropic", "wrong-key-here")).toContain("sk-ant-");
  expect(validateKey("anthropic", "x")).toContain("short");
});

test("validateKey skips local providers", () => {
  expect(validateKey("ollama", "")).toBeNull();
});

test("maskKey hides the middle", () => {
  expect(maskKey("sk-ant-1234567890")).toBe("sk-ant…7890");
  expect(maskKey("short")).toBe("•••••");
});
