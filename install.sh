#!/usr/bin/env sh
# Installe un ou plusieurs skills dans ~/.claude/skills.
#
# Usage :
#   curl -fsSL .../install.sh | sh -s -- <skill> [<skill>...] [--launch]
#   curl -fsSL .../install.sh | sh -s -- --category security        # toute une catégorie
#   curl -fsSL .../install.sh | sh -s -- --list                     # catégories disponibles
#   curl -fsSL .../install.sh | sh -s -- --search redis             # recherche par mot-clé
#
# Options :
#   --category <préfixe>  installe tous les skills de la catégorie (dev, security, agent, …)
#   --search <terme>      liste les skills dont le nom contient <terme>
#   --list                liste les catégories et leur nombre de skills
#   --launch              lance Claude Code sur le premier skill installé
#   --dest <dir>          répertoire cible (défaut : ~/.claude/skills)
set -e

# SKILLS_BASE permet de tester en local : SKILLS_BASE="file:///chemin/du/repo" ./install.sh …
BASE="${SKILLS_BASE:-https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main}"
CATALOG="https://khalilbenaz.github.io/claude-skills-collection/manuals/"
DEST_ROOT="$HOME/.claude/skills"
LAUNCH=0
MODE=names
NAMES=""
ARG=""

usage() {
  sed -n '2,20p' "$0" 2>/dev/null || true
  echo "Usage : install.sh <skill> [<skill>...] [--launch] | --category <préfixe> | --search <terme> | --list"
  echo "Catalogue : $CATALOG"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --launch) LAUNCH=1 ;;
    -Launch) LAUNCH=1 ;;
    --list) MODE=list ;;
    --category) MODE=category; shift; ARG="$1" ;;
    --search) MODE=search; shift; ARG="$1" ;;
    --dest) shift; DEST_ROOT="$1" ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Option inconnue : $1"; usage; exit 1 ;;
    *) NAMES="$NAMES $1" ;;
  esac
  shift
done

INDEX=$(curl -fsSL "$BASE/manuals/skills.index")
[ -n "$INDEX" ] || { echo "✗ Index des skills inaccessible."; exit 1; }

case "$MODE" in
  list)
    echo "Catégories disponibles :"
    echo "$INDEX" | awk '{print $3}' | sort | uniq -c | sort -rn | awk '{printf "  %-14s %s skills\n", $2, $1}'
    echo ""
    echo "Installer une catégorie : install.sh --category dev"
    exit 0
    ;;
  search)
    [ -n "$ARG" ] || { echo "✗ --search attend un terme."; exit 1; }
    echo "$INDEX" | awk -v t="$ARG" 'index($1, t) { print "  " $1 }'
    echo ""
    echo "Manuels : $CATALOG"
    exit 0
    ;;
  category)
    [ -n "$ARG" ] || { echo "✗ --category attend un préfixe (voir --list)."; exit 1; }
    NAMES=$(echo "$INDEX" | awk -v c="$ARG" '$3 == c { printf "%s ", $1 }')
    [ -n "$NAMES" ] || { echo "✗ Catégorie inconnue : $ARG (voir --list)"; exit 1; }
    ;;
esac

[ -n "$NAMES" ] || { usage; exit 1; }

FIRST=""
COUNT=0
for SKILL in $NAMES; do
  ENTRY=$(echo "$INDEX" | awk -v s="$SKILL" '$1 == s { print $2; exit }')
  if [ -z "$ENTRY" ]; then
    echo "✗ Skill introuvable : $SKILL  (essayez : install.sh --search $SKILL)"
    continue
  fi
  DEST="$DEST_ROOT/$(basename "$ENTRY")"
  mkdir -p "$DEST"
  curl -fsSL "$BASE/$ENTRY/SKILL.md" -o "$DEST/SKILL.md"
  echo "✓ $SKILL → $DEST"
  COUNT=$((COUNT + 1))
  [ -n "$FIRST" ] || FIRST="$SKILL"
done

[ "$COUNT" -gt 0 ] || { echo "Aucun skill installé. Catalogue : $CATALOG"; exit 1; }
echo "$COUNT skill(s) installé(s)."

if [ "$LAUNCH" = "1" ] && [ -n "$FIRST" ]; then
  if command -v claude >/dev/null 2>&1; then
    exec claude "/$FIRST"
  fi
  echo "⚠ Claude Code non trouvé. Installation : npm install -g @anthropic-ai/claude-code"
fi
echo "Lancer : claude \"/$FIRST\""
