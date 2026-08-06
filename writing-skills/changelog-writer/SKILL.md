---
name: changelog-writer
description: Génération de changelogs structurés depuis des commits Git — format Keep a Changelog, Conventional Commits, notes de release. À utiliser quand l'utilisateur veut générer un changelog, documenter une release ou structurer ses notes de version. Se déclenche aussi avec "changelog", "notes de release", "release notes", "historique des changements", "CHANGELOG.md", "version log". Also triggers on "write a changelog", "conventional commits summary".
---

# Rédacteur de Changelog

## Workflow en 5 étapes

### 1. Récupérer les commits depuis le dernier tag

```bash
# Dernier tag automatique
LAST_TAG=$(git describe --tags --abbrev=0)

# Commits en format structuré
git log $LAST_TAG..HEAD --pretty=format:"%h %s" --no-merges

# Filtrer les types pertinents (Conventional Commits)
git log $LAST_TAG..HEAD --pretty=format:"%s" --no-merges \
  | grep -E "^(feat|fix|perf|refactor|security)(\(.+\))?!?:"
```

Si pas de tag : `git log --oneline` ou demander la plage de commits (`v2.3.0..v2.4.0`).

### 2. Filtrer — quoi inclure / exclure

| Type commit | Action |
|------------|--------|
| `feat:` | Inclure → **Ajouté** |
| `fix:` | Inclure → **Corrigé** |
| `perf:`, `refactor:` avec impact utilisateur | Inclure → **Modifié** |
| `feat!:` ou `BREAKING CHANGE:` | Inclure → **Modifié** avec mention `⚠ BREAKING` |
| `security:` ou CVE dans message | Inclure → **Sécurité** |
| `chore:`, `style:`, `test:`, `ci:`, `docs:` | **Ignorer** sauf exception explicite |
| Merges, bumps de version | **Ignorer** |

### 3. Réécrire en langage utilisateur

Les messages de commit sont écrits pour les développeurs ; le changelog est lu par les utilisateurs, les ops, les intégrateurs.

```
# Commit brut
fix(payment): null pointer when currency is missing in payload

# Entrée changelog
- Correction d'un crash lors du traitement d'un paiement sans devise (#312)
```

Règle : **une entrée = un bénéfice ou un risque concret**, pas un détail d'implémentation.

### 4. Formater selon Keep a Changelog

```markdown
# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté
- Endpoint de recherche de transactions par date (#234)
- Export CSV des rapports mensuels (#241)

### Modifié
- ⚠ BREAKING: renommage du champ `amount_cents` → `amount` (entier en centimes) — adapter les intégrateurs avant migration
- Amélioration du temps de réponse API paiement : 800 ms → 200 ms

### Corrigé
- Crash lors d'un paiement sans devise renseignée (#312)
- Timeout sur les webhooks de notification (#240)

### Supprimé
- Endpoint `/v1/legacy-payments` retiré (déprécié depuis v2.1)

### Sécurité
- Mise à jour `auth-lib` 3.2.1 → 3.4.0 (corrige CVE-2025-1234, score CVSS 8.1)

## [2.3.0] - 2025-12-15

### Ajouté
- Support du paiement en GBP
- Authentification par API key pour les partenaires

## [2.2.1] - 2025-11-28

### Corrigé
- Double débit sur les paiements récurrents (#229)

[Unreleased]: https://github.com/acme/app/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/acme/app/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/acme/app/releases/tag/v2.2.1
```

### 5. Intégrer dans CHANGELOG.md

```bash
# Ouvrir le fichier existant et insérer la nouvelle section sous ## [Unreleased]
# ou transformer [Unreleased] en [X.Y.Z] - YYYY-MM-DD lors du release
sed -i 's/## \[Unreleased\]/## [Unreleased]\n\n## [2.4.0] - '"$(date +%Y-%m-%d)"'/' CHANGELOG.md
```

## Critères de décision — quel format utiliser ?

| Contexte | Format recommandé |
|----------|------------------|
| Projet open source / librairie | Keep a Changelog strict + liens de comparaison |
| API interne / microservice | Keep a Changelog allégé, accent sur breaking changes |
| Release notes produit (end-users) | Langage non-technique, regrouper par fonctionnalité |
| Monorepo multi-packages | Un CHANGELOG par package + CHANGELOG racine pour les releases globales |
| JIRA / Azure DevOps | Inclure les IDs de tickets (`(WFC-4512)`) dans chaque entrée |

## Génération semi-automatique avec git-cliff (2026)

```bash
# Installer
cargo install git-cliff
# ou : brew install git-cliff / pip install git-cliff

# Générer depuis la dernière version
git cliff --latest -o CHANGELOG.md

# Générer une plage précise
git cliff v2.2.1..v2.3.0 -o CHANGELOG.md

# Prévisualiser sans écrire
git cliff --unreleased
```

Configuration `cliff.toml` minimale pour Conventional Commits :

```toml
[changelog]
header = "# Changelog\n\n"
body = """
{% for group, commits in commits | group_by(attribute="group") %}
### {{ group | upper_first }}
{% for commit in commits %}
- {{ commit.message }} ({{ commit.id | truncate(length=7, end="") }})
{% endfor %}
{% endfor %}
"""
trim = true

[git]
conventional_commits = true
filter_unconventional = true
commit_parsers = [
  { message = "^feat", group = "Ajouté" },
  { message = "^fix", group = "Corrigé" },
  { message = "^perf|^refactor", group = "Modifié" },
  { message = "^security", group = "Sécurité" },
  { message = "^chore|^docs|^style|^test|^ci", skip = true },
]
```

## Anti-patterns — ce qui dégrade un changelog

- **Copier les messages de commit bruts** : incompréhensibles hors contexte développeur.
- **Entrées trop vagues** : "diverses corrections de bugs", "améliorations de performance" → toujours donner le détail.
- **Oublier les breaking changes** ou les noyer dans les autres catégories : les placer en tête de section **Modifié** avec le préfixe `⚠ BREAKING`.
- **Ne pas dater les releases** : indispensable pour tracer un incident ou un audit.
- **Supprimer `[Unreleased]`** : doit toujours exister pour accumuler le travail en cours.
- **Mélanger des corrections de sécurité avec des bugs ordinaires** : la catégorie **Sécurité** est séparée pour permettre un filtrage rapide.
- **Ignorer les CVE dans les dépendances** : une mise à jour de librairie corrigeant un CVE DOIT apparaître dans **Sécurité**.
- **Changelog généré uniquement à la release** : tenir `[Unreleased]` à jour en continu, entrée par entrée, facilite la rédaction finale.

## Bonnes pratiques 2026

- Utiliser les **liens de comparaison** en bas du fichier (`[2.3.0]: https://github.com/...`) pour navigation rapide.
- Pour les **monorepos** : envisager [changesets](https://github.com/changesets/changesets) ou [nx release](https://nx.dev/features/manage-releases) qui génèrent les changelogs par package.
- Les **tickets** (#123, WFC-4512) doivent pointer vers le tracker — privilégier l'URL complète si le fichier est lu hors du contexte GitHub/ADO.
- En CI : valider automatiquement que `[Unreleased]` n'est pas vide avant un merge sur `main` (`git cliff --unreleased | grep -q '.'`).
