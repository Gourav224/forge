import { test, expect } from "bun:test";
import { contextWindowFor, usedPct } from "./context";

test("context windows match by substring", () => {
  expect(contextWindowFor("anthropic:claude-3-5-sonnet-20241022")).toBe(200_000);
  expect(contextWindowFor("anthropic:claude-sonnet-4-6")).toBe(200_000);
  expect(contextWindowFor("openai:gpt-4o")).toBe(128_000);
  expect(contextWindowFor("openai:gpt-4")).toBe(8_192);
});

test("unknown model falls back to default", () => {
  expect(contextWindowFor("custom:whatever")).toBe(128_000);
  expect(contextWindowFor(undefined)).toBe(128_000);
});

test("usedPct computes a clamped percentage", () => {
  expect(usedPct(100_000, "anthropic:claude-3-5-sonnet")).toBe(50);
  expect(usedPct(0, "anthropic:claude")).toBe(0);
  expect(usedPct(999_999_999, "openai:gpt-4")).toBe(100);
});
