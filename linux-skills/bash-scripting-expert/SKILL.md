---
name: bash-scripting-expert
description: Écriture de scripts Bash avancés — variables, boucles, fonctions, pipes, gestion d'erreurs et bonnes pratiques. Se déclenche avec "bash", "script bash", "shell script", "#!/bin/bash", "automatiser avec bash". Also triggers on "bash script", "shell scripting", "write a shell one-liner".
---

# Bash Scripting Expert

## Workflow

### 1. En-tête et mode strict

Toujours commencer par :

```bash
#!/usr/bin/env bash
# Description : <objectif>
# Usage       : ./script.sh [OPTIONS] <arg>
# Auteur      : <nom>  Date : 2026-xx-xx
set -euo pipefail
IFS=$'\n\t'
```

- `set -e` : arrêt immédiat sur erreur non capturée.
- `set -u` : erreur sur variable non définie.
- `set -o pipefail` : propagation du code d'erreur dans les pipes.
- `IFS=$'\n\t'` : sécurise les boucles sur des chemins contenant des espaces.

### 2. Variables et paramètres

```bash
# Valeur par défaut
LOG_DIR="${LOG_DIR:-/var/log/myapp}"

# Vérification des arguments
[[ $# -lt 1 ]] && { echo "Usage: $0 <fichier>" >&2; exit 1; }
INPUT_FILE="$1"

# Variable locale dans une fonction
process_file() {
  local file="$1"
  local line_count
  line_count=$(wc -l < "$file")
  echo "$line_count"
}
```

Règle : **toujours quoter** `"$var"` pour éviter word-splitting et globbing.

### 3. Structures de contrôle

```bash
# Tests avancés avec [[ ]]
if [[ -f "$file" && -r "$file" ]]; then
  echo "Lisible"
elif [[ "$mode" == "dry-run" ]]; then
  echo "Simulation"
else
  die "Fichier introuvable : $file"
fi

# Boucle sur fichiers (safe avec espaces)
while IFS= read -r line; do
  echo "Traitement : $line"
done < "$INPUT_FILE"

# Pattern matching
case "$action" in
  start|restart) systemctl "$action" myservice ;;
  stop)          systemctl stop myservice ;;
  *)             die "Action inconnue : $action" ;;
esac
```

**Critère de décision `[ ]` vs `[[ ]]`** : utiliser `[[ ]]` par défaut (supporte `&&`, `||`, `=~`, pas de word-splitting) ; `[ ]` uniquement pour POSIX portability.

### 4. Gestion des erreurs et nettoyage

```bash
# Fonction die() standard
die() { echo "[ERROR] $*" >&2; exit 1; }

# Nettoyage automatique avec trap
TMPDIR_WORK=$(mktemp -d)
cleanup() {
  rm -rf "$TMPDIR_WORK"
}
trap cleanup EXIT INT TERM

# Commande optionnelle sans stopper le script
some_cmd || true

# Capture du code de retour sans déclencher set -e
if ! rsync -a src/ dst/; then
  die "Échec rsync"
fi
```

### 5. Fonctions utilitaires réutilisables

```bash
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
warn() { echo "[WARN]  $*" >&2; }

require_cmd() {
  command -v "$1" &>/dev/null || die "Commande manquante : $1"
}

# Vérification des dépendances en début de script
require_cmd jq
require_cmd rsync
```

### 6. Pipes, redirections et process substitution

```bash
# Redirection stdout + stderr vers fichier
myapp 2>&1 | tee -a "$LOG_DIR/app.log"

# Process substitution (compare deux sorties sans fichier temporaire)
diff <(sort file1.txt) <(sort file2.txt)

# Here-document
psql -U postgres <<SQL
  SELECT count(*) FROM ma_table;
SQL
```

### 7. Traitement de texte

```bash
# Expansions Bash (préférer aux appels externes)
filename="${path##*/}"          # basename
extension="${filename##*.}"     # extension
noext="${filename%.*}"          # sans extension
upper="${var^^}"                # majuscules (Bash 4+)

# Parsing rapide avec awk
awk -F: '$3 >= 1000 {print $1}' /etc/passwd   # utilisateurs standards

# JSON avec jq
jq -r '.items[] | select(.status=="active") | .name' data.json

# sed inline (macOS : sed -i '' ; Linux : sed -i)
sed -i 's/old/new/g' config.txt
```

**Critère de décision** : préférer les expansions Bash (`${var##...}`) pour les opérations simples sur chaînes (pas de fork). Utiliser `awk`/`sed` pour des transformations structurées ou multi-lignes.

### 8. Options et usage

```bash
usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] <input>
  -v, --verbose   Mode verbeux
  -o, --output    Fichier de sortie (défaut: stdout)
  -h, --help      Affiche cette aide
EOF
}

# Parsing avec getopts (POSIX, options courtes uniquement)
while getopts ":vo:h" opt; do
  case $opt in
    v) VERBOSE=1 ;;
    o) OUTPUT="$OPTARG" ;;
    h) usage; exit 0 ;;
    :) die "Option -$OPTARG requiert un argument" ;;
    \?) die "Option inconnue : -$OPTARG" ;;
  esac
done
shift $((OPTIND - 1))
```

### 9. Tests et débogage

```bash
# Trace complète
bash -x script.sh arg1

# Analyse statique (installer via apt/brew)
shellcheck -S warning script.sh

# Test unitaire avec bats
@test "process_file retourne le bon compte" {
  result=$(process_file fixtures/sample.txt)
  [ "$result" -eq 10 ]
}
```

Workflow de débogage recommandé : `shellcheck` → `bash -n` (syntax check) → `bash -x` (trace) → `bats` (tests).

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| `ls *.log \| xargs rm` | Casse avec espaces/newlines | `find . -name '*.log' -delete` |
| `for f in $(find ...)` | Word splitting | `while IFS= read -r f; do ... done < <(find ...)` |
| `[ $var == "val" ]` | Erreur si `$var` vide | `[[ "$var" == "val" ]]` |
| `cp file /dest` sans vérif | Écriture silencieuse sur fichier existant | Ajouter `-i` ou vérifier avant |
| `eval "$user_input"` | Injection de commandes | Éviter `eval` avec données externes |
| Script sans `set -u` | Variable mal nommée passe silencieusement | Toujours `set -euo pipefail` |
| Paths sans guillemets | Casse avec espaces | Toujours `"$path"` |

## Bonnes pratiques 2026

- **ShellCheck** intégré en CI (GitHub Actions : `shellcheck-action`) — bloquant sur `error`, avertissement sur `warning`.
- **Bats-core** pour les tests unitaires Bash (`bats-core/bats-core` v1.10+).
- **Nommage** : variables d'environnement en `UPPER_SNAKE`, variables locales en `lower_snake`, constantes en `readonly UPPER`.
- **Pas de Bash pour du Python** : si le script dépasse ~200 lignes ou manipule du JSON/YAML complexe, migrer vers Python.
- **Logs structurés** : préférer `echo "[$(date -Iseconds)] [LEVEL] message"` ou déléguer à `logger` (syslog).
- **Idempotence** : chaque script doit pouvoir être relancé sans effet de bord — vérifier l'existence avant de créer, `mkdir -p`, `cp -n`.
- **Secrets** : ne jamais mettre de mot de passe dans le script ; lire depuis `$ENV_VAR` ou un fichier avec permissions `600`.
