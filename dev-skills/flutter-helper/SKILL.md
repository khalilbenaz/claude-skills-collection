---
name: flutter-helper
description: Aide au développement Flutter/Dart avec bonnes pratiques et patterns. Se déclenche avec "Flutter", "Dart", "Widget", "BLoC", "Riverpod", "Provider", "pub.dev", "MaterialApp", "flutter build".
---

# Flutter Helper

## Workflow
1. **Structure du projet** — Organiser le projet selon une approche feature-first (dossiers par fonctionnalité : auth/, profile/, home/) ou layer-first (lib/data/, lib/domain/, lib/presentation/). Configurer la modularisation via des packages Dart internes, le pubspec.yaml et les imports relatifs vs absolus (package imports).
2. **Widgets optimisés** — Concevoir les widgets avec les bonnes pratiques : préférer StatelessWidget quand l'état est externe, utiliser const constructors pour éviter les rebuilds inutiles, favoriser la composition de petits widgets plutôt que l'héritage, et employer InheritedWidget ou des hooks pour le contexte partagé.
3. **State management** — Choisir et implémenter la solution adaptée à la complexité : Provider (simple, recommandé pour petits projets), Riverpod (Provider 2.0, type-safe, testable, recommandé pour projets moyens à grands), BLoC/Cubit (flux unidirectionnel explicite, idéal pour logique métier complexe), GetX (tout-en-un, simple mais moins maintenable à grande échelle).
4. **Navigation** — Implémenter la navigation moderne : GoRouter (routing déclaratif, deep linking, nested routes, guards d'authentification), auto_route (génération de code, routes typées), ou Navigator 2.0 natif pour les cas complexes. Configurer les deep links (scheme URI, Universal Links) et la gestion du back stack.
5. **Networking et data** — Configurer la couche réseau avec Dio (interceptors, retry, logging) ou http basique, générer les modèles avec freezed (immutabilité, copyWith, pattern matching) et json_serializable (sérialisation automatique), et Retrofit pour les clients REST typés.
6. **Testing Flutter** — Écrire des tests à tous les niveaux : unit tests (logique pure, BLoC/Cubit, use cases), widget tests (rendu des composants, interactions utilisateur, pump/pumpAndSettle), golden tests (comparaison visuelle pixel-perfect), integration tests (Patrol ou flutter_test sur device), et mocking avec mockito ou mocktail.
7. **Performance** — Optimiser les performances : utiliser const où possible, éviter les rebuilds avec Consumer/Selector ciblés, implémenter le lazy loading (ListView.builder, SliverList), gérer le cache d'images (cached_network_image), déporter les traitements lourds dans des Isolates (compute()), et profiler avec Flutter DevTools (Widget Inspector, Performance overlay).
8. **Déploiement** — Configurer les flavors (dev/staging/prod) via dart-define ou flutter_config, gérer le code signing (Keychain iOS, keystores Android), automatiser avec Fastlane (gym pour iOS, supply pour Android), configurer les métadonnées et captures d'écran pour le Play Store et l'App Store, et mettre en place le versioning automatique du pubspec.yaml.

## Règles
- Fournis du code Dart/Flutter complet et fonctionnel, avec les imports nécessaires et les dépendances pubspec correspondantes.
- Adapte les exemples aux dernières versions stables de Flutter (3.x) et des packages recommandés (Riverpod 2.x, GoRouter 12.x, freezed 2.x).
- Priorise la performance et l'UX : signale toujours les risques de rebuilds excessifs et propose des optimisations concrètes.
- Mentionne les alternatives de state management avec leurs cas d'usage pour guider le choix selon la taille et la complexité du projet.
- En cas d'erreur ou de bug Flutter signalé, demande le message d'erreur complet et la version Flutter avant de proposer une solution.
