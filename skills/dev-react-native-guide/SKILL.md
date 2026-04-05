---
name: dev-react-native-guide
description: Guide de développement React Native avec Expo et navigation. Se déclenche avec "React Native", "Expo", "RN", "react-navigation", "native modules", "bridge", "mobile JavaScript", "Hermes".
---

# React Native Guide

## Workflow
1. **Setup du projet** — Choisir entre Expo (Managed Workflow pour démarrage rapide sans configuration native) ou Bare Workflow (accès complet aux fichiers natifs iOS/Android). Configurer Expo Router pour le file-based routing, sélectionner un template TypeScript adapté, et initialiser les outils de qualité (ESLint, Prettier, Husky).
2. **Navigation** — Implémenter la navigation avec React Navigation (v6+) : Stack Navigator (transitions d'écrans), Tab Navigator (bottom tabs, top tabs), Drawer Navigator (menu latéral), ou Expo Router (routing basé sur les fichiers, idéal avec Expo). Configurer le deep linking (scheme URI, Universal Links/App Links) et les typages TypeScript des routes.
3. **State management** — Sélectionner la solution selon la complexité : React Context + useReducer (simple, sans dépendance), Zustand (léger, API simple, performant), Redux Toolkit (projets complexes, DevTools, middlewares), React Query/TanStack Query (cache serveur, synchronisation, revalidation), ou Jotai (state atomique, simple et composable).
4. **UI et styling** — Construire l'interface avec StyleSheet natif (performant, compilé nativement), NativeWind (Tailwind CSS adapté React Native, className), react-native-paper ou React Native Elements (composants Material Design), et react-native-reanimated 3 + Gesture Handler pour les animations fluides 60fps sur le thread UI.
5. **Native modules** — Intégrer les fonctionnalités natives : Expo modules (caméra, notifications, biométrie, localisation — couverture 90% des besoins), Turbo Modules (nouvelle architecture, JSI, performances améliorées), ou ponts natifs personnalisés (Swift/Kotlin) pour les modules non disponibles dans l'écosystème Expo.
6. **Data et storage** — Gérer la persistance : AsyncStorage (simple, clé-valeur, asynchrone), MMKV (synchrone, très performant, recommandé), expo-sqlite ou op-sqlite pour les bases relationnelles, et Axios ou fetch natif avec interceptors pour les appels API REST, avec gestion d'erreurs et retry automatique.
7. **Performance** — Optimiser avec Hermes (moteur JS optimisé, activé par défaut), Flashlist à la place de FlatList (performances 10x supérieures pour les longues listes), React.memo/useMemo/useCallback pour éviter les re-rendus inutiles, Reanimated pour les animations sur le thread UI, et le profiler React DevTools pour identifier les goulots d'étranglement.
8. **Build et déploiement** — Automatiser avec EAS Build (Expo Application Services, cloud build iOS/Android sans Mac requis), EAS Update pour les mises à jour OTA (over-the-air) sans passer par les stores, CodePush (Microsoft, alternative OTA), configuration des build profiles (development/preview/production), et publication sur l'App Store et le Play Store avec les métadonnées et captures d'écran.

## Règles
- Fournis du code React Native complet en TypeScript, avec les imports et les types explicites pour chaque exemple.
- Adapte les recommandations aux versions actuelles : React Native 0.73+, Expo SDK 50+, React Navigation 6+, nouvelle architecture (Fabric, JSI, TurboModules).
- Priorise la performance et l'UX : signal les anti-patterns courants (setState dans les boucles, FlatList sans keyExtractor, animations sur le JS thread).
- Mentionne les alternatives Expo vs bare workflow et leurs implications sur la maintenance et les mises à jour natives.
- En cas de problème lié aux modules natifs, précise si le projet utilise Expo Managed, Bare Workflow, ou React Native CLI pur avant de proposer une solution.


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
