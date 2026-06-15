# Provider Configuration

Forge supports multiple LLM providers. Each is selected via a model string in the format `provider:model`.

## Setting API Keys

The easiest way is the interactive wizard — pick a provider, paste a key (masked), and it's validated and saved:

```bash
forge login                 # or /login inside the TUI
forge provider list         # see what's configured
forge provider logout openai
```

You can also set keys directly or via the environment:

```bash
# Store in Forge's SQLite config (persists across reboots)
forge --set-key anthropic sk-ant-...

# Or use environment variables (checked first, take priority)
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export OPENROUTER_API_KEY=<key>
```

Check what's configured:
```bash
forge config                # full configuration
forge provider list         # provider status only
```

## Anthropic

Models: `claude-sonnet-4-6`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`, and others.

```bash
forge --model anthropic:claude-sonnet-4-6
```

Default model (when no model is specified): `claude-3-5-sonnet-20241022`

Streaming is real-time via `client.messages.stream()`. Token usage is captured from `finalMessage()`.

## OpenAI

Models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o1-mini`, etc.

```bash
forge --model openai:gpt-4o
forge --model openai:gpt-4o-mini
```

Default model: `gpt-4o`

## OpenRouter

Route to hundreds of models through a single API key. Uses OpenAI-compatible format.

```bash
forge --model openrouter:anthropic/claude-3-5-sonnet
forge --model openrouter:meta-llama/llama-3.1-70b-instruct
forge --model openrouter:google/gemini-pro
```

Default model: `anthropic/claude-3-5-sonnet`

If `OPENROUTER_API_KEY` is not set, Forge falls back to `OPENAI_API_KEY`.

## Ollama (Local)

Run models locally. Ollama must be running at `http://localhost:11434`.

```bash
# Default endpoint
forge --model ollama:mistral
forge --model ollama:codellama

# Custom endpoint
forge --model ollama:mistral@http://192.168.1.100:11434
```

Default model: `mistral`

Ollama doesn't support native tool calling for most models — Forge injects tool schemas as JSON in the system prompt and parses them from the response. This works reliably for most coding tasks.

Start Ollama: `ollama serve` (or it auto-starts on macOS).

Pull a model: `ollama pull mistral`

## Custom (OpenAI-Compatible)

Any API that speaks OpenAI's format. Format: `custom:model-name@https://your-endpoint.com`

```bash
forge --model custom:llama3@http://localhost:8080
forge --model custom:my-model@https://api.mycompany.com/v1
```

Environment variables for custom:
```bash
export CUSTOM_API_KEY=my-secret-key
export CUSTOM_API_FORMAT=openai  # or: ollama
```

`CUSTOM_API_FORMAT=ollama` uses Ollama-style JSON injection for tool calling (useful for models that don't support OpenAI function calling natively).

## Switching Models in TUI

Use the `/model` command while inside a session:

```
/model                          # show current model
/model anthropic:claude-opus-4  # switch to Opus
/model ollama:mistral            # switch to local Ollama
```

The new model is used for all subsequent messages in the session.

## List Available Models

```
/models         # in TUI
forge --models  # CLI
```

This queries each configured provider for its model list. Ollama lists locally-pulled models. OpenRouter lists its full catalog.

## Model String Reference

| Format | Example |
|--------|---------|
| `provider:model` | `anthropic:claude-sonnet-4-6` |
| `provider:model@endpoint` | `ollama:mistral@http://localhost:11434` |

Providers: `anthropic`, `openai`, `openrouter`, `ollama`, `custom`
