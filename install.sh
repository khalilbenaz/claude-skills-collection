#!/usr/bin/env sh
# Installe un skill dans ~/.claude/skills et le lance optionnellement dans Claude Code.
# Usage :
#   curl -fsSL https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.sh | sh -s -- <skill-name> [--launch]
set -e

SKILL="$1"
BASE="https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main"

if [ -z "$SKILL" ]; then
  echo "Usage : install.sh <skill-name> [--launch]"
  echo "Catalogue : https://khalilbenaz.github.io/claude-skills-collection/manuals/"
  exit 1
fi

ENTRY=$(curl -fsSL "$BASE/manuals/skills.index" | awk -v s="$SKILL" '$1==s{print $2; exit}')
if [ -z "$ENTRY" ]; then
  echo "✗ Skill introuvable : $SKILL"
  echo "Catalogue : https://khalilbenaz.github.io/claude-skills-collection/manuals/"
  exit 1
fi

DEST="$HOME/.claude/skills/$(basename "$ENTRY")"
mkdir -p "$DEST"
curl -fsSL "$BASE/$ENTRY/SKILL.md" -o "$DEST/SKILL.md"
echo "✓ $SKILL installé dans $DEST"

if [ "$2" = "--launch" ]; then
  if command -v claude >/dev/null 2>&1; then
    exec claude "/$SKILL"
  else
    echo "⚠ Claude Code non trouvé. Installation : npm install -g @anthropic-ai/claude-code"
    echo "Puis lancez : claude \"/$SKILL\""
  fi
else
  echo "Lancer : claude \"/$SKILL\""
fi
