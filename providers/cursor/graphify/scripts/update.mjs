import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const skillDir = join(homedir(), '.cursor', 'skills', 'graphify');
const skillFile = join(skillDir, 'SKILL.md');

console.log(`=== Graphify Cursor update ${new Date().toISOString().replace('T', ' ').slice(0, 19)} ===\n`);

if (!existsSync(skillFile)) {
  console.log(`[NOT FOUND] ${skillFile}`);
  console.log("Run 'just graphify-install' first.");
  process.exit(1);
}

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

const tmpDir = mkdtempSync(join(tmpdir(), 'graphify-cursor-'));
try {
  console.log('[RUN] graphify cursor install');
  execSync('graphify cursor install', { cwd: tmpDir, stdio: 'inherit' });
} finally {
  rmSync(tmpDir, { recursive: true });
}

// Re-run install to refresh skill file
const content = `---
name: graphify
description: "Use for any question about a codebase, its architecture, file relationships, or project content. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools."
---

# /graphify

Turn any folder of files into a navigable knowledge graph.

## Usage

\`\`\`
/graphify                         # full pipeline on current directory
/graphify <path>                  # specific path
/graphify <path> --mode deep      # richer INFERRED edges
/graphify <path> --update         # incremental re-extract only changed files
/graphify add <url>               # fetch paper, video, or article
\`\`\`

## Query tools

- \`graphify query "<question>"\` — scoped subgraph for any codebase/architecture question
- \`graphify path "<A>" "<B>"\` — shortest dependency path between two symbols
- \`graphify explain "<concept>"\` — plain-language explanation of a node and its neighbors

## Output

\`\`\`
graphify-out/
├── graph.html        interactive graph — open in browser
├── GRAPH_REPORT.md   god nodes, unexpected links, suggested questions
├── graph.json        persistent graph — queryable across sessions
└── cache/            SHA256 cache — reruns only process changed files
\`\`\`

## Rules

- For codebase questions, first run \`graphify query "<question>"\` when \`graphify-out/graph.json\` exists
- Use \`graphify path "<A>" "<B>"\` for relationships and \`graphify explain "<concept>"\` for focused concepts
- If \`graphify-out/wiki/index.md\` exists, use it for broad navigation instead of raw file browsing
- Read \`graphify-out/GRAPH_REPORT.md\` only for broad architecture review when query/path/explain do not surface enough context
- After modifying code, run \`graphify update .\` to keep the graph current (AST-only, no API cost)
`;

mkdirSync(skillDir, { recursive: true });
writeFileSync(skillFile, content);
console.log(`[WRITE] ${skillFile}`);

console.log('\nDone. Graphify skill updated for Cursor.');
