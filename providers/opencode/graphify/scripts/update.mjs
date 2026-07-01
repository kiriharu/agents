import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

console.log(`=== Graphify update ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

function upgradeGraphify() {
  const upgraders = [
    { cmd: 'uv tool upgrade graphifyy', label: 'uv' },
    { cmd: 'pipx upgrade graphifyy', label: 'pipx' },
    { cmd: 'pip install --upgrade graphifyy', label: 'pip' },
  ];

  for (const { cmd, label } of upgraders) {
    try {
      console.log(`[UPGRADE] graphifyy via ${label}...`);
      execSync(cmd, { stdio: 'inherit' });
      return;
    } catch {
      console.log(`[SKIP] ${label} not available`);
    }
  }

  console.log('[WARN] Could not upgrade graphifyy. Continuing with current version.');
}

upgradeGraphify();

const tmpDir = mkdtempSync(join(tmpdir(), 'graphify-opencode-'));
try {
  console.log('[RUN] graphify install --platform opencode');
  execSync('graphify install --platform opencode', { cwd: tmpDir, stdio: 'inherit' });
} finally {
  rmSync(tmpDir, { recursive: true });
}

console.log('\nDone. Graphify skill updated for OpenCode.');
