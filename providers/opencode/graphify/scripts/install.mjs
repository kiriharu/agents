import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

console.log(`=== Graphify install ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

function ensureGraphify() {
  try {
    execSync('graphify --version', { stdio: 'pipe' });
    return;
  } catch {
    // not found
  }

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

const tmpDir = mkdtempSync(join(tmpdir(), 'graphify-opencode-'));
try {
  console.log('[RUN] graphify install --platform opencode');
  execSync('graphify install --platform opencode', { cwd: tmpDir, stdio: 'inherit' });
} finally {
  rmSync(tmpDir, { recursive: true });
}

console.log('\nDone. Graphify skill installed for OpenCode.');
