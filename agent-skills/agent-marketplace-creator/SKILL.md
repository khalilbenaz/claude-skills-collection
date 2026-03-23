---
name: agent-marketplace-creator
description: Création de marketplaces et registres d'agents IA réutilisables et partageables. Se déclenche avec "marketplace agent", "agent store", "agent registry", "partager agent", "distribuer agent", "agent template", "agent catalog", "agent as a service", "skill marketplace".
---

# Agent Marketplace Creator

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois créer une plateforme de distribution d'agents IA — qu'il s'agisse d'un registre interne d'entreprise, d'un marketplace public, d'une bibliothèque de templates réutilisables ou d'une place de marché avec monétisation. Il couvre l'architecture technique, la gouvernance, la découverte et la distribution des agents.

## Workflow

1. **Architecture du marketplace** — Concevoir les composants fondamentaux : Registry (base de données des agents avec métadonnées), Versioning (gestion des versions et compatibilité), Discovery (moteur de recherche et recommandation), Deployment (infrastructure d'exécution des agents), Billing (facturation et quotas). Choisir entre architecture centralisée (contrôle total, déploiement simplifié) ou fédérée (agents hébergés chez leurs créateurs, marketplace comme couche de découverte).

2. **Packaging des agents** — Définir un format de packaging standardisé pour tous les agents du marketplace. Structure minimale : `agent.yaml` (métadonnées, version, dépendances), `system_prompt.md` (instructions de l'agent), `tools.json` (outils requis et leurs configs), `config.schema.json` (paramètres configurables), `README.md` (documentation utilisateur), `tests/` (suite de tests fournie par le créateur). Publier un SDK pour faciliter la création de packages conformes.

3. **Découverte des agents** — Implémenter un moteur de découverte multi-dimensionnel : recherche full-text sur nom, description et tags, filtres par catégorie (productivité, données, communication, code, etc.), tri par popularité/rating/date, recommandations personnalisées basées sur l'historique d'usage, agents similaires ("voir aussi"). Indexer les agents avec un moteur comme Elasticsearch ou Typesense pour des recherches rapides et pertinentes.

4. **Versionnage et compatibilité** — Appliquer le semantic versioning (MAJOR.MINOR.PATCH) : MAJOR pour les changements d'API incompatibles, MINOR pour les nouvelles fonctionnalités rétrocompatibles, PATCH pour les corrections. Maintenir des guides de migration entre versions majeures. Définir une politique de deprecation (annonce 90 jours avant, support 6 mois après). Tester la compatibilité ascendante automatiquement dans la CI du marketplace.

5. **Configuration et customisation** — Permettre aux utilisateurs de personnaliser les agents via un schéma de configuration validé : paramètres déclarés dans `config.schema.json` (type, valeurs par défaut, description, validation), secrets gérés séparément via un vault, sélection du modèle LLM (si l'agent supporte plusieurs modèles), tuning comportemental (niveau de verbosité, langue, ton). Fournir une UI de configuration avec validation temps réel.

6. **Options de déploiement** — Offrir plusieurs modes d'accès selon les besoins : Managed (le marketplace héberge et exécute l'agent, zero-ops pour l'utilisateur), Self-hosted (package exportable pour déploiement dans l'infrastructure utilisateur), API endpoint (l'agent est exposé comme une API REST/streaming), Embedded (SDK pour intégrer l'agent dans une application existante). Documenter clairement les trade-offs de chaque option.

7. **Authentification et autorisation** — Implémenter un système d'accès robuste : API keys pour l'accès programmatique, OAuth2 pour l'intégration dans des applications tierces, gestion des tiers d'usage (free, pro, enterprise) avec rate limiting par tier, contrôle d'accès aux agents privés ou en beta, audit log de tous les accès. Séparer clairement l'authentification du créateur d'agent (publication) de celle de l'utilisateur final (consommation).

8. **Facturation et monétisation** — Proposer des modèles économiques flexibles : Pay-per-use (facturation à l'appel ou au token), Subscription (accès illimité mensuel/annuel), Freemium (quota gratuit + limite payante), Revenue sharing (créateurs perçoivent un % des revenus générés par leurs agents). Intégrer Stripe pour la facturation, implémenter des webhooks pour les événements de facturation, fournir des tableaux de bord de revenus aux créateurs.

9. **Assurance qualité** — Définir un processus de validation avant publication : review automatique (lint du package, validation du schema, tests fournis passants, scan de sécurité des prompts), review manuelle pour les agents avec accès aux données sensibles ou niveaux de permission élevés, benchmarks de performance obligatoires (latence, précision sur dataset standard), security audit pour les agents en accès entreprise. Maintenir un score de qualité public par agent.

10. **Communauté** — Construire l'écosystème autour du marketplace : système de notation et reviews utilisateurs (1-5 étoiles, commentaires), issues et bug reports publics ou privés selon la politique du créateur, fork d'agents existants pour créer des variantes, documentation collaborative (wiki), programme de certification pour les agents de haute qualité, leaderboard des créateurs les plus actifs. Animer la communauté via des newsletters, webinaires et hackathons.

## Règles

- **Standardisation non négociable** : tout agent publié doit strictement respecter le format de packaging défini. Aucune exception pour les cas particuliers — préférer enrichir le standard plutôt que de créer des dérogations qui fragilisent l'écosystème.
- **Sécurité par défaut** : tous les agents du marketplace sont exécutés dans des sandboxes isolées. Les accès aux ressources externes (internet, fichiers, APIs tierces) doivent être déclarés explicitement dans le manifeste et approuvés par l'utilisateur.
- **Transparence des coûts** : afficher clairement le coût estimé par appel (ou par usage typique) pour chaque agent, en incluant les coûts LLM sous-jacents. Les utilisateurs ne doivent jamais avoir de surprise sur leur facture.
- **Propriété intellectuelle claire** : la licence de chaque agent doit être déclarée explicitement (MIT, Apache 2.0, commercial, propriétaire). Le marketplace doit vérifier que les agents ne réutilisent pas du code ou des prompts sans autorisation appropriée.
- **Observabilité pour les créateurs** : fournir aux créateurs d'agents des métriques détaillées sur l'usage de leurs agents (appels, erreurs, latence, satisfaction) pour leur permettre d'améliorer continuellement leurs créations. Sans données, il n'y a pas d'amélioration possible.
