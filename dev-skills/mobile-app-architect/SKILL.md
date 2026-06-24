---
name: mobile-app-architect
description: Architecture d'applications mobiles (native, cross-platform, hybrid). Se déclenche avec "architecture mobile", "app mobile", "native vs cross-platform", "Flutter vs React Native", "MVVM", "Clean Architecture mobile", "offline first".
---

# Mobile App Architect

## Workflow

### 1. Qualifier le besoin avant de choisir un framework

Poser ces questions avant toute décision :

| Critère | Impact |
|---|---|
| Plateformes cibles | iOS seul → Swift/SwiftUI ; Android seul → Kotlin/Compose ; les deux → cross-platform |
| Animations custom & jeux | Natif ou Flutter (Impeller) ; React Native acceptable avec Skia |
| Accès hardware spécifique (BLE, NFC, ARKit) | Natif de préférence ; sinon plugin Flutter/RN à vérifier avant de committer |
| Taille équipe / compétences | Équipe JS → React Native ; équipe C# → MAUI ; équipe polyvalente → Flutter |
| Time-to-market | Cross-platform réduit ~30-40 % du temps pour les apps "standard" |
| Performance critique (<16 ms frames) | Flutter (Dart AOT) ou natif ; React Native avec JSI+Fabric acceptable |

---

### 2. Choisir la stack technologique

**Matrice de décision rapide (2026) :**

```
Native iOS   → Swift 6 + SwiftUI 5 + Combine/Swift Concurrency
Native Android → Kotlin 2 + Jetpack Compose 1.7 + Coroutines + Flow
Flutter      → Dart 3 + Flutter 3.22+ + Riverpod 2 + Impeller (default)
React Native → RN 0.75+ + Expo SDK 52 + New Architecture (Fabric+JSI) activée
KMP          → Kotlin Multiplatform + Compose Multiplatform (UI partagée si besoin)
MAUI         → .NET 9 + MAUI pour équipes C# existantes
```

**Règle empirique :**
- App vitrine / catalogue / dashboard → Flutter ou RN, gain de temps net
- App fintech / bancaire critique → natif par plateforme ou KMP (logique partagée, UI native)
- App déjà en Swift/Kotlin → ajouter KMP plutôt que réécrire

---

### 3. Architecturer les couches (Clean Architecture mobile)

Structure recommandée (indépendante du framework) :

```
presentation/
  screens/         ← UI pure, aucune logique métier
  viewmodels/      ← expose des états immuables à la vue
domain/
  usecases/        ← une classe = une action métier
  entities/        ← modèles purs sans annotations framework
  repositories/    ← interfaces uniquement
data/
  repositories/    ← implémentations concrètes
  datasources/
    remote/        ← API REST/GraphQL/gRPC
    local/         ← Room, sqflite, Core Data, SQLDelight
  models/          ← DTOs + mappers vers entities
```

**Pattern par framework :**

| Framework | Pattern recommandé | Alternative |
|---|---|---|
| Flutter | BLoC 8+ ou Riverpod 2 | Provider (legacy) |
| React Native | Zustand + React Query | Redux Toolkit |
| SwiftUI | MVVM + @Observable (iOS 17) | TCA (The Composable Architecture) |
| Jetpack Compose | MVVM + ViewModel + StateFlow | MVI avec Orbit/MoleculeFlow |

**Exemple Flutter (Riverpod + UseCase) :**
```dart
// domain/usecases/get_transactions.dart
class GetTransactions {
  final TransactionRepository _repo;
  const GetTransactions(this._repo);
  Future<List<Transaction>> call(String accountId) => _repo.fetch(accountId);
}

// presentation/providers/transactions_provider.dart
@riverpod
Future<List<Transaction>> transactions(Ref ref, String accountId) {
  return ref.watch(getTransactionsProvider).call(accountId);
}
```

---

### 4. Navigation et deep linking

```dart
// Flutter — GoRouter 14+ (type-safe routes)
@TypedGoRoute<HomeRoute>(path: '/')
class HomeRoute extends GoRouteData {
  const HomeRoute();
  Widget build(BuildContext context, GoRouterState state) => const HomeScreen();
}

// Deep link universel : https://app.example.com/payment/42
// → GoRouter intercepte via flutter_branch_io ou firebase_dynamic_links
```

```swift
// SwiftUI — NavigationStack (iOS 16+)
NavigationStack(path: $path) {
    ContentView()
        .navigationDestination(for: Route.self) { route in
            switch route {
            case .payment(let id): PaymentDetailView(id: id)
            }
        }
}
```

---

### 5. Data layer : offline-first

Stratégie en 4 temps :

1. **Lecture** → SQLite local en source de vérité ; réseau en refresh asynchrone (stale-while-revalidate)
2. **Écriture** → file de mutations offline (Drift/Room + worker background)
3. **Sync** → résolution de conflits : Last-Write-Wins par défaut, CRDT si collaboration temps réel
4. **Connectivité** → surveiller `connectivity_plus` (Flutter) / `NetInfo` (RN) pour déclencher la sync

```kotlin
// Android — Room + WorkManager (offline queue)
@Entity data class PendingOperation(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val payload: String,   // JSON sérialisé
    val retries: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
```

---

### 6. Sécurité mobile — checklist actionnable

- [ ] **Certificate pinning** : `dio` + `http_certificate_pinning` (Flutter) / TrustKit (iOS) / OkHttp CertificatePinner (Android)
- [ ] **Secure storage** : `flutter_secure_storage` / `KeyStore` Android / Keychain iOS — jamais SharedPreferences/UserDefaults pour tokens
- [ ] **Biométrie** : `local_auth` (Flutter) — toujours fallback PIN, jamais bloquer l'accès
- [ ] **Obfuscation** : `flutter build apk --obfuscate --split-debug-info=./debug` ; ProGuard/R8 activé en release Android
- [ ] **Jailbreak/root detection** : `flutter_jailbreak_detection` — adapter la réponse (désactiver features sensibles, ne pas crasher)
- [ ] **Pas de secrets dans le code** : `.env` via `flutter_dotenv`, jamais committé ; secrets injectés en CI via Secrets Manager

---

### 7. Performance — points de contrôle critiques

```bash
# Flutter — profiling
flutter run --profile
flutter pub run flutter_launcher_icons  # vérifier tailles
# DevTools → Timeline, Memory, CPU Profiler

# React Native — Hermes + Flipper
npx react-native start --experimental-debugger
# Activer Hermes dans android/app/build.gradle : hermesEnabled = true
```

Cibles 2026 :
- Startup à froid < 2 s (budget : splash → premier frame interactif)
- Frame budget : 16 ms (60 fps) / 8 ms (120 fps — iPad Pro, Pixel 9)
- APK/IPA < 30 MB pour le premier install ; assets en lazy loading

---

### 8. CI/CD mobile

```yaml
# GitHub Actions — Flutter
- uses: subosito/flutter-action@v2
  with: { flutter-version: '3.22.x', channel: 'stable' }
- run: flutter test --coverage
- run: flutter build appbundle --release --obfuscate --split-debug-info=./debug-symbols
- uses: r0adkll/upload-google-play@v1   # deploy Play Store
```

```ruby
# Fastlane — iOS
lane :beta do
  match(type: "appstore")           # certificates via git repo chiffré
  build_ios_app(scheme: "MyApp")
  upload_to_testflight
  slack(message: "Beta #{lane_context[SharedValues::BUILD_NUMBER]} uploadé")
end
```

Versioning automatique :
```bash
# Incrémenter build number depuis le numéro de run CI
VERSION_CODE=$GITHUB_RUN_NUMBER
flutter build apk --build-number=$VERSION_CODE
```

---

## Anti-patterns à éviter

| Anti-pattern | Pourquoi c'est un problème | Correction |
|---|---|---|
| Logique métier dans les Widgets/Views | Impossible à tester, couplage fort | Extraire dans ViewModel/UseCase |
| setState() global dans Flutter | Re-renders inutiles, performance | Riverpod/BLoC scoped |
| Appels réseau sans retry/timeout | UX cassée sur réseau mobile instable | Dio interceptors + retry package |
| Tokens JWT en clair dans AsyncStorage | Vol trivial via backup ADB | Secure Storage obligatoire |
| Gros monorepo sans lazy imports | Startup time > 4 s | Code splitting + deferred loading |
| Navigation par routes string | Erreurs silencieuses à runtime | Routes typées (GoRouter, TCA Router) |
| Tests uniquement sur simulateur | Ne détecte pas les régressions perf réelles | Firebase Test Lab / AWS Device Farm |

---

## Bonnes pratiques 2026

- **Swift 6 strict concurrency** : activer `SWIFT_STRICT_CONCURRENCY = complete` dès le départ, évite les data races
- **Compose Multiplatform** : stable pour iOS depuis fin 2024, viable pour les apps non-critique en perf
- **Expo EAS** : remplace Fastlane pour React Native dans la majorité des projets (build cloud, OTA updates)
- **Impeller (Flutter)** : activé par défaut sur Android depuis Flutter 3.22 — profiler avec `flutter run --profile` si régressions
- **Privacy manifests (iOS 17+)** : obligatoire pour toute soumission App Store — déclarer chaque API accédant aux données utilisateur
- **AGP 8+ / Gradle 8+** : activer `nonTransitiveRClass = true` et `enableR8FullMode = true` pour réduire la taille APK
