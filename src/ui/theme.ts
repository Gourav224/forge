// Forge color palette — ember/forge-fire accent on a cool slate base.
// Hex colors are downsampled automatically by Ink/chalk on non-truecolor terminals.

export const theme = {
  // Brand
  accent: "#ff8c42",      // ember orange — primary brand
  accentDim: "#b96528",   // darker ember
  ember: "#ffb347",       // bright spark

  // Roles
  user: "#7aa2f7",        // cool blue
  assistant: "#ff8c42",   // ember (matches brand)

  // Semantic
  success: "#9ece6a",     // green
  error: "#f7768e",       // red
  warning: "#e0af68",     // amber
  info: "#7dcfff",        // cyan
  tool: "#7dcfff",        // cyan for tool names

  // Text
  text: "#c0caf5",        // primary text
  muted: "#6b7394",       // dim/secondary
  faint: "#454c6e",       // very dim (borders, separators)

  // Code
  code: "#bb9af7",        // purple for inline code
  codeBg: "#1f2335",
} as const;

// Per-tool accent colors + glyphs for the tool-call rows.
export const toolStyles: Record<string, { color: string; icon: string; label: string }> = {
  bash_exec:   { color: "#e0af68", icon: "$", label: "bash" },
  read_file:   { color: "#7dcfff", icon: "▸", label: "read" },
  write_file:  { color: "#9ece6a", icon: "✎", label: "write" },
  edit_file:   { color: "#9ece6a", icon: "✎", label: "edit" },
  patch_file:  { color: "#9ece6a", icon: "±", label: "patch" },
  list_dir:    { color: "#7aa2f7", icon: "▤", label: "ls" },
  search_text: { color: "#bb9af7", icon: "⌕", label: "grep" },
  http_fetch:  { color: "#7dcfff", icon: "↯", label: "fetch" },
  skill:       { color: "#ff8c42", icon: "✦", label: "skill" },
  task:        { color: "#bb9af7", icon: "⊕", label: "subagent" },
};

export function styleForTool(name: string): { color: string; icon: string; label: string } {
  return toolStyles[name] ?? { color: theme.tool, icon: "•", label: name };
}
