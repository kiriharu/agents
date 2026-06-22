#!/bin/sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DATA_DIR="$SCRIPT_DIR/../data"

echo "=== Skills sync (Cursor) $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "Source:  $SKILLS_DATA_DIR"
echo "Target:  $HOME/.cursor/skills"
echo ""

count=0
for skill_dir in "$SKILLS_DATA_DIR"/*/; do
    name=$(basename "$skill_dir")
    [ -f "$skill_dir/SKILL.md" ] || continue
    sh "$SCRIPT_DIR/install-skill.sh" "$name" "$HOME/.cursor/skills"
    count=$((count + 1))
done

echo ""
echo "Sync complete (${count} skill$( [ "$count" -ne 1 ] && echo "s" ))."
