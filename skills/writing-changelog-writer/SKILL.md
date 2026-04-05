---
name: writing-changelog-writer
description: Génération de changelogs structurés depuis des commits Git — format Keep a Changelog, Conventional Commits, notes de release. À utiliser quand l'utilisateur veut générer un changelog, documenter une release ou structurer ses notes de version. Se déclenche aussi avec "changelog", "notes de release", "release notes", "historique des changements", "CHANGELOG.md", "version log".
---

# Rédacteur de Changelog

## Workflow

1. **Collecter** : analyser les commits depuis la dernière release.
2. **Catégoriser** : grouper par type (ajout, correction, suppression, etc.).
3. **Rédiger** : descriptions orientées utilisateur, pas développeur.
4. **Formater** : suivre le standard Keep a Changelog.

## Format Keep a Changelog

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
- Amélioration du temps de réponse de l'API de paiement (de 800ms à 200ms)

### Corrigé
- Correction du calcul des frais pour les devises non-EUR (#238)
- Résolution du timeout sur les webhooks de notification (#240)

### Supprimé
- Retrait de l'ancien endpoint `/v1/legacy-payments` (déprécié depuis v2.1)

## [2.3.0] - 2025-12-15

### Ajouté
- Support du paiement en GBP
- Authentification par API key pour les partenaires

### Sécurité
- Mise à jour de la dépendance `auth-lib` pour corriger CVE-2025-1234

## [2.2.1] - 2025-11-28

### Corrigé
- Fix du double débit sur les paiements récurrents (#229)
```

## Catégories standard

| Catégorie | Conventional Commit | Contenu |
|-----------|-------------------|---------|
| **Ajouté** | `feat:` | Nouvelles fonctionnalités |
| **Modifié** | `refactor:`, `perf:` | Changements de fonctionnalités existantes |
| **Déprécié** | — | Fonctionnalités bientôt supprimées |
| **Supprimé** | — | Fonctionnalités supprimées |
| **Corrigé** | `fix:` | Corrections de bugs |
| **Sécurité** | `security:` | Corrections de vulnérabilités |

## Depuis les Conventional Commits

### Mapping automatique

```
feat: add GBP support              → Ajouté: Support du paiement en GBP
fix: double charge on recurring    → Corrigé: Fix du double débit récurrent
perf: optimize payment query       → Modifié: Optimisation requête paiement
feat!: new auth system             → Modifié (BREAKING): Nouveau système d'auth
chore: update dependencies         → (ignoré ou Sécurité si CVE)
docs: update API reference         → (ignoré dans le changelog)
```

### Script de génération

```bash
# Commits depuis le dernier tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline --format="%s"

# Avec conventional commits
git log v2.2.1..HEAD --oneline | grep -E "^(feat|fix|perf|refactor)(\(.+\))?!?:"
```

## Bonnes pratiques de rédaction

### À faire
- Écrire pour les **utilisateurs**, pas les développeurs
- Inclure les **numéros de tickets/issues** (#123)
- Utiliser des **verbes d'action** (Ajout de, Correction de, Suppression de)
- Documenter les **breaking changes** clairement
- Dater chaque release au format ISO (YYYY-MM-DD)

### À éviter
- Copier les messages de commit tels quels
- Inclure les commits de type `chore`, `style`, `test`
- Des entrées trop vagues ("diverses corrections")
- Oublier la section `[Unreleased]` pour le travail en cours

## Règles
- Le changelog est un document pour les **utilisateurs**, pas un miroir du `git log`.
- Chaque release doit être **datée** et **versionnée** (semver).
- Les breaking changes doivent être signalés **explicitement**.
- La section `[Unreleased]` doit toujours exister en haut du fichier.


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
