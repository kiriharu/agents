import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const agents = {
  opencode: {
    steps: [
      ['Skills',          'skills',                'sync'],
      ['MCP servers',     'mcp',                   'sync'],
      ['Ponytail plugin', 'providers/opencode',    'ponytail-update'],
      ['Ask agent',       'providers/opencode',    'ask-update'],
    ],
  },
  cursor: {
    steps: [
      ['Skills',      'skills', 'sync-cursor'],
      ['MCP servers', 'mcp',    'sync'],
    ],
  },
};

const agent = process.argv[2];

if (!agent || !agents[agent]) {
  console.error(`Usage: just update <agent>`);
  console.error(`Available agents: ${Object.keys(agents).join(', ')}`);
  process.exit(1);
}

const plan = agents[agent];

console.log(`\n=== Update for: ${agent} ===\n`);
console.log('What will be updated:\n');
for (const [label] of plan.steps) {
  console.log(`  - ${label}`);
}
console.log();

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('Proceed? [Y/n]: ', (answer) => {
  rl.close();

  if (answer.trim().toLowerCase() !== '' && answer.trim().toLowerCase() !== 'y') {
    console.log('Cancelled.');
    process.exit(0);
  }

  console.log();

  for (const [label, cwd, recipe] of plan.steps) {
    console.log(`→ ${label}...`);
    try {
      execSync(`just ${recipe}`, { cwd, stdio: 'inherit' });
    } catch {
      console.error(`  ✗ Failed: ${label}`);
      process.exit(1);
    }
  }

  console.log(`\nDone. ${agent} update complete.\n`);
});
