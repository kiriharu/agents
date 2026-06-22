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

console.log(`=== Ponytail update ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

if (!existsSync(pluginDir)) {
  console.log(`[NOT FOUND] ${pluginDir}`);
  console.log("Run 'just install' first.");
  process.exit(1);
}

// 1. Git pull
const before = execSync('git -C "${pluginDir}" rev-parse HEAD', { encoding: 'utf8', shell: true }).trim();
console.log(`[PULL] ${pluginDir}`);
execSync('git pull', { cwd: pluginDir, stdio: 'inherit' });
const after = execSync('git rev-parse HEAD', { cwd: pluginDir, encoding: 'utf8' }).trim();

if (before === after) {
  console.log('[OK] Already up to date.');
  process.exit(0);
}
console.log(`[UPDATED] ${before} → ${after}`);

// 2. Backup and sync opencode.json
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
if (existsSync(opencodeConfig)) {
  const backup = `${opencodeConfig}.bak.${ts}`;
  copyFileSync(opencodeConfig, backup);
  console.log(`[BACKUP] opencode.json → opencode.json.bak.${ts}`);
}

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
console.log('[SYNC] Plugin path → opencode.json');

// 3. Copy command
mkdirSync(dirname(commandDst), { recursive: true });
if (existsSync(commandSrc)) {
  copyFileSync(commandSrc, commandDst);
  console.log(`[SYNC] Command → ${commandDst}`);
}

console.log('\nDone.');
