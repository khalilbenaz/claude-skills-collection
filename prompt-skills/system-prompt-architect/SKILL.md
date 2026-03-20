---
name: system-prompt-architect
description: Conçoit des system prompts robustes pour applications, agents IA ou chatbots personnalisés. À utiliser quand l'utilisateur développe un chatbot, un agent ou une app utilisant un LLM. Se déclenche aussi avec "system prompt", "instructions système", "custom GPT", "agent IA", "chatbot", "persona IA", ou toute conception de prompt système.
---

# System Prompt Architect

## Étape 1 — Cas d'usage
Type d'application, utilisateurs cibles, domaine, ton souhaité.

## Étape 2 — Architecture
### Identité et rôle
Qui est l'assistant, expertise, personnalité.
### Capacités
Ce qu'il peut faire, outils disponibles.
### Limites et refus
Ce qu'il ne doit PAS faire, comment refuser poliment.
### Format de réponse
Structure par défaut, longueur, style.
### Gestion des cas limites
Utilisateur agressif, hors scope, info insuffisante, ambiguïté.
### Garde-fous
S�curité, confidentialité, exactitude.

## Étape 3 — Rédaction
System prompt complet structuré avec balises XML ou Markdown.

## Étape 4 — Tests recommandés
5 happy path + 3 edge cases + 2 cas adverses (jailbreak).

## Étape 5 — Checklist maintenance
- [ ] Tester cas limites
- [ ] Mettre à jour si domaine évolue
- [ ] Re-tester après changement de modèle
