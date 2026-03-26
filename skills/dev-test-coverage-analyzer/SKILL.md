---
name: dev-test-coverage-analyzer
description: Analyse et améliore la couverture de tests d'un projet. Se déclenche avec "couverture", "coverage", "code coverage", "branches non testées", "améliorer mes tests", "dead code", "mutation testing".
---

# Test Coverage Analyzer

## Workflow
1. **Configuration de l'outil de coverage**
   - JavaScript/TypeScript : Istanbul (nyc) ou c8 avec rapport lcov/html
   - .NET (C#) : coverlet avec `dotnet test --collect:"XPlat Code Coverage"`
   - Python : coverage.py avec `pytest --cov` et rapport HTML
   - Java : JaCoCo intégré via Maven/Gradle, rapport HTML et XML

2. **Exécution et collecte des métriques**
   - **Line coverage** : pourcentage de lignes exécutées par les tests
   - **Branch coverage** : chaque branche de condition (if/else, switch) couverte
   - **Function/method coverage** : toutes les fonctions appelées au moins une fois
   - **Statement coverage** : chaque instruction individuelle exécutée

3. **Analyse des zones non couvertes**
   - Identifier les fichiers avec moins de 60% de couverture ligne
   - Repérer les fonctions critiques business sans aucun test
   - Localiser les branches de gestion d'erreur jamais exercées
   - Distinguer le code testé du dead code réel (jamais appelé nulle part)

4. **Priorisation des efforts de test**
   - Couvrir en priorité le code à haute valeur business (paiement, auth, calculs)
   - Ne pas viser 100% aveuglément : le code de configuration ou de bootstrap est moins critique
   - Appliquer la règle 80/20 : 20% du code non testé représente 80% du risque
   - Ignorer explicitement le code généré automatiquement (migrations, scaffolding)

5. **Génération de tests pour les gaps identifiés**
   - Analyser le contexte de chaque zone non couverte
   - Écrire des tests ciblés pour les branches manquantes
   - Ajouter des tests pour les cas d'erreur et d'exception non testés
   - Vérifier après chaque ajout que la couverture progresse réellement

6. **Mutation testing pour valider la qualité des tests**
   - **Stryker** pour .NET et JavaScript : modifie le code et vérifie que les tests échouent
   - **mutmut** ou **cosmic-ray** pour Python
   - **PITest** pour Java avec intégration Maven/Gradle
   - Un score de mutation > 70% indique des tests de bonne qualité

7. **Configuration des seuils CI/CD**
   - Définir un minimum de coverage global (ex : 80% lines) bloquant le build
   - Configurer le diff coverage : ne pas baisser la couverture sur le nouveau code
   - Intégrer les rapports dans les pull requests (commentaires automatiques)
   - Alerter en cas de régression de coverage entre deux commits

8. **Rapport visuel et tendances**
   - Codecov ou Coveralls pour l'historique et les badges de couverture
   - SonarQube pour analyse complète (coverage + code smells + duplication)
   - Dashboards de couverture par module pour identifier les zones à risque
   - Suivre l'évolution dans le temps pour détecter les régressions progressives

## Règles
- Adapte les outils de coverage au langage et au système de build du projet.
- Fournis des commandes complètes et exécutables pour générer les rapports.
- Priorise le coverage des comportements critiques, pas la maximisation du chiffre.
- Le mutation testing est la seule vraie mesure de la qualité des assertions de tests.
- Configure toujours des seuils CI/CD pour maintenir la couverture dans le temps.
