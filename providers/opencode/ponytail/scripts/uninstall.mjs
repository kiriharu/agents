import { rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const pluginDir = join(homedir(), '.config', 'opencode', 'openplugins', 'ponytail');
const pluginEntry = join(pluginDir, '.opencode', 'plugins', 'ponytail.mjs');
const opencodeConfig = join(homedir(), '.config', 'opencode', 'opencode.json');
const commandDst = join(homedir(), '.config', 'opencode', 'command', 'ponytail.md');
const statePath = join(homedir(), '.config', 'opencode', '.ponytail-active');

console.log(`=== Ponytail uninstall ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

// 1. Remove from opencode.json
if (existsSync(opencodeConfig)) {
  const config = JSON.parse(readFileSync(opencodeConfig, 'utf8'));
  if (config.plugin) {
    config.plugin = config.plugin.filter(p => p !== pluginEntry);
    if (config.plugin.length === 0) delete config.plugin;
  }
  writeFileSync(opencodeConfig, JSON.stringify(config, null, 2) + '\n');
  console.log('[SYNC] Removed plugin from opencode.json');
}

// 2. Delete cloned repo
if (existsSync(pluginDir)) {
  rmSync(pluginDir, { recursive: true });
  console.log(`[RM] ${pluginDir}`);
}

// 3. Remove command
if (existsSync(commandDst)) {
  rmSync(commandDst);
  console.log(`[RM] ${commandDst}`);
}

// 4. Clear state
if (existsSync(statePath)) {
  rmSync(statePath);
  console.log(`[RM] ${statePath}`);
}

console.log('\nDone.');
