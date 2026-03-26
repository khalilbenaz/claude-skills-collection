---
name: dev-vue-guide
description: Développement d'applications Vue.js 3 avec Composition API, Pinia, Vue Router, composants réactifs et bonnes pratiques. Se déclenche avec "Vue", "Vue.js", "Composition API", "Pinia", "Vue Router", "composant Vue".
---

# Guide Vue.js 3

## Workflow

1. **Analyser le besoin** — Identifier le type d'application (SPA, SSR avec Nuxt, bibliothèque de composants) et déterminer l'architecture adaptée : Composition API avec `<script setup>`, gestion d'état avec Pinia, et stratégie de routing.

2. **Structurer le projet** — Organiser l'arborescence avec les conventions Vue : `src/components/` pour les composants réutilisables, `src/views/` pour les pages, `src/composables/` pour la logique partagée, `src/stores/` pour Pinia, et `src/router/` pour la configuration des routes.

3. **Créer les composants réactifs** — Développer les composants avec `<script setup lang="ts">`, utiliser `defineProps` et `defineEmits` pour l'API publique, `ref()` et `reactive()` pour l'état local, et `computed()` pour les valeurs dérivées.

4. **Implémenter la gestion d'état avec Pinia** — Créer les stores Pinia avec `defineStore()`, structurer les states, getters et actions. Utiliser `storeToRefs()` pour la déstructuration réactive et les plugins Pinia pour la persistance ou le logging.

5. **Configurer Vue Router** — Définir les routes avec lazy loading via `() => import()`, implémenter les navigation guards (`beforeEach`, `beforeRouteEnter`), gérer les routes imbriquées, les paramètres dynamiques et les meta fields pour l'authentification.

6. **Gérer la réactivité avancée** — Utiliser `watch()` et `watchEffect()` pour les effets de bord, `provide/inject` pour l'injection de dépendances, `toRef()` et `toRefs()` pour la conversion, et `shallowRef()` pour l'optimisation des gros objets.

7. **Intégrer les composables** — Extraire la logique réutilisable dans des composables (`useAuth`, `useFetch`, `useForm`), respecter la convention de nommage `use*`, et gérer correctement le cycle de vie avec `onMounted`, `onUnmounted`.

8. **Tester et optimiser** — Écrire des tests avec Vitest et Vue Test Utils, utiliser `defineAsyncComponent()` pour le code splitting, activer le tree-shaking, et profiler les performances avec Vue DevTools.

## Règles

- Utilise systématiquement `<script setup>` avec TypeScript et la Composition API plutôt que l'Options API.
- Déstructure toujours les stores Pinia avec `storeToRefs()` pour conserver la réactivité.
- Évite les mutations directes du state en dehors des actions Pinia — garde la logique métier dans les stores.
- Privilégie les composables pour la logique partagée plutôt que les mixins, qui sont dépréciés en Vue 3.
- Définis toujours les props avec des types TypeScript explicites via `defineProps<T>()` pour garantir la sécurité de type.
