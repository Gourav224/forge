import { getApiKey } from "../db/index";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import { CustomProvider } from "./custom";
import type { ProviderClient } from "./types";

export type { ProviderClient, ContentBlock, StreamingResponse, ToolCall } from "./types";
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";
export { OllamaProvider } from "./ollama";
export { CustomProvider } from "./custom";

export interface ResolvedProvider {
  provider: ProviderClient;
  displayName: string;
}

export function resolveProvider(modelString: string): ResolvedProvider {
  // Format: provider:model  or  provider:model@endpoint
  const colonIdx = modelString.indexOf(":");
  if (colonIdx === -1) throw new Error(`Invalid model string: "${modelString}". Use provider:model`);

  const providerName = modelString.slice(0, colonIdx);
  const modelPart = modelString.slice(colonIdx + 1);

  // Key resolution: env var → SQLite DB
  const anthropicKey = process.env.ANTHROPIC_API_KEY || getApiKey("anthropic") || "";
  const openaiKey = process.env.OPENAI_API_KEY || getApiKey("openai") || "";
  const openrouterKey = process.env.OPENROUTER_API_KEY || getApiKey("openrouter") || openaiKey;

  switch (providerName) {
    case "anthropic": {
      if (!anthropicKey) throw new Error("Anthropic API key not set.\n  Run: forge --set-key anthropic sk-ant-...\n  Or:  export ANTHROPIC_API_KEY=sk-ant-...");
      const model = modelPart || "claude-3-5-sonnet-20241022";
      return { provider: new AnthropicProvider(anthropicKey, model), displayName: `Anthropic / ${model}` };
    }
    case "openai": {
      if (!openaiKey) throw new Error("OpenAI API key not set.\n  Run: forge --set-key openai sk-...\n  Or:  export OPENAI_API_KEY=sk-...");
      const model = modelPart || "gpt-4o";
      return { provider: new OpenAIProvider(openaiKey, model), displayName: `OpenAI / ${model}` };
    }
    case "openrouter": {
      if (!openrouterKey) throw new Error("OpenRouter API key not set.\n  Run: forge --set-key openrouter <key>\n  Or:  export OPENROUTER_API_KEY=<key>");
      const model = modelPart || "anthropic/claude-3-5-sonnet";
      return {
        provider: new OpenAIProvider(openrouterKey, model, "https://openrouter.ai/api/v1"),
        displayName: `OpenRouter / ${model}`,
      };
    }
    case "ollama": {
      const [model, endpoint] = modelPart.includes("@")
        ? [modelPart.split("@")[0], modelPart.split("@")[1]]
        : [modelPart || "mistral", "http://localhost:11434"];
      return { provider: new OllamaProvider(model, endpoint), displayName: `Ollama / ${model}` };
    }
    case "custom": {
      if (!modelPart.includes("@")) {
        throw new Error("Custom format: custom:model-name@https://your-api.com");
      }
      const atIdx = modelPart.indexOf("@");
      const model = modelPart.slice(0, atIdx);
      const endpoint = modelPart.slice(atIdx + 1);
      const key = process.env.CUSTOM_API_KEY;
      const format = (process.env.CUSTOM_API_FORMAT || "openai") as "openai" | "ollama";
      return { provider: new CustomProvider(endpoint, model, key, format), displayName: `Custom / ${model}` };
    }
    default:
      throw new Error(`Unknown provider: "${providerName}". Options: anthropic, openai, openrouter, ollama, custom`);
  }
}
