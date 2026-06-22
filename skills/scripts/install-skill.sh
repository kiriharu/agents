#!/bin/sh
set -eu

SKILL_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DATA_DIR="$SCRIPT_DIR/../data"
OPENCODE_SKILLS_DIR="$HOME/.config/opencode/skills"

SRC="$SKILLS_DATA_DIR/$SKILL_NAME"
DST="$OPENCODE_SKILLS_DIR/$SKILL_NAME"

if [ ! -d "$SRC" ] || [ ! -f "$SRC/SKILL.md" ]; then
    echo "  [ERROR] Skill '$SKILL_NAME' not found in data/"
    exit 1
fi

if [ ! -d "$DST" ]; then
    echo "  [NEW] $SKILL_NAME"
elif ! diff -rq "$SRC" "$DST" > /dev/null 2>&1; then
    echo "  [UPDATED] $SKILL_NAME"
else
    echo "  [OK] $SKILL_NAME"
    exit 0
fi

mkdir -p "$DST"
rsync -a --delete "$SRC/" "$DST/"
