# OpenCode plugins

Platform-specific plugins for [OpenCode](https://opencode.ai).

| Plugin | Description | Commands |
|--------|-------------|----------|
| [ponytail](https://github.com/DietrichGebert/ponytail) | Lazy senior dev — reduces code bloat ~54% | `just ponytail-install`, `just ponytail-update` |
| ask | Read-only Q&A agent — search, read, answer questions, brainstorm | `just ask-install`, `just ask-update` |
| [graphify](https://github.com/safishamsi/graphify) | Knowledge graph for any codebase — god nodes, community detection, query/path/explain tools | `just graphify-install`, `just graphify-update` |

All plugins clone into `~/.config/opencode/openplugins/` and register
themselves in `~/.config/opencode/opencode.json` (`$.plugin` key).

Agent files install into `~/.config/opencode/agents/`.
