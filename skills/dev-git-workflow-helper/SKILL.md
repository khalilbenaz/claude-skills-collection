---
name: dev-git-workflow-helper
description: Guide pour les opérations Git complexes, résolution de conflits et bonnes pratiques de workflow. À utiliser quand l'utilisateur est bloqué avec Git ou veut mettre en place un workflow. Se déclenche aussi avec "git merge conflict", "comment revert", "git rebase", "branching strategy", "j'ai cassé mon git", ou toute question Git avancée.
---

# Git Workflow Helper

## 1. Diagnostic initial

Avant toute action, évaluer la situation :

```bash
git status                        # état de l'index et du working tree
git log --oneline --graph -15     # historique visuel récent
git stash list                    # stashs en attente
git remote -v                     # remotes configurées
```

Identifier : branche courante, commits non-pushés, fichiers modifiés/stagés, conflits actifs.

---

## 2. Résolution de conflits de merge

**Étapes :**

1. Lancer le merge ou rebase, observer les conflits :
   ```bash
   git merge feature/ma-branche
   # ou
   git rebase main
   ```
2. Lister les fichiers en conflit :
   ```bash
   git diff --name-only --diff-filter=U
   ```
3. Éditer chaque fichier : supprimer les marqueurs `<<<<<<<`, `=======`, `>>>>>>>`, garder le bon code.
4. Marquer comme résolu et continuer :
   ```bash
   git add <fichier-résolu>
   git merge --continue     # ou git rebase --continue
   ```
5. En cas d'impasse, annuler proprement :
   ```bash
   git merge --abort        # ou git rebase --abort
   ```

**Outil visuel (recommandé) :**
```bash
git mergetool               # ouvre vimdiff, VS Code, IntelliJ selon config
```

---

## 3. Annuler / corriger des commits

| Situation | Commande | Risque |
|---|---|---|
| Défaire le dernier commit (garder les modifs) | `git reset --soft HEAD~1` | Faible |
| Défaire le dernier commit (perdre les modifs) | `git reset --hard HEAD~1` | **Destructif** |
| Corriger le message du dernier commit | `git commit --amend --no-edit` | Faible si pas pushé |
| Annuler un commit déjà pushé (safe) | `git revert <sha>` | Nul — crée un commit inverse |
| Supprimer un commit du milieu de l'historique | `git rebase -i HEAD~N` | Modéré |

**Règle d'or :** ne jamais `--force-push` sur `main`/`master`. Sur une branche feature partagée, prévenir l'équipe.

---

## 4. Rebase interactif — recette type

```bash
git fetch origin
git rebase -i origin/main
```

Dans l'éditeur, remplacer `pick` par :
- `squash` (s) — fusionner dans le commit précédent
- `reword` (r) — changer le message
- `drop` (d) — supprimer le commit
- `fixup` (f) — squash sans garder le message

Après résolution des conflits éventuels :
```bash
git rebase --continue
git push --force-with-lease   # plus sûr que --force : échoue si la remote a bougé
```

---

## 5. Stratégies de branches — critères de décision

| Stratégie | Quand l'adopter | Branches clés |
|---|---|---|
| **Trunk-based** | CI/CD mature, feature flags, équipe senior | `main` + branches courtes (<1 jour) |
| **GitHub Flow** | SaaS, déploiement continu, équipe ≤15 | `main` + `feature/*` + PR |
| **Git Flow** | Releases versionnées, mobile/desktop, hotfixes fréquents | `main`, `develop`, `release/*`, `hotfix/*`, `feature/*` |

**Convention de nommage recommandée :**
```
feature/<ticket-id>-description-courte
fix/<ticket-id>-description
chore/update-dependencies
hotfix/v2.3.1-crash-login
```

---

## 6. Convention de commit (Conventional Commits)

```
<type>(<scope>): <description courte>

[corps optionnel]

[footer: BREAKING CHANGE: ... ou Closes #123]
```

Types courants : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

Exemple :
```
feat(auth): ajouter le login biométrique iOS

Implémente Face ID et Touch ID via LocalAuthentication.
Désactive le fallback PIN si biométrie disponible.

Closes #489
```

---

## 7. Sauvegarder avant une opération risquée

```bash
# Créer une branche de sauvegarde avant toute manipulation dangereuse
git branch backup/$(git rev-parse --abbrev-ref HEAD)-$(date +%Y%m%d)

# Stasher les modifs non-commitées
git stash push -m "backup avant rebase 2026-06-24"
```

---

## 8. Garde-fous et anti-patterns

**Ne jamais faire :**
- `git push --force` sur une branche partagée sans `--force-with-lease`
- `git reset --hard` sans avoir vérifié `git stash` ou créé une branche backup
- Commiter des secrets (`.env`, clés API) — utiliser `git-secret` ou `.gitignore` strict
- Laisser des merge commits de merge de merge (rebase avant de merger)
- Branches vivant > 2 semaines sans merge : risque de divergence majeure

**Pièges fréquents :**
- `git pull` sans `--rebase` crée des merge commits parasites → configurer globalement :
  ```bash
  git config --global pull.rebase true
  ```
- Oublier `git fetch` avant un rebase : on rebase sur une base obsolète
- `git stash pop` sur le mauvais contexte : toujours vérifier `git stash list` avant
- Fichiers binaires en conflit : privilégier `git checkout --ours <fichier>` ou `--theirs`

---

## 9. Configuration globale utile (2026)

```bash
# Affichage lisible
git config --global log.date relative
git config --global alias.lg "log --oneline --graph --decorate --all"

# Sécurité
git config --global push.default current
git config --global pull.rebase true
git config --global rerere.enabled true   # mémorise les résolutions de conflits

# Signer les commits (recommandé en équipe)
git config --global commit.gpgsign true
```

---

## 10. Récupérer après une catastrophe

```bash
# Retrouver un commit "perdu" après reset --hard
git reflog
git checkout <sha-perdu>     # inspecter
git branch recovery/ma-branche <sha-perdu>   # restaurer

# Retrouver un fichier supprimé
git log --all --full-history -- chemin/fichier.txt
git checkout <sha>^ -- chemin/fichier.txt
```

`git reflog` conserve l'historique local des mouvements HEAD pendant ~90 jours.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
