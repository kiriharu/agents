import {
  readFileSync, writeFileSync, readdirSync, existsSync,
  copyFileSync, mkdirSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serversDir = join(__dirname, '..', 'servers');

// ─── helpers ───────────────────────────────────────────────────────
function ask(rl, query) {
  return new Promise(resolve => {
    rl.question(query, answer => resolve(answer.trim()));
  });
}

function loadServers() {
  const names = readdirSync(serversDir).filter(f => f.endsWith('.json'));
  const servers = [];
  const errors = [];
  for (const file of names) {
    try {
      const raw = readFileSync(join(serversDir, file), 'utf-8');
      servers.push(JSON.parse(raw));
    } catch (e) {
      errors.push(`${file}: ${e.message}`);
    }
  }
  return { servers, errors };
}

function envConvert(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    out[k] = v.replace(/\{env:(\w+)\}/g, '$${env:$1}');
  }
  return out;
}

function extractEnvVars(servers) {
  const vars = new Set();
  for (const s of servers) {
    for (const obj of [s.local?.env, s.remote?.headers]) {
      if (!obj) continue;
      for (const v of Object.values(obj)) {
        if (typeof v !== 'string') continue;
        for (const m of v.matchAll(/\{env:(\w+)\}/g)) vars.add(m[1]);
      }
    }
  }
  return [...vars].sort();
}

function checkEnvVars(servers) {
  const vars = extractEnvVars(servers);
  if (vars.length === 0) return true;
  let missing = 0;
  for (const v of vars) {
    if (process.env[v]) {
      console.log(`  ✓ ${v}`);
    } else {
      console.log(`  ✗ ${v} — not set`);
      missing++;
    }
  }
  return missing === 0;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── list ──────────────────────────────────────────────────────────
function listCmd() {
  const { servers, errors } = loadServers();

  if (servers.length === 0) {
    console.log('No MCP servers defined. Use `just add` to create one.');
  } else {
    const nameW = Math.max(8, ...servers.map(s => s.name.length));
    const transportW = 10;
    const descW = Math.max(11, ...servers.map(s => (s.description || '—').length));
    const agentsW = 20;

    console.log(`  ${'NAME'.padEnd(nameW)}  ${'TRANSPORT'.padEnd(transportW)}  ${'DESCRIPTION'.padEnd(descW)}  AGENTS`);
    console.log(`  ${'─'.repeat(nameW)}  ${'─'.repeat(transportW)}  ${'─'.repeat(descW)}  ${'─'.repeat(agentsW)}`);

    for (const s of servers) {
      const tag = s.enabled !== false ? '' : ' (off)';
      const name = s.name + tag;
      const transport = s.transport || '?';
      const desc = (s.description || '—').slice(0, descW);
      const agents = (s.agents || []).join(', ');
      console.log(`  ${name.padEnd(nameW)}  ${transport.padEnd(transportW)}  ${desc.padEnd(descW)}  ${agents}`);
    }
  }

  if (errors.length) console.log(`\n⚠ Parse errors:\n  ${errors.join('\n  ')}`);
}

// ─── show ──────────────────────────────────────────────────────────
function showCmd(name) {
  const file = join(serversDir, `${name}.json`);
  if (!existsSync(file)) {
    console.error(`Server "${name}" not found.`);
    process.exit(1);
  }
  console.log(readFileSync(file, 'utf-8'));
}

// ─── add ───────────────────────────────────────────────────────────
async function addCmd() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  Create new MCP server definition\n');

  const name = await ask(rl, '  Name (slug): ');
  if (!name || /\s/.test(name)) {
    console.error('Name must be a non-empty slug (no spaces).');
    rl.close();
    process.exit(1);
  }
  const filepath = join(serversDir, `${name}.json`);
  if (existsSync(filepath)) {
    const ow = await ask(rl, '  File exists. Overwrite? [y/N]: ');
    if (ow.toLowerCase() !== 'y') { console.log('Cancelled.'); rl.close(); return; }
  }

  const desc = await ask(rl, '  Description (optional): ');

  console.log('  Transport:');
  console.log('    [1] local  — process (npx, node, python, …)');
  console.log('    [2] remote — HTTP URL');
  const tChoice = await ask(rl, '  Choose [1/2]: ');
  const transport = tChoice === '2' ? 'remote' : 'local';

  const def = {
    name, transport,
    enabled: true,
    agents: ['opencode', 'cursor'],
    timeout: 30000,
  };
  if (desc) def.description = desc;

  if (transport === 'local') {
    const cmd = await ask(rl, '  Command (e.g. npx): ');
    const argsStr = await ask(rl, '  Args (space-separated, e.g. -y @scope/pkg): ');
    const envStr = await ask(rl, '  Env (KEY=value, space-separated, optional): ');

    def.local = { command: cmd };
    if (argsStr) def.local.args = argsStr.split(/\s+/).filter(Boolean);
    if (envStr) {
      def.local.env = {};
      for (const kv of envStr.split(/\s+/)) {
        const eq = kv.indexOf('=');
        if (eq > 0) def.local.env[kv.slice(0, eq)] = kv.slice(eq + 1);
      }
    }
  } else {
    const url = await ask(rl, '  URL: ');
    const headersStr = await ask(rl, '  Headers (KEY=value, space-separated, optional): ');

    def.remote = { url };
    if (headersStr) {
      def.remote.headers = {};
      for (const kv of headersStr.split(/\s+/)) {
        const eq = kv.indexOf('=');
        if (eq > 0) def.remote.headers[kv.slice(0, eq)] = kv.slice(eq + 1);
      }
    }
  }

  console.log('  Agents:');
  console.log('    [1] opencode');
  console.log('    [2] cursor');
  console.log('    [Enter] = both');
  const aChoice = await ask(rl, '  Choose [1/2/Enter]: ');
  if (aChoice === '1') def.agents = ['opencode'];
  else if (aChoice === '2') def.agents = ['cursor'];

  console.log(`\n  Preview:\n${JSON.stringify(def, null, 2)}\n`);
  const ok = await ask(rl, '  Write? [y/N]: ');
  if (ok.toLowerCase() !== 'y') { console.log('Cancelled.'); rl.close(); return; }

  writeFileSync(filepath, JSON.stringify(def, null, 2) + '\n');
  console.log(`✓ Created servers/${name}.json`);
  rl.close();
}

// ─── sync ──────────────────────────────────────────────────────────
function syncCmd() {
  const { servers, errors } = loadServers();

  if (errors.length) {
    console.error('⚠ Fix parse errors before syncing:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const enabled = servers.filter(s => s.enabled !== false);
  if (enabled.length === 0) {
    console.log('No enabled servers found.');
    return;
  }

  const ts = timestamp();

  // ── OpenCode ──────────────────────────────────────────────────
  const ocServers = enabled.filter(s => s.agents.includes('opencode'));
  if (ocServers.length > 0) {
    const ocDir = join(homedir(), '.config', 'opencode');
    ensureDir(ocDir);
    const target = join(ocDir, 'opencode.json');

    if (existsSync(target)) {
      copyFileSync(target, `${target}.bak.${ts}`);
      console.log(`✓ Backup: ${target} → ${target}.bak.${ts}`);
    }

    const existing = existsSync(target)
      ? JSON.parse(readFileSync(target, 'utf-8'))
      : { $schema: 'https://opencode.ai/config.json' };

    const mcpBlock = {};
    for (const s of ocServers) {
      if (s.transport === 'local') {
        mcpBlock[s.name] = {
          type: 'local',
          command: [s.local.command, ...(s.local.args || [])],
          ...(s.local.env ? { environment: s.local.env } : {}),
          timeout: s.timeout || 30000,
          enabled: true,
        };
      } else {
        mcpBlock[s.name] = {
          type: 'remote',
          url: s.remote.url,
          ...(s.remote.headers ? { headers: s.remote.headers } : {}),
          timeout: s.timeout || 30000,
          enabled: true,
        };
      }
    }

    existing.mcp = mcpBlock;
    writeFileSync(target, JSON.stringify(existing, null, 2) + '\n');
    console.log(`✓ Synced ${ocServers.length} server(s) → ${target}`);
  } else {
    console.log('○ OpenCode: no matching servers (skipped)');
  }

  // ── Cursor ────────────────────────────────────────────────────
  const cuServers = enabled.filter(s => s.agents.includes('cursor'));
  if (cuServers.length > 0) {
    const cursorDir = join(homedir(), '.cursor');
    ensureDir(cursorDir);
    const target = join(cursorDir, 'mcp.json');

    if (existsSync(target)) {
      copyFileSync(target, `${target}.bak.${ts}`);
      console.log(`✓ Backup: ${target} → ${target}.bak.${ts}`);
    }

    const cursorBlock = { mcpServers: {} };
    for (const s of cuServers) {
      if (s.transport === 'local') {
        cursorBlock.mcpServers[s.name] = {
          command: s.local.command,
          args: s.local.args || [],
          ...(s.local.env ? { env: envConvert(s.local.env) } : {}),
        };
      } else {
        cursorBlock.mcpServers[s.name] = {};
        if (s.remote.url) cursorBlock.mcpServers[s.name].url = s.remote.url;
      }
    }

    writeFileSync(target, JSON.stringify(cursorBlock, null, 2) + '\n');
    console.log(`✓ Synced ${cuServers.length} server(s) → ${target}`);
  } else {
    console.log('○ Cursor: no matching servers (skipped)');
  }

  checkEnvCmd(false);
}

// ─── validate ──────────────────────────────────────────────────────
function validateCmd() {
  const schema = JSON.parse(
    readFileSync(join(__dirname, '..', 'schema.json'), 'utf-8')
  );

  const { servers, errors: parseErrors } = loadServers();
  let ok = true;

  if (parseErrors.length) {
    for (const e of parseErrors) console.error(`✗ Parse: ${e}`);
    ok = false;
  }

  for (const s of servers) {
    const name = s.name || '<unnamed>';
    const errs = validateServer(s, schema);
    if (errs.length > 0) {
      ok = false;
      for (const e of errs) console.error(`✗ ${name}: ${e}`);
    } else {
      console.log(`✓ ${name}`);
    }
  }

  if (ok) {
    console.log(`\nAll ${servers.length} server(s) valid.`);
  } else {
    console.log('\n⚠ Validation failed.');
    process.exit(1);
  }
}

function validateServer(server, schema) {
  const errs = [];

  // required top-level
  for (const key of (schema.required || [])) {
    if (!(key in server)) errs.push(`missing required field: "${key}"`);
  }

  // type checks on properties
  for (const [key, prop] of Object.entries(schema.properties || {})) {
    if (!(key in server)) continue;
    const val = server[key];
    if (prop.enum && !prop.enum.includes(val)) {
      errs.push(`"${key}" must be one of [${prop.enum.join(', ')}], got "${val}"`);
    }
    if (prop.type === 'array' && !Array.isArray(val)) {
      errs.push(`"${key}" must be an array`);
    }
    if (prop.type === 'string' && typeof val !== 'string') {
      errs.push(`"${key}" must be a string`);
    }
    if (prop.type === 'number' && typeof val !== 'number') {
      errs.push(`"${key}" must be a number`);
    }
    if (prop.type === 'boolean' && typeof val !== 'boolean') {
      errs.push(`"${key}" must be boolean`);
    }
  }

  // agents items check
  if (Array.isArray(server.agents)) {
    for (const a of server.agents) {
      if (!['opencode', 'cursor'].includes(a)) {
        errs.push(`unknown agent "${a}"`);
      }
    }
    if (new Set(server.agents).size !== server.agents.length) {
      errs.push('"agents" has duplicates');
    }
    if (server.agents.length === 0) {
      errs.push('"agents" must not be empty');
    }
  }

  // conditional: transport = local ⇒ required local
  if (server.transport === 'local') {
    if (!server.local) errs.push('"local" is required when transport="local"');
    else if (!server.local.command) errs.push('"local.command" is required');
  }

  // conditional: transport = remote ⇒ required remote
  if (server.transport === 'remote') {
    if (!server.remote) errs.push('"remote" is required when transport="remote"');
    else if (!server.remote.url) errs.push('"remote.url" is required');
  }

  return errs;
}

// ─── check-env ─────────────────────────────────────────────────────
function checkEnvCmd(shouldExit = true) {
  const { servers, errors } = loadServers();
  if (errors.length) {
    console.error('⚠ Fix parse errors before checking env:');
    for (const e of errors) console.error(`  ${e}`);
    if (shouldExit) process.exit(1);
    return false;
  }

  const vars = extractEnvVars(servers);
  if (vars.length === 0) {
    console.log('No env vars referenced in any server definition.');
    return true;
  }

  console.log(`\nChecking ${vars.length} env var(s):\n`);
  const allSet = checkEnvVars(servers);
  console.log(allSet ? '\n✓ All env vars set.' : '\n⚠ Run `just check-env` to see details.');
  if (!allSet && shouldExit) process.exit(1);
  return allSet;
}

// ─── dispatch ──────────────────────────────────────────────────────
const cmd = process.argv[2];

if (cmd === 'list' || !cmd) {
  listCmd();
} else if (cmd === 'show') {
  const name = process.argv[3];
  if (!name) { console.error('Usage: node mcp.mjs show <name>'); process.exit(1); }
  showCmd(name);
} else if (cmd === 'add') {
  await addCmd();
} else if (cmd === 'sync') {
  syncCmd();
} else if (cmd === 'validate') {
  validateCmd();
} else if (cmd === 'check-env') {
  checkEnvCmd();
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Usage: node mcp.mjs [list|show <name>|add|sync|validate|check-env]');
  process.exit(1);
}
