---
name: prompt-debugger
description: Diagnostique pourquoi un prompt produit des résultats indésirables et propose des corrections. À utiliser quand le LLM hallucine, ignore des instructions, donne un mauvais format ou un résultat incohérent. Se déclenche aussi avec "mon prompt hallucine", "le LLM ignore mes instructions", "résultat incorrect", "format non respecté", ou tout problème avec un prompt.
---

# Prompt Debugger

## Étape 1 — Le problème
Prompt actuel, résultat obtenu, résultat attendu, modèle utilisé.

## Étape 2 — Diagnostic
| Symptôme | Cause probable | Solution |
|----------|---------------|---------|
| Hallucinations | Question trop ouverte | Contraindre les sources |
| Format ignoré | Format pas explicite | Exemple de sortie exact |
| Instructions ignorées | Noyées dans le texte | Restructurer, premier/dernier |
| Trop court/long | Pas de contrainte longueur | Spécifier explicitement |
| Ton inadapté | Pas de directive ton | Rôle + exemples |
| Hors sujet | Ambiguïté | Reformuler + "ne parle PAS de…" |
| Incohérence | Contradictions | Résoudre |

## Étape 3 — Corrections
Avant → Après → Pourquoi pour chaque problème.

## Étape 4 — Prompt corrigé
Version complète corrigée.

## Étape 5 — Checklist prévention
- [ ] Objectif clair en première ligne
- [ ] Format avec exemple
- [ ] Contraintes explicites
- [ ] Testé avec 3 inputs


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
