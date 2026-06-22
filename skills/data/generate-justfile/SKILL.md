---
name: generate-justfile
description: Use when the user asks to create, update, refactor, or cross-platformize a Justfile/justfile with recipes for Windows, Linux, and macOS.
---

# Generate Justfile

Use this skill when the user asks for a `justfile` / `Justfile`, especially with cross-platform commands for Windows, Linux, and macOS.

## Workflow

1. Inspect the project before editing:
   - existing `justfile` or `Justfile`
   - `README.md`, `AGENTS.md`, `CLAUDE.md`
   - Python projects: `pyproject.toml`, `uv.lock`
   - Node projects: `package.json`, `package-lock.json`
   - Docker projects: `docker-compose*.yml`
2. Preserve existing recipe names and project semantics unless the user asks to rename them.
3. Prefer adding aliases instead of breaking existing commands:
   - `sync: install`
   - `test: test-backend test-whisper`
   - `fmt: fmt-backend fmt-frontend`
4. After writing the file, validate it with `just --list` from the project root.

## Cross-platform Justfile rules

Use this header in generated files:

```just
# Common project commands.
# Recipes avoid platform-specific shell syntax, so they work on Windows, Linux, and macOS.

set shell := ["sh", "-uc"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
```

Avoid recipe body syntax that depends on one shell:

- avoid `export`, `cd`, `set -e`, `;`, `&&`, `||`, backticks, `$(...)`
- avoid Unix-only commands like `rm -rf`, `mkdir -p`, `cp`, `mv`, `touch`
- avoid PowerShell-only syntax like `New-Item`, `Remove-Item`, `Test-Path`
- avoid here-docs and shell-specific quoting
- prefer direct executable invocations and Python one-liners for portability

Prefer these patterns:

```just
uv sync --directory backend
uv run --directory backend python -c "..."
npm install --prefix frontend
npm run dev --prefix frontend
```

Use Python `pathlib`/`shutil` for cross-platform file operations:

```just
env-init:
    python -c "from pathlib import Path; env = Path('.env'); env.exists() or env.write_text(Path('.env.example').read_text())"

clean:
    python -c "from pathlib import Path; import shutil; paths=[Path('backend/.venv'), Path('frontend/node_modules'), Path('.env')]; [shutil.rmtree(p) if p.is_dir() else p.unlink() for p in paths if p.exists()]"
```

Use Just variables for repeated values:

```just
host := "127.0.0.1"
backend_port := "8000"
whisper_port := "8001"
base_url := "http://" + host + ":" + backend_port
```

Use Just line continuations for long commands:

```just
llm *args:
    llama-server --host 0.0.0.0 --port 8080 \
        --model models/model.gguf \
        --ctx-size 8192 {{args}}
```

## Typical recipe mapping

For Python/uv projects:

```just
install:
    uv sync --directory backend
    uv sync --directory whisper-api

setup: install
    python -c "from pathlib import Path; env = Path('.env'); env.exists() or env.write_text(Path('.env.example').read_text())"
    uv run --directory backend python -c "from app.database import init_db; import asyncio; asyncio.run(init_db())"

backend:
    uv run --directory backend uvicorn app.main:app --host {{host}} --port {{backend_port}} --reload

worker:
    uv run --directory backend taskiq worker app.tasks:broker app.tasks:process_video

test-backend:
    uv run --directory backend pytest

fmt-backend:
    uv run --directory backend ruff format .
    uv run --directory backend ruff check . --fix
```

For Node projects:

```just
frontend:
    npm run dev --prefix frontend

build-frontend:
    npm run build --prefix frontend

fmt-frontend:
    npm run lint --prefix frontend
```

For Docker projects:

```just
docker-up:
    docker compose -f docker-compose.backend.yml up

docker-up-gpu:
    docker compose -f docker-compose.backend.yml -f docker-compose.whisper.yml -f docker-compose.llm.yml --profile gpu up

docker-down:
    docker compose -f docker-compose.backend.yml down

docker-logs:
    docker compose -f docker-compose.backend.yml logs -f
```

## Quality checklist

Before finishing, ensure:

- the file is named `justfile` unless the user requested another name
- recipes avoid platform-specific shell syntax
- Windows and Unix shells are both declared
- existing useful aliases are preserved
- commands use project-local paths from the repository root
- `just --list` succeeds after editing
