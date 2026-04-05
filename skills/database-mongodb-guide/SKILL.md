---
name: database-mongodb-guide
description: Modélisation et requêtes MongoDB. Se déclenche avec "MongoDB", "Mongo", "NoSQL", "aggregation pipeline", "sharding", "replica set"
---

# MongoDB Guide

## Workflow
1. **Comprendre le domaine métier** — Analyser les entités, les relations et les patterns d'accès aux données pour orienter la modélisation (embedding vs referencing).
2. **Concevoir le schéma** — Appliquer les patterns de modélisation MongoDB (Subset, Computed, Bucket, Outlier, Extended Reference) selon les besoins de lecture et d'écriture.
3. **Optimiser les requêtes** — Construire des aggregation pipelines efficaces en plaçant $match et $project le plus tôt possible, et en utilisant les stages appropriés.
4. **Créer les index** — Définir les index simples, composés, multikey, text et géospatiaux en respectant la règle ESR (Equality, Sort, Range).
5. **Configurer le sharding** — Choisir la shard key optimale en analysant la cardinalité, la distribution et la fréquence des requêtes pour garantir un balancement uniforme.
6. **Mettre en place la réplication** — Configurer le replica set avec le nombre approprié de membres, les priorités et les tags pour la haute disponibilité et la lecture distribuée.
7. **Monitorer les performances** — Utiliser mongotop, mongostat, le profiler de base de données et les métriques Atlas pour identifier les opérations lentes.

## Règles
- Toujours modéliser en fonction des patterns d'accès, pas en fonction des relations entre entités comme en relationnel.
- Limiter la taille des documents embarqués pour rester sous la limite de 16 Mo et éviter la croissance non bornée des tableaux.
- Ne jamais utiliser $where ou des opérations JavaScript côté serveur en production pour des raisons de performance et de sécurité.
- Toujours valider le plan d'exécution avec explain("executionStats") avant de déployer une nouvelle requête ou un nouvel index.
- Prévoir une stratégie de migration de schéma progressive (versionning de documents) plutôt que des migrations destructives.


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
