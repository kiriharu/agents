# MCP Configuration Management

Unified MCP server configuration across coding agents (OpenCode, Cursor).
Single source of truth — canonical definitions in `servers/*.json`.
`sync` transforms and writes directly into each agent's config file.

## Directory structure

```
mcp/
├── AGENTS.md           ← this file
├── justfile            ← just commands
├── schema.json         ← JSON Schema for servers/*.json
├── servers/            ← canonical definitions (one file per MCP server)
│   └── <name>.json
└── scripts/
    └── mcp.mjs         ← add | list | show | sync | validate
```

## Canonical format (`servers/<name>.json`)

```jsonc
{
  "name": "example-server",
  "description": "What this MCP server does (optional)",
  "transport": "local",           // "local" | "remote"
  "timeout": 30000,               // ms, default 30000
  "enabled": true,
  "agents": ["opencode", "cursor"],

  // For transport = "local":
  "local": {
    "command": "npx",
    "args": ["-y", "package-name"],
    "env": {
      "API_KEY": "{env:MY_API_KEY}"
    }
  },

  // For transport = "remote":
  "remote": {
    "url": "https://mcp.example.com/mcp",
    "headers": {
      "Authorization": "Bearer {env:MY_TOKEN}"
    }
  }
}
```

`{env:VAR}` is resolved by each agent at runtime from its own environment.

## How sync works

1. Reads all `servers/*.json` with `enabled: true`
2. Filters by `agents` array — only includes servers where agent is listed
3. Transforms canonical field names to agent-specific names (see table below)
4. Creates a `.bak.<ISO-timestamp>` backup of target config files
5. Writes directly into agent config files

## Transformation rules

| Canonical field | OpenCode target | Cursor target |
|---|---|---|
| `transport: "local"` | `type: "local"` | (implicit by `command` presence) |
| `transport: "remote"` | `type: "remote"` | (implicit by `url` presence) |
| `local.command` | `command[0]` | `command` (string) |
| `local.args` | `command[1..N]` | `args` (array) |
| `local.env` | `environment` | `env` |
| `remote.url` | `url` | `url` |
| `remote.headers` | `headers` | — (not supported by Cursor) |
| `timeout` | `timeout` | — (not supported by Cursor) |
| `{env:VAR}` | kept as-is | converted to `${env:VAR}` |

### Target files

| Agent | Target path |
|---|---|
| OpenCode | `~/.config/opencode/opencode.json` → key `$.mcp` (merged, not overwritten) |
| Cursor | `~/.cursor/mcp.json` (full overwrite) |

## Backups

Before `sync` writes, a timestamped backup is saved next to each target file:

```
~/.config/opencode/opencode.json.bak.2025-06-22T14-30-00
~/.cursor/mcp.json.bak.2025-06-22T14-30-00
```

To restore: `cp <target>.bak.<timestamp> <target>`

## Commands

| Command | Description |
|---|---|
| `just list` | Show all servers: name, transport, description, agents |
| `just show <name>` | Pretty-print one server definition |
| `just add` | Interactive prompts → creates `servers/<name>.json` |
| `just sync` | Transform + write all enabled servers to agent configs |
| `just validate` | Check all `servers/*.json` against `schema.json` |

## Example: add a new server

```bash
just add
# → name: sentry
# → description: Sentry error monitoring
# → transport: 2 (remote)
# → url: https://mcp.sentry.dev/mcp
# → agents: [Enter] (default: both)

just sync
# → Backs up & updates opencode.json + ~/.cursor/mcp.json
```
