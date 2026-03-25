---
name: mock-designer
description: Conception de mocks, stubs et fakes pour les tests unitaires et d'intégration avec les principaux frameworks de mocking. Se déclenche avec "mock", "stub", "fake", "Moq", "NSubstitute", "Mockito", "jest.mock", "test double"
---

# Mock Designer

## Workflow
1. **Identifier les dépendances à simuler** — Analyser le code sous test pour repérer les dépendances externes (bases de données, APIs, systèmes de fichiers, services tiers). Déterminer le type de test double approprié : mock, stub, fake ou spy.
2. **Choisir le framework de mocking** — Sélectionner l'outil adapté au langage : Moq ou NSubstitute pour .NET, Mockito pour Java, jest.mock ou sinon pour JavaScript/TypeScript, unittest.mock pour Python. Configurer le framework dans le projet.
3. **Concevoir les stubs pour les données** — Créer des stubs qui retournent des données prédéfinies pour isoler le comportement du code sous test. Définir les valeurs de retour pour chaque scénario (succès, erreur, cas limites).
4. **Implémenter les mocks avec vérifications** — Configurer les mocks pour vérifier les interactions : nombre d'appels, arguments passés, ordre d'appel. Utiliser `Verify()` (Moq), `verify()` (Mockito) ou `expect().toHaveBeenCalledWith()` (Jest).
5. **Créer des fakes pour les tests d'intégration** — Développer des implémentations in-memory (repositories, caches, file systems) pour les tests d'intégration légers. Implémenter les mêmes interfaces que les dépendances réelles.
6. **Gérer les scénarios d'erreur** — Configurer les test doubles pour simuler les exceptions, timeouts, réponses HTTP en erreur et états incohérents. Vérifier que le code sous test gère correctement ces cas.
7. **Organiser et réutiliser les test doubles** — Centraliser les builders et factories de mocks dans des fichiers partagés. Utiliser le pattern Builder pour créer des configurations de mocks lisibles et réutilisables.

## Règles
- Ne mocker que les dépendances externes et les frontières du système ; ne jamais mocker le code sous test lui-même ni les value objects.
- Préférer les stubs aux mocks quand seule la valeur de retour importe ; réserver les mocks avec vérification aux cas où l'interaction est le comportement à tester.
- Limiter le nombre de mocks par test à 2-3 maximum ; un excès de mocks signale un couplage excessif dans le code de production.
- Toujours vérifier que les interfaces mockées correspondent aux contrats réels ; mettre à jour les mocks quand les interfaces évoluent.
- Éviter les mocks partiels (partial mocks) qui testent un mélange de code réel et simulé, source fréquente de faux positifs.
