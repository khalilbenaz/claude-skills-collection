---
name: bash-scripting-expert
description: Écriture de scripts Bash avancés — variables, boucles, fonctions, pipes, gestion d'erreurs et bonnes pratiques. Se déclenche avec "bash", "script bash", "shell script", "#!/bin/bash", "automatiser avec bash".
---

# Bash Scripting Expert

## Workflow

1. **Définir la structure du script** — commencer par le shebang `#!/bin/bash`, activer le mode strict avec `set -euo pipefail`, et ajouter un en-tête documentant l'objectif, l'auteur, la date et les paramètres attendus.

2. **Gestion des variables et paramètres** — utiliser des variables locales avec `local`, gérer les arguments positionnels (`$1`, `$2`, `$@`, `$#`), définir des valeurs par défaut avec `${VAR:-default}`, et valider les entrées avec des conditions de garde en début de script.

3. **Structures de contrôle** — implémenter les conditions avec `if/elif/else` et `[[ ]]` (double crochet pour les tests avancés), les boucles `for`, `while`, `until`, le `case` pour le pattern matching, et les opérateurs logiques `&&`, `||` pour le chaînage conditionnel.

4. **Fonctions réutilisables** — déclarer des fonctions avec le mot-clé `function` ou la syntaxe `nom()`, retourner des valeurs via `echo` (capture avec `$()`), utiliser `local` pour les variables internes, et organiser les fonctions utilitaires dans des fichiers sourcés avec `source` ou `.`.

5. **Pipes et redirections** — chaîner les commandes avec `|`, rediriger stdout/stderr avec `>`, `2>`, `&>`, utiliser les here-documents (`<<EOF`), le process substitution (`<(commande)`), et `tee` pour écrire simultanément dans un fichier et stdout.

6. **Gestion des erreurs** — capturer les codes de retour avec `$?`, utiliser `trap` pour le nettoyage en cas d'erreur ou d'interruption (`trap cleanup EXIT`), logger les erreurs dans un fichier dédié, et implémenter des messages d'erreur explicites avec la fonction `die()`.

7. **Traitement de texte** — manipuler les chaînes avec les expansions Bash (`${var%%pattern}`, `${var##pattern}`, `${var/old/new}`), utiliser `awk`, `sed`, `grep`, `cut` pour le parsing, et `jq` pour le traitement JSON.

8. **Tests et débogage** — utiliser `bash -x script.sh` pour le mode trace, `shellcheck` pour l'analyse statique, écrire des tests avec `bats` (Bash Automated Testing System), et logger les étapes critiques pour faciliter le diagnostic.

## Règles

- Toujours utiliser `set -euo pipefail` en début de script pour détecter les erreurs immédiatement — ne jamais laisser un script continuer silencieusement après une commande échouée.
- Quoter systématiquement les variables (`"$var"`) pour éviter le word splitting et le globbing involontaire — la majorité des bugs Bash viennent de variables non quotées.
- Utiliser `shellcheck` sur chaque script avant déploiement — cet outil détecte les erreurs courantes et les pratiques dangereuses.
- Préférer les commandes internes Bash (parameter expansion, arithmétique `$(())`) aux appels externes (`sed`, `awk`, `cut`) quand c'est possible pour améliorer la performance.
- Fournir toujours un message d'usage (`usage()`) et gérer les options avec `getopts` ou `getopt` pour rendre le script utilisable par d'autres.
