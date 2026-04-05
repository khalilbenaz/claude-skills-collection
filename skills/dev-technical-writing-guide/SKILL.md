---
name: dev-technical-writing-guide
description: Rédaction technique claire pour documentation, ADR et RFC. Se déclenche avec "documentation technique", "technical writing", "rédiger une doc", "ADR", "RFC", "architecture decision record", "comment documenter", "README".
---

# Technical Writing Guide

## Workflow

1. **Identifier l'audience** : Déterminer qui lira le document (développeurs, ops, management, utilisateurs finaux). Adapter le niveau de détail, le vocabulaire et la structure en conséquence. Un README pour devs peut être technique ; une doc pour utilisateurs finaux doit être simple et guidée.

2. **Structurer le document** : Appliquer une structure claire selon le type : titre explicite, contexte (pourquoi ce doc existe), problème adressé, solution proposée, alternatives envisagées, conséquences et décisions prises. Utiliser des titres hiérarchiques (H1 → H2 → H3).

3. **Rédiger un README efficace** : Inclure les badges (CI status, coverage, version), une description courte, les prérequis, les étapes d'installation pas-à-pas, des exemples d'usage concrets, la référence API, un guide de contribution (CONTRIBUTING.md) et la licence. Le README est la vitrine du projet.

4. **Créer des Architecture Decision Records (ADR)** : Format standard : titre numéroté (ADR-001), statut (proposed/accepted/deprecated/superseded), contexte (situation actuelle), décision prise, conséquences (avantages et inconvénients). Stocker dans `/docs/adr/`. Lier les ADR entre eux quand ils se succèdent.

5. **Documenter les APIs** : Couvrir chaque endpoint avec méthode HTTP, URL, paramètres (path, query, body), exemples de requête/réponse, codes d'erreur détaillés, mécanismes d'authentification et rate limits. Préférer OpenAPI/Swagger pour la génération automatique et la testabilité.

6. **Intégrer des diagrammes** : Utiliser le modèle C4 (Context, Containers, Components, Code) pour l'architecture. Ajouter des sequence diagrams pour les flux complexes, des flowcharts pour les algorithmes, des ERD pour les bases de données. Outils recommandés : Mermaid (intégré GitHub/GitLab), PlantUML, draw.io. Versionner les sources des diagrammes, pas seulement les images.

7. **Garantir style et clarté** : Phrases courtes (max 20 mots). Voix active ("Le service envoie une requête" vs "Une requête est envoyée"). Définir tout terme technique à sa première occurrence. Ajouter des exemples concrets et des cas d'usage réels. Éviter le jargon inutile. Relire à voix haute pour détecter les formulations lourdes.

8. **Assurer la maintenance** : Adopter docs-as-code (documentation dans le même repo que le code). Versionner avec le code. Ajouter des checks automatiques (liens cassés, orthographe, freshness). Définir un owner par document. Planifier des revues périodiques (tous les 3-6 mois). Marquer les docs obsolètes clairement avec une bannière et un lien vers la version à jour.

## Règles

- **Commencer par l'audience** : Toujours demander "Qui va lire ça ?" avant d'écrire une ligne. La forme suit le lecteur cible.
- **Docs-as-code obligatoire** : La documentation vit dans le même repo que le code, versionnée avec Git, reviewée en PR. Pas de wikis isolés sans lien au code.
- **Exemples avant tout** : Chaque concept abstrait doit être illustré par un exemple concret. Les développeurs apprennent par l'exemple.
- **Un document = une responsabilité** : Chaque doc a un owner nommé, responsable de sa maintenance et de sa fraîcheur. Sans owner, la doc se dégrade.
- **Templates prêts à l'emploi** : Fournir des templates pour ADR, RFC, README, runbook et post-mortem pour standardiser la qualité sans effort.


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
