---
name: testing
description: Testing with bun test — unit tests, mocking, and coverage
triggers:
  - test
  - tests
  - spec
  - bun test
  - unit test
  - mock
  - spy
  - coverage
  - assertion
  - expect
  - describe
---
# Testing Skill

## Basic Test Structure
```ts
// src/utils/math.test.ts
import { test, expect, describe, beforeEach } from "bun:test";

describe("add", () => {
  test("adds two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });

  test("handles negatives", () => {
    expect(add(-1, 1)).toBe(0);
  });
});
```

## File Convention
Place test files alongside source: `src/foo.ts` → `src/foo.test.ts`.
Run all tests: `bun test`
Run specific file: `bun test src/foo.test.ts`
Watch mode: `bun test --watch`

## Common Matchers
```ts
expect(x).toBe(y)              // strict equality (===)
expect(x).toEqual(y)           // deep equality
expect(x).toBeTruthy()
expect(x).toBeNull()
expect(x).toBeUndefined()
expect(x).toContain("substr")  // string or array
expect(x).toHaveLength(3)
expect(fn).toThrow("message")
expect(fn).toThrowError(ErrorClass)
```

## Async Tests
```ts
test("fetches data", async () => {
  const data = await fetchUser("123");
  expect(data.id).toBe("123");
});
```

## Setup and Teardown
```ts
import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

beforeAll(() => { /* runs once before all tests */ });
afterAll(() => { /* cleanup after all tests */ });
beforeEach(() => { /* runs before each test */ });
```

## Mocking with `mock()`
```ts
import { mock, spyOn } from "bun:test";

// Replace a function entirely
const mockFetch = mock(() => Promise.resolve({ ok: true, json: () => ({}) }));
global.fetch = mockFetch as any;

// Spy on a method (keeps original, tracks calls)
const spy = spyOn(console, "log");
spy.mockImplementation(() => {}); // silence it
expect(spy).toHaveBeenCalledTimes(1);
spy.mockRestore();
```

## When NOT to Mock
Prefer real implementations over mocks. Mocks that don't match prod behavior cause false confidence.
- ✅ Mock: network requests, external APIs, time (`Date.now`)
- ❌ Don't mock: your own pure functions, file system (use temp dirs instead), SQLite (use in-memory DB)

## In-Memory SQLite for DB Tests
```ts
import { Database } from "bun:sqlite";

function createTestDb() {
  const db = new Database(":memory:");
  db.run("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)");
  return db;
}
```

## Coverage
```bash
bun test --coverage          # shows line coverage in terminal
bun test --coverage-reporter=lcov  # generates lcov.info
```

## Snapshot Testing
```ts
test("renders correctly", () => {
  expect(renderToString(<MyComponent />)).toMatchSnapshot();
});
```
Run with `bun test --update-snapshots` to update stored snapshots.
