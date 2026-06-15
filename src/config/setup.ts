import { setApiKey } from "../db/index";

export function saveApiKey(provider: string, key: string): void {
  setApiKey(provider, key);
  console.log(`\n✅ ${provider} API key saved!\n`);
  const examples: Record<string, string> = {
    anthropic: "  forge -m anthropic:claude-3-5-sonnet-20241022 'your task'",
    openai:    "  forge -m openai:gpt-4o 'your task'",
    openrouter:"  forge -m openrouter:anthropic/claude-3-5-sonnet 'your task'",
  };
  if (examples[provider]) console.log(`Try:\n${examples[provider]}\n`);
}
