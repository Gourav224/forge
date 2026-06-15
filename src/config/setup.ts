import { setApiKey, getConfiguredProviders } from "../db/index";

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

export function showConfigStatus(): void {
  const configured = getConfiguredProviders();
  const envProviders = ["anthropic", "openai", "openrouter"].filter(
    (p) => process.env[`${p.toUpperCase()}_API_KEY`]
  );
  const all = [...new Set([...configured, ...envProviders])];

  if (all.length === 0) {
    console.log("\n⚙️  No providers configured.\n");
    console.log("  forge --set-key anthropic <key>");
    console.log("  forge --set-key openai <key>");
    console.log("  forge --set-key openrouter <key>\n");
    return;
  }

  console.log("\n✅ Configured providers:\n");
  for (const p of all) {
    const fromEnv = !!process.env[`${p.toUpperCase()}_API_KEY`];
    const src = fromEnv ? " (env var)" : " (saved key)";
    console.log(`  • ${p}${src}`);
  }
  console.log();
}
