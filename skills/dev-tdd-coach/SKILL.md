---
name: dev-tdd-coach
description: Guide la pratique du Test-Driven Development pas à pas. Se déclenche avec "TDD", "test driven", "red green refactor", "écrire le test d'abord", "BDD", "behaviour driven", "outside-in TDD".
---

# TDD Coach

## Workflow
1. **Comprendre la feature à implémenter**
   - Lire et analyser la user story ou le ticket avec les critères d'acceptation
   - Identifier les comportements attendus (inputs/outputs, cas d'erreur)
   - Décomposer la feature en petits incréments testables indépendamment
   - Choisir par quel comportement commencer (le plus simple ou le plus central)

2. **Écrire le premier test — RED**
   - Écrire un test qui décrit le comportement attendu avant tout code de production
   - Le test doit échouer pour la bonne raison (pas une erreur de compilation)
   - Nommer le test de façon expressive : `Should_ReturnTotal_When_CartHasItems`
   - Résister à la tentation d'écrire plusieurs tests à la fois

3. **Implémenter le minimum pour passer le test — GREEN**
   - Écrire le code de production le plus simple possible pour faire passer le test
   - Ne pas anticiper les futurs besoins : implémenter uniquement ce que le test demande
   - Accepter temporairement du code naïf ou hard-codé si cela suffit
   - Vérifier que tous les tests précédents passent encore (non-régression)

4. **Refactorer le code — REFACTOR**
   - Améliorer la lisibilité, supprimer la duplication, clarifier les noms
   - Extraire des méthodes ou des classes si la logique le justifie
   - Ne modifier aucun comportement observable : les tests restent verts
   - Refactorer aussi les tests si nécessaire (DRY, lisibilité, fixtures)

5. **Itérer vers le prochain comportement**
   - Relire les critères d'acceptation et choisir le prochain comportement à tester
   - Recommencer le cycle RED → GREEN → REFACTOR
   - Chaque cycle dure idéalement 2 à 10 minutes
   - Committer à chaque cycle GREEN stable pour conserver un historique propre

6. **Techniques avancées de TDD**
   - **Outside-in TDD** : partir du test d'acceptation haut niveau, descendre vers les unités
   - **Chicago school (classique)** : tester le résultat, favoriser les vraies collaborations
   - **London school (mockiste)** : mocker toutes les dépendances, tester les interactions
   - **Double loop TDD** : boucle externe BDD (acceptance test) + boucle interne TDD (unit)

7. **BDD avec Gherkin**
   - Rédiger les scénarios en langage naturel : `Given / When / Then`
   - .NET : SpecFlow avec step definitions en C# et living documentation
   - Java : Cucumber avec step definitions en Java ou Kotlin
   - JavaScript : Cucumber.js ou Playwright avec syntaxe BDD
   - Impliquer les parties prenantes non-techniques dans la rédaction des scénarios

8. **Katas d'entraînement recommandés**
   - **FizzBuzz** : kata d'introduction, conditions et boucles simples
   - **String Calculator** : addition progressive, gestion des cas spéciaux
   - **Bowling Game** : logique métier complexe, bon pour pratiquer le refactoring
   - **Roman Numerals** : conversion de nombres, découverte de patterns progressifs
   - **Bank Account** : CQRS simple, événements, gestion d'état

## Règles
- Respecte strictement l'ordre RED → GREEN → REFACTOR, sans sauter d'étapes.
- Fournis le code complet de chaque étape du cycle pour l'exemple donné.
- Ne laisse jamais un test en échec plus longtemps que nécessaire.
- Les tests sont la documentation vivante du comportement attendu du système.
- Adapte le style (London vs Chicago, BDD vs TDD pur) au contexte et à l'équipe.
