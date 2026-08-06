---
name: dev-vue-guide
description: Développement d'applications Vue.js 3 avec Composition API, Pinia, Vue Router, composants réactifs et bonnes pratiques. Se déclenche avec "Vue", "Vue.js", "Composition API", "Pinia", "Vue Router", "composant Vue". Also triggers on "Vue 3 app", "Pinia store".
---

# Guide Vue.js 3

## 1. Scaffolding du projet

```bash
# Nouveau projet Vite + Vue 3 + TS
npm create vite@latest mon-app -- --template vue-ts
cd mon-app && npm install

# Ajout immédiat des dépendances core
npm install pinia vue-router@4
npm install -D vitest @vue/test-utils jsdom
```

**Arborescence cible :**
```
src/
  components/   # composants réutilisables (atomiques)
  views/        # pages associées à une route
  composables/  # logique partagée (use*)
  stores/       # stores Pinia
  router/       # index.ts + guards
  types/        # interfaces TS globales
```

---

## 2. Composants — Script Setup + TypeScript

Toujours `<script setup lang="ts">`. Ne jamais utiliser l'Options API dans du code nouveau.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), { count: 0 })
const emit = defineEmits<{ increment: [value: number] }>()

const doubled = computed(() => props.count * 2)

function handleClick() {
  emit('increment', props.count + 1)
}
</script>

<template>
  <button @click="handleClick">{{ title }} — {{ doubled }}</button>
</template>
```

**Critères `ref` vs `reactive` :**
| Cas | Outil |
|-----|-------|
| Valeur primitive ou objet unique interchangeable | `ref()` |
| Objet complexe multi-propriétés | `reactive()` |
| Gros objet immuable côté UI | `shallowRef()` |
| Prop réactive transmise à un composable | `toRef(props, 'key')` |

---

## 3. Pinia — Gestion d'état

```ts
// src/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const name = ref('')
  const isAdmin = computed(() => name.value.startsWith('admin_'))

  async function fetchUser(id: string) {
    const data = await api.get(`/users/${id}`)
    name.value = data.name
  }

  return { name, isAdmin, fetchUser }
})
```

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const store = useUserStore()
const { name, isAdmin } = storeToRefs(store)  // réactivité conservée
// store.fetchUser — actions appelées directement, sans storeToRefs
</script>
```

**Persistance (pinia-plugin-persistedstate) :**
```ts
// main.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
pinia.use(piniaPluginPersistedstate)

// dans le store : ajouter { persist: true } comme 3e argument de defineStore
```

---

## 4. Vue Router — Configuration et Guards

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/dashboard',
      component: () => import('@/views/Dashboard.vue'), // lazy load obligatoire
      meta: { requiresAuth: true },
    },
    {
      path: '/user/:id',
      component: () => import('@/views/UserProfile.vue'),
      props: true,  // injecte :id comme prop
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
})
```

---

## 5. Composables — Extraction de logique

Convention : fichier `src/composables/useXxx.ts`, retour d'un objet de refs.

```ts
// src/composables/useFetch.ts
import { ref } from 'vue'

export function useFetch<T>(url: string) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    try {
      const res = await fetch(url)
      data.value = await res.json()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, execute }
}
```

---

## 6. Réactivité avancée

```ts
// watch avec cleanup
watch(userId, async (newId, _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  data.value = await fetchUser(newId, controller.signal)
})

// watchEffect — recalcul automatique sur toute dépendance lue
watchEffect(() => {
  document.title = `${route.name} | ${appName.value}`
})

// provide / inject (typage fort)
const ThemeKey: InjectionKey<Ref<string>> = Symbol('theme')
provide(ThemeKey, ref('dark'))
const theme = inject(ThemeKey)  // Ref<string> | undefined
```

---

## 7. Performance et code splitting

```ts
// Composant asynchrone avec loader/erreur
const HeavyChart = defineAsyncComponent({
  loader: () => import('@/components/HeavyChart.vue'),
  loadingComponent: Spinner,
  errorComponent: ErrorMsg,
  delay: 200,
  timeout: 5000,
})
```

- `v-once` sur contenus statiques coûteux.
- `v-memo="[dep1, dep2]"` pour listes avec rendu conditionnel lourd.
- Éviter les watchers larges sur `reactive()` — préférer des `watch` ciblés.

---

## 8. Tests avec Vitest + Vue Test Utils

```ts
// src/components/__tests__/Counter.spec.ts
import { mount } from '@vue/test-utils'
import Counter from '../Counter.vue'

test('émet increment au clic', async () => {
  const wrapper = mount(Counter, { props: { count: 3 } })
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted('increment')?.[0]).toEqual([4])
})
```

```bash
npx vitest run          # one-shot CI
npx vitest --ui         # interface graphique
```

---

## Garde-fous et anti-patterns

| Problème | Symptôme | Correction |
|----------|----------|-----------|
| Déstructuration directe d'un store | perte de réactivité | `storeToRefs()` |
| Mutation directe du state Pinia hors action | incohérence | passer par une action |
| Utilisation des mixins | conflits, opacité | composables `use*` |
| `reactive()` sur une ref | double-wrapping | utiliser `ref()` seul |
| Props muables localement | violation one-way | emit + event handler côté parent |
| Import de composants lourds sans lazy | bundle trop gros | `defineAsyncComponent` ou `() => import()` |
| `watch` sans nettoyage sur fetch | race condition | `onCleanup` + AbortController |
| `v-for` sans `:key` stable | rerenders erratiques | toujours `:key` sur id métier |

---

## Checklist qualité (2026)

- [ ] `<script setup lang="ts">` sur tous les composants
- [ ] Props typées via `defineProps<Interface>()`
- [ ] Emits déclarés avec `defineEmits<{ event: [type] }>()`
- [ ] Lazy loading sur toutes les routes
- [ ] Stores Pinia en setup stores (pas la syntaxe objet)
- [ ] Composables couverts par des tests unitaires
- [ ] `defineAsyncComponent` pour les composants > 20 KB
- [ ] Vue DevTools activé en dev pour profiler les rerenders


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
