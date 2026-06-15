import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme";

// A small, dependency-free Markdown renderer for terminal output.
// Supports: headings, bullet/numbered lists, blockquotes, fenced code blocks,
// horizontal rules, and inline **bold**, *italic*, `code`, and ~~strike~~.

type Block =
  | { type: "code"; lang: string; lines: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "bullet"; text: string; indent: number }
  | { type: "numbered"; marker: string; text: string }
  | { type: "quote"; text: string }
  | { type: "divider" }
  | { type: "para"; text: string }
  | { type: "blank" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i]!)) {
        body.push(lines[i]!);
        i++;
      }
      i++; // consume closing fence (or EOF)
      blocks.push({ type: "code", lang, lines: body });
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ type: "heading", level: h[1]!.length, text: h[2]!.trim() });
      i++;
      continue;
    }

    // Blockquote
    const q = line.match(/^\s*>\s?(.*)$/);
    if (q) {
      blocks.push({ type: "quote", text: q[1]! });
      i++;
      continue;
    }

    // Bullet list
    const b = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (b) {
      blocks.push({ type: "bullet", indent: Math.floor(b[1]!.length / 2), text: b[2]! });
      i++;
      continue;
    }

    // Numbered list
    const n = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (n) {
      blocks.push({ type: "numbered", marker: n[1]!, text: n[2]! });
      i++;
      continue;
    }

    // Blank
    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: "para", text: line });
    i++;
  }

  return blocks;
}

// --- Inline span parsing: **bold**, *italic*, `code`, ~~strike~~ ---

interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
}

function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      spans.push({ text: buf });
      buf = "";
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // Inline code (highest precedence)
    const code = rest.match(/^`([^`]+)`/);
    if (code) {
      flush();
      spans.push({ text: code[1]!, code: true });
      i += code[0].length;
      continue;
    }

    // Bold
    const bold = rest.match(/^\*\*([^*]+)\*\*/) || rest.match(/^__([^_]+)__/);
    if (bold) {
      flush();
      spans.push({ text: bold[1]!, bold: true });
      i += bold[0].length;
      continue;
    }

    // Strikethrough
    const strike = rest.match(/^~~([^~]+)~~/);
    if (strike) {
      flush();
      spans.push({ text: strike[1]!, strike: true });
      i += strike[0].length;
      continue;
    }

    // Italic (single * or _) — avoid matching list bullets handled at block level
    const italic = rest.match(/^\*([^*\n]+)\*/) || rest.match(/^_([^_\n]+)_/);
    if (italic) {
      flush();
      spans.push({ text: italic[1]!, italic: true });
      i += italic[0].length;
      continue;
    }

    buf += text[i];
    i++;
  }
  flush();
  return spans;
}

function InlineText({ text, color }: { text: string; color?: string }) {
  const spans = parseInline(text);
  return (
    <Text color={color ?? theme.text}>
      {spans.map((s, idx) => (
        <Text
          key={idx}
          bold={s.bold}
          italic={s.italic}
          strikethrough={s.strike}
          color={s.code ? theme.code : undefined}
        >
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

const HEADING_COLORS = [theme.accent, theme.ember, theme.info, theme.user, theme.muted, theme.muted];

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content.trimEnd());

  return (
    <Box flexDirection="column">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "blank":
            // Collapse: only render a gap if surrounded by content
            return <Box key={idx} height={0} />;

          case "divider":
            return (
              <Text key={idx} color={theme.faint}>
                {"─".repeat(Math.min((process.stdout.columns || 80) - 4, 60))}
              </Text>
            );

          case "heading": {
            const color = HEADING_COLORS[block.level - 1] ?? theme.muted;
            return (
              <Box key={idx} marginTop={idx === 0 ? 0 : 1}>
                <Text bold color={color}>
                  {block.level <= 2 ? block.text : `${"#".repeat(block.level)} ${block.text}`}
                </Text>
              </Box>
            );
          }

          case "code":
            return (
              <Box
                key={idx}
                flexDirection="column"
                borderStyle="round"
                borderColor={theme.faint}
                paddingX={1}
                marginY={0}
              >
                {block.lang ? (
                  <Text color={theme.muted} dimColor>
                    {block.lang}
                  </Text>
                ) : null}
                {block.lines.length === 0 ? (
                  <Text color={theme.code}> </Text>
                ) : (
                  block.lines.map((l, li) => (
                    <Text key={li} color={theme.code}>
                      {l || " "}
                    </Text>
                  ))
                )}
              </Box>
            );

          case "quote":
            return (
              <Box key={idx}>
                <Text color={theme.faint}>{"▏ "}</Text>
                <InlineText text={block.text} color={theme.muted} />
              </Box>
            );

          case "bullet":
            return (
              <Box key={idx} paddingLeft={block.indent * 2}>
                <Text color={theme.accent}>{"• "}</Text>
                <InlineText text={block.text} />
              </Box>
            );

          case "numbered":
            return (
              <Box key={idx}>
                <Text color={theme.accent}>{block.marker}. </Text>
                <InlineText text={block.text} />
              </Box>
            );

          case "para":
          default:
            return (
              <Box key={idx}>
                <InlineText text={(block as { text: string }).text} />
              </Box>
            );
        }
      })}
    </Box>
  );
}
