import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentSrc = join(__dirname, '..', 'ask.md');
const agentDst = join(homedir(), '.config', 'opencode', 'agents', 'ask.md');

console.log(`=== Ask agent update ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

mkdirSync(dirname(agentDst), { recursive: true });
copyFileSync(agentSrc, agentDst);
console.log(`[COPY] ${agentSrc} → ${agentDst}`);

console.log('\nDone.');
