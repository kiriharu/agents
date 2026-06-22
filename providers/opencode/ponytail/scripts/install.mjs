import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginDir = join(homedir(), '.config', 'opencode', 'openplugins', 'ponytail');
const pluginEntry = join(pluginDir, '.opencode', 'plugins', 'ponytail.mjs');
const opencodeConfig = join(homedir(), '.config', 'opencode', 'opencode.json');
const commandSrc = join(pluginDir, '.opencode', 'command', 'ponytail.md');
const commandDst = join(homedir(), '.config', 'opencode', 'command', 'ponytail.md');

console.log(`=== Ponytail install ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

// 1. Clone repo
if (existsSync(pluginDir)) {
  console.log(`[EXISTS] ${pluginDir}`);
  console.log("Run 'just update' instead.");
  process.exit(0);
}

console.log('[CLONE] https://github.com/DietrichGebert/ponytail');
execSync(`git clone https://github.com/DietrichGebert/ponytail.git "${pluginDir}"`, { stdio: 'inherit' });

// 2. Backup opencode.json
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
if (existsSync(opencodeConfig)) {
  const backup = `${opencodeConfig}.bak.${ts}`;
  copyFileSync(opencodeConfig, backup);
  console.log(`[BACKUP] opencode.json → opencode.json.bak.${ts}`);
}

// 3. Merge plugin path
let config = {};
if (existsSync(opencodeConfig)) {
  config = JSON.parse(readFileSync(opencodeConfig, 'utf8'));
}
config['$schema'] = config['$schema'] || 'https://opencode.ai/config.json';
config.plugin = config.plugin || [];
if (!config.plugin.includes(pluginEntry)) {
  config.plugin.push(pluginEntry);
}
writeFileSync(opencodeConfig, JSON.stringify(config, null, 2) + '\n');
console.log('[SYNC] Added plugin → opencode.json');

// 4. Copy command
mkdirSync(dirname(commandDst), { recursive: true });
if (existsSync(commandSrc)) {
  copyFileSync(commandSrc, commandDst);
  console.log(`[SYNC] Command → ${commandDst}`);
} else {
  console.log('[WARN] Command file not found');
}

console.log('\nDone. Ponytail active on next session.');
