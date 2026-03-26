---
name: dev-mobile-app-architect
description: Architecture d'applications mobiles (native, cross-platform, hybrid). Se déclenche avec "architecture mobile", "app mobile", "native vs cross-platform", "Flutter vs React Native", "MVVM", "Clean Architecture mobile", "offline first".
---

# Mobile App Architect

## Workflow
1. **Analyse des besoins** — Identifier les plateformes cibles (iOS, Android, web), le budget alloué, les exigences de performance (temps de démarrage, fluidité des animations, consommation batterie), la timeline et les compétences de l'équipe disponible.
2. **Choix technologique** — Comparer et justifier le choix parmi : natif iOS (Swift/SwiftUI), natif Android (Kotlin/Compose), Flutter (Dart, une seule codebase, performances proches du natif), React Native (JavaScript/TypeScript, écosystème JS), MAUI (.NET, pour les équipes C#) ou Kotlin Multiplatform (partage de la logique métier uniquement).
3. **Architecture pattern** — Sélectionner et documenter le pattern adapté : MVVM (séparation claire View/ViewModel/Model), MVI (flux unidirectionnel, états immuables), Clean Architecture (couches Use Cases/Repository/DataSource), BLoC (Flutter, événements et états explicites), ou Redux (state global prévisible).
4. **Gestion de la navigation** — Concevoir le système de navigation : stack navigation (push/pop), tab navigation (bottom bar, drawer), deep linking (URI schemes, Universal Links/App Links), routing typé et gestion des transitions entre écrans.
5. **State management** — Choisir la solution de gestion d'état selon le framework : Provider/Riverpod (Flutter), Redux Toolkit/Zustand/React Query (React Native), Combine/SwiftUI state wrappers (@State, @ObservedObject), ou StateFlow/LiveData avec ViewModel (Android).
6. **Data layer** — Concevoir la couche de données : stockage local (SQLite via Room/sqflite, Realm, Hive, Core Data), client API (Retrofit, Dio, URLSession), stratégie de cache (TTL, invalidation), synchronisation offline-first (conflict resolution, queue des mutations en attente).
7. **Sécurité mobile** — Intégrer les bonnes pratiques : certificate pinning (protection contre les MITM), secure storage (Keychain iOS, EncryptedSharedPreferences Android, flutter_secure_storage), authentification biométrique (Face ID, Touch ID, BiometricPrompt), obfuscation du code (ProGuard/R8, obfuscation Dart).
8. **CI/CD mobile** — Mettre en place le pipeline : Fastlane pour l'automatisation (tests, build, upload), code signing automatisé (match/Fastlane pour iOS, keystores pour Android), distribution bêta (TestFlight, Firebase App Distribution), déploiement App Store/Play Store avec release notes et versioning automatique.

## Règles
- Fournis du code complet et fonctionnel illustrant chaque décision d'architecture, avec des exemples concrets adaptés au framework choisi.
- Adapte les recommandations aux dernières versions stables des frameworks et des outils (Flutter 3.x, React Native 0.73+, Swift 5.9+, Kotlin 1.9+).
- Priorise la performance et l'UX : justifie chaque choix technique par son impact sur la fluidité, la consommation mémoire et la réactivité de l'interface.
- Mentionne systématiquement les alternatives et leurs compromis (trade-offs) pour permettre une décision éclairée selon le contexte du projet.
- En cas de besoin offline-first, détaille la stratégie de synchronisation, la résolution de conflits et la gestion des états de connectivité.
