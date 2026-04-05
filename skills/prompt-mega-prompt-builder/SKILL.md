---
name: prompt-mega-prompt-builder
description: Construit un mega-prompt complet et structuré à partir d'un objectif simple. À utiliser quand l'utilisateur veut créer un prompt complexe et puissant de zéro. Se déclenche aussi avec "crée un prompt pour", "mega prompt", "prompt complet", "construis un prompt", "super prompt", ou toute demande de création de prompt élaboré.
---

# Mega-Prompt Builder

## Étape 1 — Objectif
Que doit faire le LLM, pour qui, quel format, quel ton, quelles contraintes.

## Étape 2 — Architecture
Construis avec ces blocs (selon pertinence) :

```
[RÔLE] — Qui est le LLM
[CONTEXTE] — Infos de fond
[OBJECTIF] — Tâche principale
[INSTRUCTIONS] — Étapes numérotées
[FORMAT] — Structure de sortie exacte
[EXEMPLES] — 1-3 few-shot input → output
[CONTRAINTES] — Ce qu'il ne faut PAS faire
[QUALITÉ] — Critères à respecter
[VARIABLES] — {{placeholders}} réutilisables
```

## Étape 3 — Rédaction
Mega-prompt complet, prêt à copier-coller.

## Étape 4 — Guide d'utilisation
Variables à remplir, adaptation, pièges à éviter.

## Étape 5 — Versions
- **Standard** : prompt complet
- **Template** : avec {{placeholders}}


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
