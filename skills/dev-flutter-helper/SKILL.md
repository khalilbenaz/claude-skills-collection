---
name: dev-flutter-helper
description: Aide au développement Flutter/Dart avec bonnes pratiques, patterns, snippets copiables et diagnostics d'erreurs. Se déclenche avec "Flutter", "Dart", "Widget", "BLoC", "Riverpod", "Provider", "pub.dev", "MaterialApp", "flutter build". Also triggers on "Flutter app", "Dart widget", "Flutter state management".
---

# Flutter Helper

## 1. Diagnostic initial

Avant tout, collecter :
- `flutter --version` → version SDK (cible : Flutter 3.22+, Dart 3.4+)
- `flutter doctor -v` → chaîne outils (Xcode, Android SDK, etc.)
- Message d'erreur complet (stack trace si disponible)
- Plateforme cible (Android / iOS / Web / Desktop)

---

## 2. Structure projet

**Feature-first** (projets moyens/grands) :
```
lib/
  features/
    auth/
      data/        # repositories, data sources, models
      domain/      # entities, use cases
      presentation/ # pages, widgets, controllers
  core/            # DI, router, theme, utils
  main.dart
```

**Layer-first** (petits projets ou prototypes) :
```
lib/
  data/ domain/ presentation/
  main.dart
```

Critère de choix : si > 3 features ou > 2 devs → feature-first obligatoire.

---

## 3. State management — décision

| Taille projet | Solution recommandée | Quand éviter |
|---|---|---|
| Prototype / très petit | `Provider` | > 3 features |
| Moyen | **Riverpod 2.x** | jamais — convient toujours |
| Grande logique métier | **BLoC/Cubit** | sur-architecture sur petits cas |
| Full-stack léger | `GetX` | maintainability sacrifiée |

**Riverpod — pattern minimal fonctionnel :**
```dart
// counter_provider.dart
final counterProvider = StateNotifierProvider<CounterNotifier, int>(
  (ref) => CounterNotifier(),
);

class CounterNotifier extends StateNotifier<int> {
  CounterNotifier() : super(0);
  void increment() => state++;
}

// widget
class CounterPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Text('$count');
  }
}
```

**Cubit — pattern minimal :**
```dart
class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this._repo) : super(AuthInitial());
  final AuthRepository _repo;

  Future<void> login(String email, String password) async {
    emit(AuthLoading());
    try {
      final user = await _repo.login(email, password);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }
}
```

---

## 4. Widgets — règles de performance

```dart
// ✅ Bon : const constructor évite le rebuild
const MyCard({super.key, required this.title});

// ✅ Isoler le Consumer au plus proche de la donnée
Consumer<CartModel>(
  builder: (_, cart, __) => Text('${cart.itemCount}'),
);

// ❌ Mauvais : Consumer sur tout l'arbre
Consumer<CartModel>(
  builder: (_, cart, __) => Scaffold(...),  // rebuild = toute la page
);

// ✅ ListView.builder pour listes longues
ListView.builder(
  itemCount: items.length,
  itemBuilder: (_, i) => ItemTile(item: items[i]),
);
```

Règle : **jamais de logique métier dans `build()`** — uniquement présentation.

---

## 5. Navigation — GoRouter (recommandé 2025+)

```yaml
# pubspec.yaml
dependencies:
  go_router: ^14.0.0
```

```dart
final router = GoRouter(
  initialLocation: '/home',
  redirect: (context, state) {
    final loggedIn = ref.read(authProvider).isLoggedIn;
    if (!loggedIn && state.matchedLocation != '/login') return '/login';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
    GoRoute(
      path: '/home',
      builder: (_, __) => const HomePage(),
      routes: [
        GoRoute(path: 'detail/:id', builder: (_, s) => DetailPage(id: s.pathParameters['id']!)),
      ],
    ),
  ],
);

// Navigation
context.go('/home/detail/42');
context.push('/home/detail/42');  // ajoute au back stack
```

---

## 6. Networking + modèles

```yaml
dependencies:
  dio: ^5.4.0
  retrofit: ^4.1.0
  freezed_annotation: ^2.4.1
  json_annotation: ^4.9.0
dev_dependencies:
  build_runner: ^2.4.9
  freezed: ^2.4.7
  json_serializable: ^6.7.1
  retrofit_generator: ^8.1.0
```

```dart
// model généré via freezed
@freezed
class User with _$User {
  const factory User({
    required int id,
    required String name,
    String? avatar,
  }) = _User;
  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

// génération : flutter pub run build_runner build --delete-conflicting-outputs
```

Intercepteur Dio pour token :
```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  },
));
```

---

## 7. Testing

```dart
// Widget test
testWidgets('affiche le titre', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: MyWidget(title: 'Test')));
  expect(find.text('Test'), findsOneWidget);
});

// BLoC/Cubit test
blocTest<AuthCubit, AuthState>(
  'émet AuthSuccess après login réussi',
  build: () => AuthCubit(mockRepo),
  act: (c) => c.login('u@test.com', 'pass'),
  expect: () => [isA<AuthLoading>(), isA<AuthSuccess>()],
);
```

Commandes utiles :
```bash
flutter test                          # tous les tests
flutter test --coverage               # avec couverture
genhtml coverage/lcov.info -o cov_html # rapport HTML
flutter test integration_test/        # tests d'intégration
```

---

## 8. Performance — checklist

- [ ] `const` sur tous les constructeurs éligibles
- [ ] `ListView.builder` / `SliverList` pour listes > 20 items
- [ ] `RepaintBoundary` autour des animations complexes
- [ ] Traitements lourds dans `Isolate` ou `compute()`
- [ ] `cached_network_image` pour images distantes
- [ ] Profiler avec **Flutter DevTools** → onglet Performance (frame budget 16ms)

```dart
// compute() = Isolate simplifié
final result = await compute(parseJsonHeavy, rawString);
```

---

## 9. Build & déploiement

```bash
# flavors via dart-define
flutter run --dart-define=ENV=staging
flutter build apk --dart-define=ENV=prod --release

# APK split par ABI (taille réduite)
flutter build apk --split-per-abi

# iOS archive
flutter build ipa --release

# Versions automatiques
flutter pub version          # avec package cider
```

Flavors dans le code :
```dart
const env = String.fromEnvironment('ENV', defaultValue: 'dev');
```

---

## 10. Anti-patterns / pièges à éviter

| Piège | Solution |
|---|---|
| `setState` dans un `StatelessWidget` | Passer à `StatefulWidget` ou state manager |
| `BuildContext` utilisé après `await` | Vérifier `mounted` avant toute opération post-await |
| Appels API dans `build()` | Déplacer dans `initState` ou un provider |
| `Image.network()` sans cache | Utiliser `CachedNetworkImage` |
| Packages abandonnés (vérifier pub.dev) | Filtrer par "Likes > 100" et "Maintained" |
| `print()` en production | Remplacer par `debugPrint()` ou logger package |
| Nested `Scaffold` | Un seul `Scaffold` par route |

```dart
// ✅ Vérification mounted après async
Future<void> fetchData() async {
  final data = await api.get();
  if (!mounted) return;          // évite memory leak / crash
  setState(() => _data = data);
}
```


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
