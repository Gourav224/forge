import {
  setApiKey, deleteApiKey, getAllApiKeys, getConfiguredProviders,
  getAllSettings, setSetting, getSetting, deleteSetting,
  getDbPath, getDbStats, listMcpServers,
} from "../db/index";
import { PROVIDERS, getProviderInfo, validateKey, maskKey } from "./providers";
import { ask, askSecret, confirm } from "./prompt";

const c = {
  accent: (s: string) => `\x1b[38;5;208m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

/** Interactive `forge provider login`. Optionally pre-pick a provider. */
export async function interactiveLogin(providerArg?: string): Promise<void> {
  console.log(`\n${c.accent("◈")} ${c.bold("Forge — provider login")}\n`);

  let provider = providerArg;
  if (!provider) {
    console.log("  Choose a provider:\n");
    PROVIDERS.forEach((p, i) => {
      console.log(`    ${c.accent(String(i + 1))}. ${p.label}`);
    });
    console.log();
    const choice = await ask("  Enter number (or provider name): ");
    const byNum = PROVIDERS[Number(choice) - 1];
    provider = byNum ? byNum.id : choice.toLowerCase();
  }

  const info = getProviderInfo(provider);
  if (!info) {
    console.log(c.red(`\n  Unknown provider "${provider}". Options: ${PROVIDERS.map((p) => p.id).join(", ")}\n`));
    process.exit(1);
  }

  if (!info.needsKey) {
    console.log(`\n  ${c.green("✓")} ${info.label} runs locally and needs no API key.`);
    console.log(`  Make sure Ollama is running, then: ${c.cyan(`forge -m ${info.exampleModel} "hi"`)}\n`);
    return;
  }

  console.log(`\n  Get a key from: ${c.cyan(info.signupUrl)}`);
  if (process.env[info.envVar]) {
    console.log(c.dim(`  Note: ${info.envVar} is already set in your environment and takes priority.`));
  }
  console.log();

  const key = await askSecret(`  Paste your ${info.label} key: `);
  if (!key) {
    console.log(c.red("\n  No key entered. Aborted.\n"));
    process.exit(1);
  }

  const warning = validateKey(info.id, key);
  if (warning) {
    console.log(c.dim(`\n  ⚠ ${warning}`));
    const proceed = await confirm("  Save anyway?", false);
    if (!proceed) {
      console.log("\n  Aborted.\n");
      process.exit(0);
    }
  }

  setApiKey(info.id, key);
  console.log(`\n  ${c.green("✓")} Saved ${info.label} key (${c.dim(maskKey(key))}).`);
  console.log(`  Try it: ${c.cyan(`forge -m ${info.exampleModel} "explain this repo"`)}\n`);
}

/** `forge provider list` — show each provider's status. */
export function listProviderStatus(): void {
  const saved = getAllApiKeys();
  console.log(`\n${c.bold("Providers")}\n`);
  for (const p of PROVIDERS) {
    const envSet = p.envVar && process.env[p.envVar];
    const savedKey = saved[p.id];
    let status: string;
    if (envSet) status = c.green("● env var");
    else if (savedKey) status = `${c.green("● saved")} ${c.dim(maskKey(savedKey))}`;
    else if (!p.needsKey) status = c.cyan("● local");
    else status = c.dim("○ not set");
    console.log(`  ${p.label.padEnd(28)} ${status}`);
  }
  console.log(`\n  Add one: ${c.cyan("forge provider login")}\n`);
}

/** `forge provider logout <id>` — remove a saved key. */
export function logoutProvider(providerId: string): void {
  const info = getProviderInfo(providerId);
  if (!info) {
    console.log(c.red(`\n  Unknown provider "${providerId}".\n`));
    process.exit(1);
  }
  deleteApiKey(providerId);
  console.log(`\n  ${c.green("✓")} Removed saved key for ${info.label}.`);
  if (info.envVar && process.env[info.envVar]) {
    console.log(c.dim(`  Note: ${info.envVar} is still set in your environment.`));
  }
  console.log();
}

/** `forge config` — show full configuration. */
export function showConfig(): void {
  const stats = getDbStats();
  const settings = getAllSettings();
  const configured = getConfiguredProviders();
  const mcp = listMcpServers();
  const envProviders = PROVIDERS.filter((p) => p.envVar && process.env[p.envVar]).map((p) => p.id);

  console.log(`\n${c.accent("◈")} ${c.bold("Forge configuration")}\n`);
  console.log(`  ${c.dim("database")}   ${getDbPath()}`);
  console.log(`  ${c.dim("sessions")}   ${stats.sessions}  ${c.dim(`(${stats.messages} messages)`)}`);
  console.log(`  ${c.dim("mcp")}        ${mcp.length} server${mcp.length === 1 ? "" : "s"}`);

  console.log(`\n  ${c.bold("Providers")}`);
  const all = [...new Set([...configured, ...envProviders])];
  if (all.length === 0) {
    console.log(c.dim("    none — run `forge provider login`"));
  } else {
    for (const id of all) {
      const src = envProviders.includes(id) ? "env var" : "saved key";
      console.log(`    ${c.green("●")} ${id} ${c.dim(`(${src})`)}`);
    }
  }

  console.log(`\n  ${c.bold("Settings")}`);
  const keys = Object.keys(settings);
  if (keys.length === 0) {
    console.log(c.dim("    (defaults)"));
  } else {
    for (const k of keys) console.log(`    ${k} ${c.dim("=")} ${settings[k]}`);
  }
  console.log(`\n  Change one: ${c.cyan("forge config set <key> <value>")}\n`);
}

export function getConfigValue(key: string): void {
  const val = getSetting(key);
  console.log(val === null ? `\n  ${c.dim(`${key} is not set`)}\n` : `\n  ${key} = ${val}\n`);
}

export function setConfigValue(key: string, value: string): void {
  setSetting(key, value);
  console.log(`\n  ${c.green("✓")} ${key} = ${value}\n`);
}

export function unsetConfigValue(key: string): void {
  deleteSetting(key);
  console.log(`\n  ${c.green("✓")} unset ${key}\n`);
}
