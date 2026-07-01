import { rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const skillDir = join(homedir(), '.config', 'opencode', 'skills', 'graphify');

console.log(`=== Graphify uninstall ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

if (existsSync(skillDir)) {
  rmSync(skillDir, { recursive: true });
  console.log(`[RM] ${skillDir}`);
} else {
  console.log(`[NOT FOUND] ${skillDir}`);
}

console.log('\nDone.');
