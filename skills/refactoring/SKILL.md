---
name: refactoring
description: Safe refactoring patterns — extract, rename, simplify, remove duplication
triggers:
  - refactor
  - refactoring
  - cleanup
  - extract
  - rename
  - dead code
  - simplify
  - duplication
  - dry
  - decompose
  - restructure
---
# Refactoring Skill

## Read Before You Refactor
Always read the full function/file before changing it. Understand WHY it is the way it is — there may be a reason (bug workaround, edge case, API constraint).

## Small Steps — One Change Per Commit
```
1. Rename: rename function X to Y → commit
2. Extract: pull out helper → commit
3. Simplify: remove duplication → commit
```
Never rename AND change logic in the same commit. Makes reviewing and reverting easier.

## Rename
Use "find in files" to catch all usages. Rename across:
- Function name
- Parameter names if they document the contract
- Test names and describe blocks
- Comments that reference the old name (or delete stale comments)

## Extract Function
When a block of code has a clear purpose that can be named:
```ts
// Before: inline, hard to test
function processOrder(order: Order) {
  const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = total * 0.1;
  // ... 20 more lines
}

// After: extracted, testable
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
```

Extract only when:
- The extracted block has a single clear purpose
- You can give it a better name than "helper" or "util"
- The caller becomes easier to read

## Inline Function
When the function name doesn't add clarity and the body is one line:
```ts
// Not worth extracting:
function isEven(n: number) { return n % 2 === 0; }
// Just write: n % 2 === 0
```

## Rule of Three for Abstraction
Don't extract until you have 3+ copies. Two copies might just be coincidence. Three is a pattern worth naming.

## Dead Code Removal
- Safely delete: commented-out code, unused exports, unreachable branches
- Check with TypeScript: unused imports → type error with `noUnusedLocals`
- Search for callers before deleting a function: `grep -r "functionName" src/`
- Check git history with `git log -S "functionName"` to understand why it existed

## Type-Safe Refactoring Steps
When changing a function signature:
1. Add the new parameter as optional first: `foo(x: string, y?: number)`
2. Update all callers to pass the new argument
3. Make the parameter required: `foo(x: string, y: number)`
4. TypeScript will catch any missed callers

## Simplify Conditionals
```ts
// Before: nested ifs
if (user) {
  if (user.active) {
    if (user.role === "admin") { ... }
  }
}

// After: early returns
if (!user) return;
if (!user.active) return;
if (user.role !== "admin") return;
// happy path here
```

## Replace Magic Numbers with Constants
```ts
// Before
if (response.status === 429) retry();

// After
const HTTP_TOO_MANY_REQUESTS = 429;
if (response.status === HTTP_TOO_MANY_REQUESTS) retry();
```

## Run Tests After Every Step
If you don't have tests: write them for the code you're about to change first. A refactored function with no tests may be silently broken.

## What NOT to Refactor
- Code you don't understand yet
- Code without tests (write tests first)
- Code you're not actively working on (don't "fix while you're at it")
- Performance-critical paths without benchmarks before/after
