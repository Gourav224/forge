---
name: react
description: React functional components, hooks, and Ink TUI patterns
triggers:
  - react
  - component
  - jsx
  - tsx
  - hooks
  - usestate
  - useeffect
  - usecallback
  - usememo
  - useref
  - props
  - render
  - ink
---
# React Skill

## Functional Components Only
No class components. Use `function` keyword (not arrow functions) for top-level components — easier to read in stack traces.

## Props Interface at the Top
```tsx
interface Props {
  label: string;
  onClick: () => void;
  children?: React.ReactNode;
}

export function Button({ label, onClick, children }: Props) { ... }
```

## Hooks Rules
- Call hooks at the top level — never inside conditions or loops
- Don't call hooks from regular functions (only from React functions or custom hooks)
- Custom hook names must start with `use`

## When to Use `useMemo` / `useCallback`
Only when: (1) the value is expensive to compute, or (2) it's a dependency of another hook that runs frequently. Don't add them speculatively — they add complexity and rarely help.

## `useRef` for Values That Don't Need Re-render
```ts
const countRef = useRef(0); // mutate with countRef.current — no re-render
```
Also use for DOM element refs and storing mutable values across renders (timers, interval IDs).

## State Updates Are Batched
In React 18+, multiple `setState` calls in the same event handler are batched. Use the functional form when new state depends on old:
```ts
setCount(prev => prev + 1); // safe
setCount(count + 1);        // stale closure risk
```

## Avoid Prop Drilling
If a value is needed 3+ levels deep, use `useContext`. Create a typed context:
```ts
const ThemeContext = React.createContext<Theme | null>(null);
export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
```

## `useEffect` Cleanup
Always return a cleanup function when setting up subscriptions, timers, or event listeners:
```ts
useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 100);
  return () => clearInterval(id); // required
}, []);
```

## Ink-Specific Patterns (Terminal TUI)
```tsx
import { Box, Text, useInput, useApp } from "ink";

// Layout: Box = flexbox container, Text = leaf node
<Box flexDirection="column" gap={1}>
  <Text bold color="cyan">Title</Text>
  <Text wrap="wrap">{content}</Text>
</Box>

// Keyboard input
useInput((input, key) => {
  if (key.return) handleSubmit();
  if (key.escape) handleCancel();
  if (key.ctrl && input === "c") process.exit(0);
});

// Exit the app
const { exit } = useApp();
```

Key Ink rules:
- `Box` is the only layout primitive (no divs)
- `Text` must be a leaf — never nest `Box` inside `Text`
- Use `flexGrow={1}` on the content area to fill available space
- `overflow="hidden"` on the chat pane prevents scroll blowout
