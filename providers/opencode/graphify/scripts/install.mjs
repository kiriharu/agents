import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const homeConfig = join(homedir(), '.config', 'opencode');
const pluginDir = join(homeConfig, 'openplugins', 'graphify');
const pluginEntry = join(pluginDir, '.opencode', 'plugins', 'graphify.mjs');
const opencodeConfig = join(homeConfig, 'opencode.json');

console.log(`=== Graphify install ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

function ensureGraphify() {
  try {
    execSync('graphify --version', { stdio: 'pipe' });
    return;
  } catch {}

  const installers = [
    { cmd: 'uv tool install graphifyy', label: 'uv' },
    { cmd: 'pipx install graphifyy', label: 'pipx' },
    { cmd: 'pip install graphifyy', label: 'pip' },
  ];

  for (const { cmd, label } of installers) {
    try {
      console.log(`[INSTALL] graphifyy via ${label}...`);
      execSync(cmd, { stdio: 'inherit' });
      execSync('graphify --version', { stdio: 'pipe' });
      return;
    } catch {
      console.log(`[SKIP] ${label} not available`);
    }
  }

  console.error('[ERROR] Could not install graphifyy. Install manually: pip install graphifyy');
  process.exit(1);
}

ensureGraphify();

const tmpDir = mkdtempSync(join(homedir(), '.config', 'opencode', 'graphify-tmp-'));
try {
  console.log('[RUN] graphify install --platform opencode');
  execSync('graphify install --platform opencode', { cwd: tmpDir, stdio: 'inherit' });

  const generatedPluginFile = join(tmpDir, '.opencode', 'plugins', 'graphify.js');
  if (!existsSync(generatedPluginFile)) {
    console.error('[ERROR] graphify did not generate plugin file');
    process.exit(1);
  }

  mkdirSync(join(pluginEntry, '..'), { recursive: true });
  copyFileSync(generatedPluginFile, pluginEntry);
  console.log(`[SYNC] Plugin → ${pluginEntry}`);

} finally {
  rmSync(tmpDir, { recursive: true });
}

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
if (existsSync(opencodeConfig)) {
  copyFileSync(opencodeConfig, `${opencodeConfig}.bak.${ts}`);
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
console.log('[REGISTER] Plugin registered in opencode.json');

console.log('\nDone. Graphify plugin installed for OpenCode.');
