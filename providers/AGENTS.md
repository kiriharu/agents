# Providers

Platform-specific agent configuration. Each subdirectory corresponds to a
coding agent (OpenCode, Cursor, …) and contains agent-specific plugins,
commands, and overrides that are not portable across agents.

## Directory structure

```
providers/
├── AGENTS.md           ← this file
└── <agent>/
    ├── AGENTS.md       ← agent-specific plugin inventory
    ├── justfile        ← agent-level commands
    └── <plugin>/
        └── scripts/    ← install / update scripts
```

## Conventions

- **One agent per subdirectory.** Agent-specific configuration never leaks
  into other agent directories.
- **Plugins live under `<agent>/<plugin>/`.** Each plugin ships its own
  install and update scripts.
- **Runtime targets go to `~/.config/opencode/`.** Scripts write into the
  global opencode config (plugins, commands, skills) — the provider
  directory is the source of truth, not the runtime destination.
