---
name: agent-testing-framework
description: Framework de test complet pour agents IA — tests unitaires, d'intégration, de bout en bout et adversariaux. Se déclenche avec "tester agent", "agent testing", "test agent IA", "agent CI/CD", "agent regression", "quality assurance agent", "agent test suite".
---

# Agent Testing Framework

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois mettre en place une stratégie de test pour un agent IA, détecter des régressions après modification de prompts ou de logique, ou intégrer la qualité agent dans une pipeline CI/CD. Il s'applique aussi bien aux agents simples qu'aux architectures multi-agents complexes.

## Workflow

1. **Stratégie de test** — Construire la pyramide de tests adaptée aux agents : unit (fonctions isolées) → integration (chaînes d'outils) → E2E (conversations complètes) → adversarial (robustesse). Définir les objectifs de couverture, les seuils de qualité et les métriques clés (précision, latence, coût par appel).

2. **Tests unitaires** — Tester chaque composant isolément : fonctions de parsing, templates de prompts, transitions d'état, logique de routing. Utiliser `pytest` ou `jest` avec des entrées/sorties déterministes. Exemple : vérifier que `parse_tool_call(raw_output)` extrait correctement les arguments sans appel LLM réel.

3. **Tests d'intégration** — Valider les chaînes d'outils, la persistance d'état et les flux multi-étapes. Mocker le LLM pour injecter des réponses contrôlées. Tester la combinaison `retrieval → LLM → action` en vérifiant que chaque maillon passe correctement l'information au suivant.

4. **Tests E2E** — Exécuter des scénarios de conversation complets sur des golden datasets : paires (input utilisateur → output attendu). Évaluer les sorties avec des métriques sémantiques (BLEU, BERTScore, LLM-as-judge). Couvrir les happy paths, les cas limites et les flux de récupération d'erreur.

5. **Snapshot testing** — Enregistrer les sorties de référence pour chaque scénario critique. À chaque modification, comparer les nouvelles sorties aux snapshots via diff sémantique plutôt que textuel. Alerter si la divergence dépasse un seuil configurable. Utiliser des outils comme `pytest-snapshot` ou `Braintrust`.

6. **Tests adversariaux** — Tester la robustesse face aux prompt injections, aux entrées inattendues, aux requêtes hors-domaine et aux tentatives de manipulation. Construire un corpus d'attaques connues. Mesurer le taux de résistance et les comportements de fallback. Documenter les vulnérabilités identifiées.

7. **Mocking LLM** — Implémenter un système de cassettes (record/replay) pour capturer les vraies réponses LLM en mode "record", puis les rejouer en mode "replay" pour des tests déterministes et économiques. Bibliothèques utiles : `VCR.py`, `respx`, ou un mock custom via `unittest.mock`. Gérer le versionnage des cassettes.

8. **Intégration CI/CD** — Configurer les quality gates dans GitHub Actions, GitLab CI ou Jenkins : tests unitaires bloquants, tests d'intégration sur PR, tests E2E en nightly. Définir des seuils : score de qualité minimum 85 %, latence P95 < 3 s, coût par test < 0,01 $. Bloquer le merge si un gate échoue.

9. **Gestion de la flakiness** — Traiter le non-déterminisme LLM avec des comparaisons sémantiques plutôt qu'exactes. Définir des tolérances par dimension (exactitude factuelle stricte vs style libre). Implémenter des retries avec backoff pour les appels LLM réels. Identifier et isoler les tests structurellement instables.

10. **Reporting** — Générer des rapports de test avec score de qualité agrégé, tendances dans le temps, analyse des échecs et couverture des scénarios. Intégrer dans le dashboard de monitoring (Grafana, Datadog). Envoyer des alertes de régression à l'équipe. Maintenir un changelog des évolutions de qualité.

## Règles

- **Déterminisme d'abord** : tout test qui appelle un vrai LLM est un test d'intégration, jamais un test unitaire. Mocker systématiquement pour les tests unitaires et la majorité des tests d'intégration.
- **Golden datasets versionnés** : les datasets de test doivent être versionnés dans git au même titre que le code. Toute modification du dataset constitue un changement de contrat documenté.
- **Évaluation sémantique** : ne jamais comparer les sorties LLM par égalité exacte de chaînes — utiliser des métriques sémantiques, des LLM-as-judge ou des regex bien définis pour les structures attendues.
- **Tests adversariaux obligatoires** : tout agent exposé à des utilisateurs externes doit passer une batterie adversariale documentée avant la mise en production. Les vulnérabilités non bloquantes doivent figurer dans le changelog.
- **Prioriser la maintenabilité** : préférer 20 tests bien conçus et stables à 200 tests fragiles. Chaque test doit avoir un nom explicite, une assertion claire et un message d'échec informatif.
