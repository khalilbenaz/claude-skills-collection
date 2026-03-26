---
name: dev-regex-builder
description: Construit, explique et teste des expressions régulières pas à pas. À utiliser quand l'utilisateur a besoin d'une regex ou veut comprendre une regex existante. Se déclenche aussi avec "regex", "expression régulière", "pattern matching", "comment matcher", "valider un email", ou toute demande impliquant du pattern matching.
---

# Regex Builder

## Étape 1 — Comprendre le besoin
- **Ce qu'il faut matcher** (exemples concrets de chaînes valides)
- **Ce qu'il faut rejeter** (exemples de chaînes invalides)
- **Langage** d'utilisation (Python, JavaScript, PHP, Java…)
- **Contexte** (validation, extraction, remplacement)

## Étape 2 — Construction progressive
Construis la regex étape par étape en expliquant chaque composant :
- Caractères littéraux
- Classes de caractères `[a-z]`, `\d`, `\w`
- Quantificateurs `+`, `*`, `?`, `{n,m}`
- Groupes `()` et alternatives `|`
- Ancres `^`, `$`, `\b`
- Lookahead/lookbehind si nécessaire

## Étape 3 — Regex finale
Présente la regex complète avec explication annotée de chaque partie.

## Étape 4 — Tests
| Entrée | Attendu | Résultat |
|--------|---------|---------|

## Étape 5 — Variantes
- Version stricte (validation précise)
- Version souple (capture large)
- Pièges courants à éviter

## Règles
- Explique toujours pourquoi chaque partie est nécessaire.
- Signale les cas limites (Unicode, multilignes…).
- Propose des alternatives plus simples si la regex devient trop complexe.
