---
name: ios-swift-advisor
description: Développement iOS natif avec Swift, SwiftUI et UIKit. Se déclenche avec "iOS", "Swift", "SwiftUI", "UIKit", "Xcode", "iPhone app", "Apple", "Core Data", "Combine", "App Store". Also triggers on "iOS with Swift", "SwiftUI view", "UIKit navigation".
---

# iOS Swift Advisor

## Workflow

### 1. Choix d'architecture

| Contexte | Architecture recommandée |
|---|---|
| Petit projet / MVP SwiftUI | MVVM + `@Observable` |
| SwiftUI complexe, testabilité maximale | TCA (The Composable Architecture) |
| Grande équipe, UIKit dominant | VIPER ou Clean Swift (VIP) |
| Migration progressive UIKit→SwiftUI | MVVM + Coordinator |

```swift
// MVVM avec @Observable (Swift 5.9+, iOS 17)
@Observable
final class ProfileViewModel {
    var username: String = ""
    var isLoading: Bool = false
    private let repository: ProfileRepository

    init(repository: ProfileRepository) {
        self.repository = repository
    }

    func fetchProfile(id: String) async {
        isLoading = true
        defer { isLoading = false }
        username = await repository.fetch(id: id).name
    }
}

// Dans la View — pas besoin de @ObservedObject avec @Observable
struct ProfileView: View {
    @State private var vm = ProfileViewModel(repository: .live)
    var body: some View {
        Group {
            if vm.isLoading { ProgressView() }
            else { Text(vm.username) }
        }
        .task { await vm.fetchProfile(id: "42") }
    }
}
```

### 2. UI : SwiftUI vs UIKit

**Critères de décision :**
- `iOS 16+` cible minimale → SwiftUI first.
- Composant sans équivalent SwiftUI (ex. `WKWebView`, `MKMapView` avancé) → `UIViewRepresentable`.
- Migration progressive : wrapper les écrans SwiftUI dans `UIHostingController`.

```swift
// Interop UIKit → SwiftUI
struct WebViewRepresentable: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView { WKWebView() }
    func updateUIView(_ uiView: WKWebView, context: Context) {
        uiView.load(URLRequest(url: url))
    }
}
```

**Property wrappers — règle rapide :**
- `@State` : valeur locale, non partagée.
- `@Binding` : valeur owned par le parent, mutation bidirectionnelle.
- `@Environment` : valeurs système (`\.colorScheme`, `\.dismiss`).
- `@EnvironmentObject` : objet partagé injecté haut dans l'arbre.
- `@Observable` (iOS 17) : remplace `ObservableObject` + `@Published`.

### 3. Concurrence et networking (Swift Concurrency)

```swift
// URLSession + async/await + Codable
struct APIClient {
    func fetch<T: Decodable>(_ endpoint: URL) async throws -> T {
        let (data, response) = try await URLSession.shared.data(from: endpoint)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw APIError.badStatus
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}

// Annulation propre avec Task
func loadData() {
    Task {
        do {
            let user: User = try await APIClient().fetch(endpoint)
            await MainActor.run { self.user = user } // màj UI sur le main actor
        } catch is CancellationError { /* ignoré */ }
          catch { handle(error) }
    }
}
```

**Isoler le main actor :** annoter les ViewModels avec `@MainActor` pour éviter les data races sur les propriétés UI.

```swift
@MainActor
@Observable
final class FeedViewModel { ... }
```

### 4. Persistence — arbre de décision

```
Données sensibles (tokens, mdp) → Keychain
Préférences légères             → UserDefaults / @AppStorage
Modèle relationnel, migrations  → Core Data (NSPersistentCloudKitContainer pour iCloud)
Nouveau projet iOS 17+          → SwiftData (@Model, .modelContainer)
Sync multi-appareils            → CloudKit ou Firebase Firestore
```

```swift
// SwiftData (iOS 17+)
@Model
final class TodoItem {
    var title: String
    var isDone: Bool
    init(title: String) { self.title = title; self.isDone = false }
}

// Dans App
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
            .modelContainer(for: TodoItem.self)
    }
}
```

### 5. Tests

```swift
// XCTest async
func testFetchProfile() async throws {
    let sut = ProfileViewModel(repository: MockRepository())
    await sut.fetchProfile(id: "1")
    XCTAssertEqual(sut.username, "Alice")
}

// Protocol pour le mock
protocol ProfileRepository {
    func fetch(_ id: String) async -> Profile
}
struct MockRepository: ProfileRepository {
    func fetch(_ id: String) async -> Profile { Profile(name: "Alice") }
}
```

- **Couverture** : activer dans Scheme → Test → Code Coverage.
- **Snapshot testing** : `swift-snapshot-testing` (Point-Free) pour régressions visuelles.
- **UI tests** : `XCUIApplication`, utiliser les `accessibilityIdentifier` comme sélecteurs stables.

### 6. Sécurité iOS

```swift
// Keychain (wrapper simplifié)
func saveToken(_ token: String) {
    let data = Data(token.utf8)
    let query: [CFString: Any] = [
        kSecClass: kSecClassGenericPassword,
        kSecAttrAccount: "authToken",
        kSecValueData: data,
        kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    SecItemDelete(query as CFDictionary)
    SecItemAdd(query as CFDictionary, nil)
}

// Biométrie (Face ID / Touch ID)
let context = LAContext()
context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                        localizedReason: "Confirmer votre identité") { ok, _ in
    DispatchQueue.main.async { if ok { openSecureContent() } }
}
```

- **ATS** : toutes les requêtes doivent être HTTPS. Toute exception (`NSAllowsArbitraryLoads`) exige une justification App Review.
- **Certificate pinning** : via `URLAuthenticationChallenge` ou la lib TrustKit.

### 7. App Store — checklist soumission

1. Activer Automatic Signing dans Xcode (ou configurer les profiles manuels).
2. Renseigner **Privacy Nutrition Labels** dans App Store Connect (données collectées, utilisation).
3. Justifier chaque `NSUsageDescription` dans `Info.plist` (caméra, micro, localisation…).
4. Build via **Product → Archive** → Distribute App → App Store Connect.
5. TestFlight : group interne (jusqu'à 100 personnes, immédiat), groupe externe (review Beta ~24 h).
6. Délai de review App Review : ~24–48 h en 2026 (accéléré possible via API).

---

## Anti-patterns et pièges

| Piège | Conséquence | Remède |
|---|---|---|
| `URLSession` sur le main thread | UI gelée | `async/await` ou `.background` queue |
| Capture `self` forte dans closure `@escaping` | Fuite mémoire | `[weak self]` systématique |
| `@ObservedObject` sur un objet créé dans la View | Re-init à chaque rebuild | Passer via `@StateObject` ou `@Observable @State` |
| `Core Data` sans `NSManagedObjectContext` per-thread | Crash aléatoire | `performAndWait` ou `@ModelActor` (SwiftData) |
| `UserDefaults` pour tokens/mdp | Faille sécurité (lisible) | Keychain uniquement |
| Lancer `Task { }` sans annulation | Tasks zombies | Stocker dans `@State var task: Task<…>?` et `.cancel()` dans `onDisappear` |
| `GeometryReader` enveloppant tout | Layout cassé, rebuild excessif | Limiter au besoin précis, préférer `containerRelativeFrame` (iOS 17) |

## Bonnes pratiques 2026

- **Swift 6 mode strict** (`SWIFT_STRICT_CONCURRENCY = complete`) : activer tôt, corriger les data races à la compilation.
- **Previews Xcode 15+** : utiliser `#Preview { ... }` (nouveau DSL) plutôt que `PreviewProvider`.
- **Swift Testing** (Xcode 16 / iOS 17+) : framework officiel avec `@Test`, `#expect`, remplace XCTest pour les nouveaux tests.
- **Localization** : utiliser `String(localized:)` et le catalogue `.xcstrings` (Xcode 15) plutôt que `NSLocalizedString`.
- **Accessibility** : `.accessibilityLabel`, `.accessibilityHint`, tester avec VoiceOver simulator dès le début.
- **Memory** : profiler avec Instruments (Leaks + Allocations) avant chaque release ; surveiller les `deinit` des ViewModels.
