---
name: typescript
description: TypeScript type system and strict-mode best practices
triggers:
  - typescript
  - ts
  - types
  - interface
  - generic
  - type error
  - tsconfig
  - union
  - intersection
  - infer
  - utility type
---
# TypeScript Skill

## Strict Mode Defaults
Enable `strict: true` in tsconfig. Never disable it for individual files.
Prefer `unknown` over `any` — `unknown` forces you to narrow before using.
Use `// @ts-expect-error` (not `@ts-ignore`) when suppressing: it fails if the error disappears.

## Type Assertions — Use Sparingly
```ts
// Bad: silent runtime risk
const x = value as SomeType;

// Better: narrow with a guard
function isFoo(v: unknown): v is Foo { return typeof v === "object" && v !== null && "foo" in v; }
```

## Discriminated Unions
```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
// TypeScript narrows perfectly on result.ok
```

## Utility Types
- `Partial<T>` — all fields optional
- `Required<T>` — all fields required
- `Pick<T, K>` — keep only keys K
- `Omit<T, K>` — drop keys K
- `Record<K, V>` — dictionary
- `Readonly<T>` — freeze shape
- `ReturnType<typeof fn>` — infer return type
- `Parameters<typeof fn>` — infer param tuple

## `as const` for Literal Types
```ts
const DIRECTION = ["north", "south", "east", "west"] as const;
type Direction = (typeof DIRECTION)[number]; // "north" | "south" | "east" | "west"
```

## verbatimModuleSyntax (if enabled in tsconfig)
Type-only imports must use `import type`:
```ts
import type { Foo } from "./foo"; // OK
import { Foo } from "./foo";       // Error if Foo is only a type
```

## Avoid Overusing Generics
Only add a generic if the caller benefits from inference or reuse. If a function always takes `string`, don't make it `<T extends string>`.

## Prefer `interface` for Object Shapes, `type` for Unions/Tuples
```ts
interface User { id: string; name: string }       // extendable, mergeable
type Result = { ok: true } | { ok: false; err: string } // union — use type
```

## Template Literal Types (TypeScript 4.1+)
```ts
type EventName = `on${Capitalize<string>}`; // "onClick", "onChange", ...
```

## Null Handling
Enable `strictNullChecks`. Use optional chaining `?.` and nullish coalescing `??` over `||` (to avoid falsiness bugs with 0 or "").
