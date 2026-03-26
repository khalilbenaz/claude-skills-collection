---
name: dev-unit-test-generator
description: Génère des tests unitaires complets pour tout langage et framework. Se déclenche avec "test unitaire", "unit test", "tester mon code", "jest", "xunit", "pytest", "mocha", "JUnit", "écrire des tests", "couverture de tests".
---

# Unit Test Generator

## Workflow
1. **Analyse du code à tester**
   - Identifier toutes les fonctions et méthodes publiques
   - Repérer les classes et leurs responsabilités
   - Cartographier les dépendances (imports, injections)
   - Détecter les side effects (I/O, mutations d'état, appels réseau)

2. **Identification des cas de test**
   - Happy path : comportement nominal attendu
   - Edge cases : valeurs limites, null, undefined, chaînes vides
   - Error cases : exceptions, erreurs métier, états invalides
   - Boundary values : min/max, zéro, nombres négatifs, tableaux vides

3. **Setup du framework de test adapté**
   - JavaScript/TypeScript : Jest ou Vitest avec ts-jest si nécessaire
   - .NET (C#) : xUnit avec FluentAssertions ou NUnit
   - Python : pytest avec pytest-mock et fixtures
   - Java : JUnit 5 avec Mockito et AssertJ

4. **Création des mocks et stubs**
   - Mocker les dépendances externes (repositories, services tiers)
   - Stubber les appels DB, API REST, systèmes de fichiers
   - Utiliser des spy pour vérifier les interactions
   - Configurer les valeurs de retour et les comportements simulés

5. **Écriture des tests avec pattern AAA**
   - **Arrange** : préparer les données, configurer les mocks
   - **Act** : appeler la méthode/fonction testée
   - **Assert** : vérifier le résultat, les effets de bord, les appels aux mocks
   - Un seul comportement par test, une seule assertion logique

6. **Tests paramétrés pour les variations de données**
   - xUnit : `[Theory]` + `[InlineData]` ou `[MemberData]`
   - pytest : `@pytest.mark.parametrize` avec liste de tuples
   - Jest/Vitest : `it.each` ou `test.each` avec tableau de cas
   - JUnit 5 : `@ParameterizedTest` + `@MethodSource`

7. **Vérification de la couverture**
   - Lignes couvertes : chaque ligne de code exécutée au moins une fois
   - Branches couvertes : chaque branche if/else, switch testée
   - Conditions booléennes : combinaisons true/false testées
   - Identifier les zones sans couverture et prioriser les tests manquants

8. **Refactoring des tests**
   - Appliquer le principe DRY avec des helpers et builders partagés
   - Utiliser des test fixtures pour l'initialisation commune
   - Nommer selon la convention `Should_X_When_Y` ou `méthode_état_résultat`
   - Regrouper les tests par classe/module dans des describe/TestClass dédiés

## Règles
- Adapte systématiquement le framework au langage et à l'environnement existant du projet.
- Fournis du code complet et exécutable, pas des squelettes ou des pseudocodes.
- Nomme chaque test de façon descriptive : `Should_ReturnNull_When_InputIsEmpty`.
- Ne teste pas les détails d'implémentation : teste les comportements observables.
- Un test doit être rapide, isolé, répétable, auto-vérifiant et simple (principes FIRST).
