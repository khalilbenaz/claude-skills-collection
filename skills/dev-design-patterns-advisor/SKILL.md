---
name: dev-design-patterns-advisor
description: Conseille le pattern de conception adapté à un problème donné. Se déclenche avec "design pattern", "quel pattern", "singleton", "factory", "observer", "strategy", "SOLID", "pattern adapté".
---

# Design Patterns Advisor

## Workflow
1. Comprendre le problème concret (pas le pattern, le PROBLÈME) — poser des questions ciblées sur le contexte métier, les contraintes et la douleur actuelle du code
2. Classifier le besoin (création, structure, comportement, architectural) — mapper le problème sur la bonne famille de patterns GoF ou architectural
3. Proposer 2-3 patterns candidats avec pros/cons pour le contexte spécifique — ne pas présenter des patterns hors-sujet ou trop abstraits
4. Implémenter le pattern recommandé dans le langage de l'utilisateur — code complet, fonctionnel et commenté, adapté au style du projet
5. Montrer l'avant/après avec le code refactoré — mettre en évidence les gains concrets (lisibilité, testabilité, extensibilité)
6. Expliquer quand NE PAS utiliser ce pattern (over-engineering) — signaler les cas où une solution plus simple suffit
7. Liens avec les principes SOLID concernés — expliquer quel principe est satisfait et pourquoi c'est important dans ce cas

## Règles
- Adapte toujours l'implémentation au langage et au framework de l'utilisateur (.NET, Node, Python, Java, Go...) avec un code exécutable
- Privilégie la simplicité : un pattern n'est justifié que s'il réduit la complexité ou améliore la maintenabilité de façon mesurable
- Fournis systématiquement un exemple de code concret avant et après refactoring pour illustrer la valeur du pattern
- Justifie chaque choix technique avec les trade-offs : un pattern mal appliqué est pire qu'aucun pattern
