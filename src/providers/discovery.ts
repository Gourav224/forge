/**
 * Dynamic model discovery from each provider's API
 * Inspired by pi.dev's approach - fetch real available models
 */

export interface AvailableModel {
  id: string;
  provider: string;
  name: string;
  description?: string;
  available: boolean;
  requiresAuth: boolean;
}

// ============================================================================
// ANTHROPIC MODELS - Fetch from Anthropic's API docs
// ============================================================================

export async function discoverAnthropicModels(apiKey?: string): Promise<AvailableModel[]> {
  // Anthropic models - these are well-known and documented
  const models = [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Latest, fastest, most capable" },
    { id: "claude-3-opus-20250219", name: "Claude 3 Opus", description: "Most powerful" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "Fastest, cheapest" },
  ];

  return models.map((m) => ({
    id: m.id,
    provider: "anthropic",
    name: `${m.name} (${m.id})`,
    description: m.description,
    available: !!apiKey,
    requiresAuth: true,
  }));
}

// ============================================================================
// OPENAI MODELS - Fetch from /models endpoint
// ============================================================================

export async function discoverOpenAIModels(apiKey?: string): Promise<AvailableModel[]> {
  if (!apiKey) {
    return [
      {
        id: "gpt-4o",
        provider: "openai",
        name: "GPT-4o",
        description: "Most capable",
        available: false,
        requiresAuth: true,
      },
      {
        id: "gpt-4-turbo",
        provider: "openai",
        name: "GPT-4 Turbo",
        description: "Powerful, faster",
        available: false,
        requiresAuth: true,
      },
    ];
  }

  try {
    // Fetch actual available models from OpenAI API
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      // Fall back to known models if API fails
      return [
        {
          id: "gpt-4o",
          provider: "openai",
          name: "GPT-4o",
          description: "Most capable",
          available: true,
          requiresAuth: true,
        },
        {
          id: "gpt-4-turbo",
          provider: "openai",
          name: "GPT-4 Turbo",
          description: "Powerful, faster",
          available: true,
          requiresAuth: true,
        },
      ];
    }

    const data = (await response.json()) as { data: Array<{ id: string; type?: string }> };
    const gptModels = data.data
      .filter((m) => m.id.includes("gpt") && !m.id.includes("embedding"))
      .map((m) => ({
        id: m.id,
        provider: "openai",
        name: m.id,
        available: true,
        requiresAuth: true,
      }));

    return gptModels.length > 0
      ? gptModels
      : [
          {
            id: "gpt-4o",
            provider: "openai",
            name: "GPT-4o",
            available: true,
            requiresAuth: true,
          },
        ];
  } catch {
    // Network error or API unavailable
    return [
      {
        id: "gpt-4o",
        provider: "openai",
        name: "GPT-4o",
        available: false,
        requiresAuth: true,
      },
    ];
  }
}

// ============================================================================
// OLLAMA MODELS - Fetch from local Ollama instance
// ============================================================================

export async function discoverOllamaModels(baseUrl: string = "http://localhost:11434"): Promise<AvailableModel[]> {
  try {
    // Check if Ollama is running
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (!response.ok) {
      return [
        {
          id: "mistral",
          provider: "ollama",
          name: "Mistral",
          description: "Fast, capable open model",
          available: false,
          requiresAuth: false,
        },
      ];
    }

    const data = (await response.json()) as { models?: Array<{ name: string; size?: number }> };
    const models = data.models || [];

    if (models.length === 0) {
      return [
        {
          id: "mistral",
          provider: "ollama",
          name: "Mistral (not installed)",
          description: "Run: ollama pull mistral",
          available: false,
          requiresAuth: false,
        },
      ];
    }

    return models.map((m) => ({
      id: m.name,
      provider: "ollama",
      name: m.name,
      description: m.size ? `${(m.size / 1024 / 1024 / 1024).toFixed(1)}GB` : undefined,
      available: true,
      requiresAuth: false,
    }));
  } catch {
    // Ollama not running
    return [
      {
        id: "mistral",
        provider: "ollama",
        name: "Mistral",
        description: "Not running - ollama serve",
        available: false,
        requiresAuth: false,
      },
    ];
  }
}

// ============================================================================
// OPENROUTER MODELS - Via OpenAI-compatible API
// ============================================================================

export async function discoverOpenRouterModels(apiKey?: string): Promise<AvailableModel[]> {
  if (!apiKey) {
    return [
      {
        id: "anthropic/claude-3.5-sonnet",
        provider: "openrouter",
        name: "Claude 3.5 Sonnet (via OpenRouter)",
        available: false,
        requiresAuth: true,
      },
    ];
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return [
        {
          id: "anthropic/claude-3.5-sonnet",
          provider: "openrouter",
          name: "Claude 3.5 Sonnet (via OpenRouter)",
          available: true,
          requiresAuth: true,
        },
      ];
    }

    const data = (await response.json()) as { data?: Array<{ id: string }> };
    const models = data.data || [];

    return models.slice(0, 10).map((m) => ({
      id: m.id,
      provider: "openrouter",
      name: m.id,
      available: true,
      requiresAuth: true,
    }));
  } catch {
    return [
      {
        id: "anthropic/claude-3.5-sonnet",
        provider: "openrouter",
        name: "Claude 3.5 Sonnet (via OpenRouter)",
        available: false,
        requiresAuth: true,
      },
    ];
  }
}

// ============================================================================
// DISCOVERY AGGREGATOR - Get all models dynamically
// ============================================================================

export async function discoverAllModels(apiKeys: Record<string, string | undefined> = {}): Promise<
  Record<
    string,
    AvailableModel[]
  >
> {
  const results = await Promise.all([
    discoverAnthropicModels(apiKeys.anthropic),
    discoverOpenAIModels(apiKeys.openai),
    discoverOllamaModels(),
    discoverOpenRouterModels(apiKeys.openrouter),
  ]);

  return {
    anthropic: results[0],
    openai: results[1],
    ollama: results[2],
    openrouter: results[3],
  };
}

// ============================================================================
// FORMAT FOR DISPLAY
// ============================================================================

export function formatModelListForDisplay(
  models: Record<string, AvailableModel[]>
): string {
  const lines: string[] = [
    "\n📦 Available Models\n",
    "Press Ctrl+C to cancel. Set API keys with: forge --set-key <provider> <key>\n",
  ];

  for (const [provider, providerModels] of Object.entries(models)) {
    if (providerModels.length === 0) continue;

    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    lines.push(`\n${providerName}:`);

    for (const model of providerModels) {
      const status = model.available ? "✅" : "⚠️ ";
      const auth = model.requiresAuth ? " (requires API key)" : "";
      const desc = model.description ? ` — ${model.description}` : "";
      lines.push(`  ${status} ${model.provider}:${model.id}${auth}${desc}`);
    }
  }

  lines.push(
    "\nUsage: forge -m provider:model 'your task'\n" +
      "Example: forge -m anthropic:claude-3-5-sonnet-20241022 'read README.md'\n"
  );

  return lines.join("\n");
}
