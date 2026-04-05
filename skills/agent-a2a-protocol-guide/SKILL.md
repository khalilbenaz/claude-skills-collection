---
name: agent-a2a-protocol-guide
description: Guide du protocole Agent-to-Agent (A2A) de Google pour l'interopérabilité entre agents IA — découverte, communication et collaboration inter-agents. Se déclenche avec "A2A", "agent-to-agent", "protocole A2A", "Google A2A", "interopérabilité agents".
---

# Guide du Protocole A2A

## Workflow

1. **Comprendre l'architecture A2A** — Expliquer les concepts fondamentaux du protocole : Agent Cards (description des capacités), Task lifecycle (submitted, working, completed, failed), Artifacts (résultats produits), et les rôles client/server entre agents.

2. **Créer l'Agent Card** — Définir la carte d'identité de l'agent au format JSON : nom, description, URL du endpoint, capabilities supportées (streaming, push notifications), skills déclarées avec exemples d'utilisation, et méthodes d'authentification acceptées.

3. **Implémenter le serveur A2A** — Développer le endpoint HTTP qui reçoit les requêtes JSON-RPC 2.0 : `tasks/send` pour les tâches synchrones, `tasks/sendSubscribe` pour le streaming SSE, `tasks/get` pour consulter le statut, et `tasks/cancel` pour l'annulation.

4. **Gérer le cycle de vie des tâches** — Implémenter la machine à états des tâches (submitted → working → completed/failed/canceled), les mises à jour intermédiaires via `TaskStatusUpdateEvent`, et la production d'artifacts (fichiers, données structurées, messages).

5. **Configurer la découverte d'agents** — Publier l'Agent Card sur `/.well-known/agent.json`, implémenter un registre d'agents pour la découverte dynamique, et définir les critères de sélection d'un agent pour une tâche donnée (skills, disponibilité, coût).

6. **Sécuriser les communications** — Mettre en place l'authentification entre agents (OAuth 2.0, API keys), le chiffrement des échanges (HTTPS), la validation des Agent Cards, et les politiques d'autorisation (quels agents peuvent interagir).

7. **Orchestrer la collaboration multi-agents** — Concevoir les workflows de collaboration : délégation de sous-tâches, agrégation de résultats, gestion des échecs et fallback vers d'autres agents, et chaînage de tâches entre agents spécialisés.

8. **Monitorer et debugger** — Tracer les échanges inter-agents avec des correlation IDs, logger les transitions de statut des tâches, mesurer les latences de communication, et diagnostiquer les échecs de découverte ou d'authentification.

## Règles

- Respecte strictement la spécification JSON-RPC 2.0 pour tous les échanges entre agents — pas de formats propriétaires.
- Chaque agent doit exposer une Agent Card complète et à jour sur son endpoint `/.well-known/agent.json`.
- Implémente toujours les mécanismes de timeout et d'annulation pour éviter les tâches bloquées indéfiniment.
- Conçois les agents comme des services indépendants et stateless — l'état des tâches doit être persisté côté serveur.
- Documente clairement les skills et le format des artifacts produits par chaque agent pour faciliter l'intégration.


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
