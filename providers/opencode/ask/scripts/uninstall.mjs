import { rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const agentDst = join(homedir(), '.config', 'opencode', 'agents', 'ask.md');

console.log(`=== Ask agent uninstall ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

if (!existsSync(agentDst)) {
  console.log(`[NOT FOUND] ${agentDst}`);
  process.exit(1);
}

rmSync(agentDst);
console.log(`[RM] ${agentDst}`);

console.log('\nDone.');
