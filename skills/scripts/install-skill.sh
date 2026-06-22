#!/bin/sh
set -eu

SKILL_NAME="$1"
TARGET_DIR="${2:-$HOME/.config/opencode/skills}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DATA_DIR="$SCRIPT_DIR/../data"

SRC="$SKILLS_DATA_DIR/$SKILL_NAME"
DST="$TARGET_DIR/$SKILL_NAME"

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
