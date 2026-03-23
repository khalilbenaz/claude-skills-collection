---
name: clean-architecture-guide
description: Guide d'implémentation de la Clean Architecture et Architecture Hexagonale. Se déclenche avec "clean architecture", "architecture hexagonale", "ports and adapters", "onion architecture", "séparation des couches", "dependency inversion".
---

# Clean Architecture Guide

## Workflow
1. Explication des couches (Entities → Use Cases → Interface Adapters → Frameworks) — visualiser le diagramme en cercles concentriques et la règle de dépendance fondamentale
2. Définition du domaine (entities, value objects, domain events) — modéliser les concepts métier purs, sans aucune dépendance vers des frameworks ou des bibliothèques externes
3. Implémentation des use cases (application services, DTOs, command/query) — chaque use case est un service applicatif avec une seule responsabilité et des interfaces claires
4. Création des ports (interfaces) et adapters (implémentations) — les ports définissent les contrats dans le domaine, les adapters implémentent les détails techniques à l'extérieur
5. Configuration de l'injection de dépendances (DI container) — assembler l'application à la couche la plus externe (Composition Root) sans polluer le domaine
6. Structuration des dossiers du projet selon l'architecture — organiser par couche ou par feature selon la taille du projet, avec des conventions claires
7. Tests par couche (unit pour le domaine, integration pour les adapters) — le domaine doit être testable en isolation totale, sans base de données ni HTTP
8. Appliquer la règle de dépendance sans exception : les couches internes ne dépendent JAMAIS des couches externes — toute violation est un défaut d'architecture à corriger immédiatement

## Règles
- Adapte la structure au langage de l'utilisateur (.NET, Node, Python, Java, Go...) avec une arborescence de projet concrète et des exemples de code fonctionnels
- Privilégie la simplicité : une Clean Architecture complète n'est justifiée que pour des projets à longue durée de vie et à logique métier complexe
- Fournis toujours des exemples de code concrets pour chaque couche, illustrant les interfaces, les implémentations et les tests associés
- Justifie chaque décision de structuration avec les bénéfices concrets (testabilité, évolutivité, indépendance des frameworks)
