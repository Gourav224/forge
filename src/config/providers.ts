// Catalog of supported providers — drives the interactive login flow,
// `forge provider list`, and validation of pasted keys.

export interface ProviderInfo {
  id: string;
  label: string;
  /** Environment variable that also supplies the key. */
  envVar: string;
  /** Expected key prefix (for a soft sanity check). Empty = no check. */
  keyPrefix: string;
  /** Where to get a key. */
  signupUrl: string;
  /** A sensible default model string for `forge -m`. */
  exampleModel: string;
  /** Local providers (Ollama) don't need a key. */
  needsKey: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    envVar: "ANTHROPIC_API_KEY",
    keyPrefix: "sk-ant-",
    signupUrl: "https://console.anthropic.com/settings/keys",
    exampleModel: "anthropic:claude-sonnet-4-6",
    needsKey: true,
  },
  {
    id: "openai",
    label: "OpenAI (GPT)",
    envVar: "OPENAI_API_KEY",
    keyPrefix: "sk-",
    signupUrl: "https://platform.openai.com/api-keys",
    exampleModel: "openai:gpt-4o",
    needsKey: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter (100+ models)",
    envVar: "OPENROUTER_API_KEY",
    keyPrefix: "sk-or-",
    signupUrl: "https://openrouter.ai/keys",
    exampleModel: "openrouter:anthropic/claude-3.5-sonnet",
    needsKey: true,
  },
  {
    id: "ollama",
    label: "Ollama (local, no key)",
    envVar: "",
    keyPrefix: "",
    signupUrl: "https://ollama.com/download",
    exampleModel: "ollama:llama3.1",
    needsKey: false,
  },
];

export function getProviderInfo(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Soft validation: returns a warning string if the key looks wrong, else null. */
export function validateKey(providerId: string, key: string): string | null {
  const info = getProviderInfo(providerId);
  if (!info) return `Unknown provider "${providerId}".`;
  if (!info.needsKey) return null;
  if (!key || key.trim().length < 8) return "Key looks too short.";
  if (info.keyPrefix && !key.startsWith(info.keyPrefix)) {
    return `Expected key to start with "${info.keyPrefix}" — double-check you pasted the right one.`;
  }
  return null;
}

/** Mask a key for display: sk-ant-…last4. */
export function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
