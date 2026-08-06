---
name: react-native-guide
description: Guide de développement React Native avec Expo et navigation. Se déclenche avec "React Native", "Expo", "RN", "react-navigation", "native modules", "bridge", "mobile JavaScript", "Hermes". Also triggers on "React Native app", "Expo setup", "mobile navigation".
---

# React Native Guide

## 1. Choix du workflow — critères de décision

| Critère | Expo Managed | Expo Bare | RN CLI pur |
|---|---|---|---|
| Démarrage rapide | ✅ | ✅ | ❌ |
| Accès natif complet | ❌ | ✅ | ✅ |
| EAS Build/Update | ✅ | ✅ | ❌ |
| SDK Expo prêt à l'emploi | ✅ | Partiel | ❌ |
| Maintenance long terme | Facile | Moyenne | Élevée |

Règle : commencer **Expo Managed**, migrer en Bare uniquement si un module natif custom est indispensable.

```bash
# Expo SDK 52 (LTS 2026), TypeScript, file-based routing
npx create-expo-app@latest MyApp --template blank-typescript
cd MyApp && npx expo install expo-router react-native-safe-area-context react-native-screens
```

## 2. Navigation — Expo Router (recommandé 2026)

Expo Router v3+ : routing basé sur les fichiers, deep linking automatique, typages TypeScript natifs.

```
app/
  _layout.tsx        ← root layout (Stack ou Tabs)
  index.tsx          ← écran "/"
  (tabs)/
    _layout.tsx      ← Tabs layout
    home.tsx         ← "/home"
    profile.tsx      ← "/profile"
  [id].tsx           ← route dynamique "/123"
```

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// Navigation typée
import { router } from 'expo-router';
router.push('/profile');
router.push({ pathname: '/[id]', params: { id: '42' } });
```

Si React Navigation v6 standalone : préférer `createNativeStackNavigator` (performances natives) sur `createStackNavigator` (JS pur).

## 3. State management — arbre de décision

```
Données locales à un composant  →  useState / useReducer
Partage entre quelques écrans   →  Context + useReducer
Cache serveur / API             →  TanStack Query v5
État global UI                  →  Zustand
Projet legacy complexe          →  Redux Toolkit
```

```ts
// Zustand — store minimal typé
import { create } from 'zustand';
interface AuthStore { token: string | null; setToken: (t: string) => void; }
export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));

// TanStack Query — fetch avec cache
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => api.getUser(id),
  staleTime: 60_000,
});
```

## 4. UI et styling

- **StyleSheet natif** : seule option garantissant les perfs sur les deux plateformes.
- **NativeWind v4** : Tailwind CSS → StyleSheet, sans overhead runtime.
- **Animations** : toujours `react-native-reanimated` v3 (thread UI) ; éviter `Animated` de RN core pour tout ce qui dépasse un simple fade.

```tsx
// Reanimated — animation sur le thread UI
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

const offset = useSharedValue(0);
const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
// Déclencher : offset.value = withSpring(100);
<Animated.View style={[styles.box, style]} />
```

## 5. Listes performantes

FlatList cause des janks sur les longues listes. Migrer vers **FlashList** :

```bash
npx expo install @shopify/flash-list
```

```tsx
import { FlashList } from '@shopify/flash-list';
<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={80}   // ← obligatoire, détermine les perfs
  keyExtractor={(item) => item.id}
/>
```

## 6. Stockage local

| Besoin | Solution |
|---|---|
| Simple clé-valeur async | `@react-native-async-storage/async-storage` |
| Haute perf synchrone | `react-native-mmkv` |
| SQLite relationnel | `expo-sqlite` (Expo) ou `op-sqlite` (Bare/RN CLI) |
| Sécurisé (tokens) | `expo-secure-store` |

```ts
// MMKV — synchrone, 10x plus rapide qu'AsyncStorage
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();
storage.set('token', 'abc123');
const token = storage.getString('token'); // synchrone
```

## 7. Modules natifs et nouvelle architecture

React Native 0.74+ : nouvelle architecture activée par défaut (JSI, Fabric, TurboModules).

```bash
# Vérifier la compatibilité d'un package
npx react-native-new-architecture-check
```

Ordre de priorité pour les modules natifs :
1. **Expo SDK** (caméra, notifications, biométrie, localisation) — zéro config
2. **Community packages** compatibles nouvelle architecture
3. **Expo Modules API** (Swift/Kotlin) pour un module custom

```kotlin
// Expo Module API (Kotlin) — module natif minimal
class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")
    Function("greet") { name: String -> "Hello, $name!" }
  }
}
```

## 8. Build et déploiement — EAS

```bash
npm install -g eas-cli
eas login && eas build:configure

# Build cloud (sans Mac pour iOS)
eas build --platform ios --profile production
eas build --platform android --profile production

# OTA update (sans passer par le store)
eas update --branch production --message "fix: crash liste"

# Soumettre au store
eas submit --platform ios
eas submit --platform android
```

**eas.json** — profils types :
```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

## 9. Performance — checklist

- [ ] Hermes activé (`"jsEngine": "hermes"` dans app.json)
- [ ] FlashList à la place de FlatList pour listes > 20 items
- [ ] `React.memo` sur les composants pures de liste
- [ ] `useCallback` sur les handlers passés en props
- [ ] Animations sur thread UI via Reanimated (jamais `Animated.event` JS-driven)
- [ ] Images : `expo-image` (cache LRU, formats WebP/AVIF, placeholder blurhash)
- [ ] Lazy loading des écrans : `React.lazy` + `Suspense` ou `lazyComponent` d'Expo Router

## 10. Garde-fous et anti-patterns

**Ne pas faire :**

```tsx
// ❌ setState dans une boucle → re-rendus en cascade
items.forEach(item => setCount(count + 1));
// ✅ un seul setState avec la valeur finale
setCount(items.length);

// ❌ inline function dans renderItem → rerend à chaque frame
<FlatList renderItem={({ item }) => <Card item={item} />} />
// ✅ extraire le composant ou mémoïser
const renderItem = useCallback(({ item }) => <Card item={item} />, []);

// ❌ StyleSheet inline → nouvel objet à chaque rendu
<View style={{ flex: 1, padding: 16 }} />
// ✅ StyleSheet.create (compilé une fois)
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });

// ❌ useEffect sans cleanup sur les listeners
useEffect(() => { subscription = subscribe(); }, []);
// ✅
useEffect(() => { const sub = subscribe(); return () => sub.remove(); }, []);
```

**Pièges courants :**

- `KeyboardAvoidingView` : comportement différent iOS (`padding`) vs Android (`height`).
- Permissions (caméra, localisation) : demander au runtime, jamais assumer l'accord.
- SafeAreaView : utiliser `react-native-safe-area-context` (pas le composant RN core) pour un comportement cohérent sur les notches et Dynamic Island.
- Metro bundler cache corrompu : `npx expo start --clear` ou `npx react-native start --reset-cache`.
- Nouvelle architecture : certains packages populaires restent incompatibles — vérifier `reactnative.directory` avant toute installation.

## Références rapides

- [expo.dev/changelog](https://expo.dev/changelog) — SDK changelog
- [reactnative.directory](https://reactnative.directory) — compatibilité nouvelle architecture
- [docs.expo.dev/router](https://docs.expo.dev/router/introduction/) — Expo Router
- [rnr.io](https://rnr.io) — React Native Reusables (composants accessibles + NativeWind)
