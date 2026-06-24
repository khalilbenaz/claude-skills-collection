---
name: chrome-devtools-debugger
description: Débogage et automatisation de navigateur via Chrome DevTools MCP. Inspecter des pages, analyser les performances, surveiller le réseau et automatiser des interactions. À utiliser quand l'utilisateur veut déboguer une page web, analyser les performances ou inspecter les requêtes réseau. Se déclenche aussi avec "devtools", "debug navigateur", "inspecter la page", "performances web", "requêtes réseau", "console chrome".
---

# Débogueur Chrome DevTools

## Workflow général (ordre obligatoire)

```
Naviguer → Attendre chargement → Inspecter (snapshot) → Agir → Vérifier
```

1. **Naviguer** vers la page cible (`navigate` avec URL complète incluant le protocole).
2. **Attendre** que la page soit stable (réseau idle, `DOMContentLoaded`).
3. **Lister les pages** disponibles si plusieurs onglets, sélectionner le bon `targetId`.
4. **Snapshot** de la structure (arbre d'accessibilité) — donne les identifiants uniques pour les interactions.
5. **Agir** selon le besoin : clic, saisie, scroll, exécution JS.
6. **Vérifier** le résultat : snapshot diff, console, capture si visuel requis.

---

## Scénarios courants

### 1. Erreurs JavaScript

```
naviguer → snapshot → getConsoleMessages → evalScript
```

- Récupérer les messages console filtrés sur `level: error`.
- Identifier le fichier et la ligne dans la stack trace.
- Exécuter du JS pour inspecter l'état en direct :

```js
// Exemples copiables dans evalScript
document.querySelectorAll('[data-error]').length
window.__reactFiber !== undefined  // détecter React
performance.getEntriesByType('resource').filter(r => r.duration > 1000)
```

- Si l'erreur est `Cannot read properties of undefined` : vérifier le timing (race condition) avec `document.readyState`.

### 2. Problèmes réseau

```
naviguer → getNetworkRequests → filtrer → analyser
```

Filtres prioritaires :

| Symptôme | Filtre à appliquer |
|---|---|
| Page blanche / données manquantes | `status >= 400` |
| Lenteur | `duration > 2000ms` |
| Erreur CORS | `blocked: true`, header `Access-Control-Allow-Origin` absent |
| CSP violation | messages console de type `Content Security Policy` |
| Waterfall lent | requêtes séquentielles au lieu de parallèles |

Snippet de diagnostic réseau via `evalScript` :

```js
// Ressources lentes (> 1s)
performance.getEntriesByType('resource')
  .filter(r => r.duration > 1000)
  .map(r => ({ name: r.name, duration: Math.round(r.duration) }))
```

### 3. Analyse de performance

```
naviguer → startTrace → déclencher l'action → stopTrace → analyser
```

Points à identifier dans la trace :

- **Long Tasks** (> 50 ms) : bloquent le thread principal.
- **Layout thrashing** : alternance forcée lecture/écriture DOM en boucle.
- **Repaints excessifs** : vérifier `will-change`, layers composites.
- **Time to Interactive (TTI)** : si > 3,8 s, chercher les scripts bloquants.

Snippet pour identifier le layout thrashing :

```js
// Propriétés qui forcent un reflow
const reflow_props = ['offsetHeight','offsetWidth','clientHeight',
  'scrollTop','getBoundingClientRect']
// Chercher dans le code source les lectures de ces props dans une boucle
```

### 4. Automatisation d'interactions

```
snapshot → récupérer nodeId → click/type/scroll → snapshot de vérification
```

Règles d'or pour les interactions fiables :

- Toujours utiliser le `nodeId` issu du snapshot, jamais un sélecteur CSS deviné.
- Attendre un indicateur de stabilité après chaque action (snapshot qui ne change plus, network idle).
- Pour les formulaires : `type` sur le champ → `click` sur le bouton submit → vérifier navigation ou message de confirmation.

---

## Critères de décision : quel outil utiliser

| Besoin | Outil | Raison |
|---|---|---|
| Trouver un élément pour interagir | `snapshot` | Retourne les `nodeId` uniques, léger |
| Vérification visuelle (rendu, layout) | `screenshot` | Seul moyen de voir le rendu réel |
| Données hors arbre d'accessibilité | `evalScript` | Accès direct au DOM/window |
| Analyser erreurs runtime | `getConsoleMessages` | Messages filtrables par niveau |
| Diagnostiquer la lenteur réseau | `getNetworkRequests` | Timing, status, headers |
| Mesurer perf (LCP, TTI, FPS) | `startTrace` / `stopTrace` | Profil complet du thread principal |

---

## Garde-fous et anti-patterns

### Ne jamais faire

- **Screenshot systématique** — coûteux en tokens, inutile pour le débogage structurel. Réserver au besoin visuel explicite.
- **Interagir sans snapshot préalable** — les sélecteurs CSS peuvent pointer sur plusieurs éléments ; les `nodeId` sont uniques.
- **Ignorer l'ordre naviguer→attendre→inspecter** — un snapshot trop tôt capture une page incomplète.
- **Lancer une trace sur une page déjà chargée** — démarrer la trace avant l'action à mesurer.
- **evalScript avec `document.write`** — détruit le DOM existant.

### Pièges fréquents

| Piège | Symptôme | Solution |
|---|---|---|
| SPA (React/Vue/Angular) | snapshot vide ou partiel | Attendre l'hydratation ; chercher `[data-reactroot]` ou `#app` |
| iframes | éléments introuvables | Changer de `targetId` sur l'iframe |
| Shadow DOM | nodeId absent | `evalScript` avec `shadowRoot.querySelectorAll` |
| Auth / cookies | redirections inattendues | Vérifier cookies via `evalScript(document.cookie)` avant navigation |
| HTTPS self-signed | page blanche | Passer `--ignore-certificate-errors` au démarrage de Chrome |

---

## Bonnes pratiques 2026

- **Headless Chrome** : préférer `--headless=new` (Chromium 112+) plutôt que l'ancien flag `--headless`.
- **Core Web Vitals** : cibler LCP < 2,5 s, INP < 200 ms, CLS < 0,1 — mesurables via `evalScript` avec la Performance API ou `PerformanceObserver`.
- **Données volumineuses** : paginer ou filtrer côté DevTools avant d'exposer les résultats ; sauvegarder les traces dans un fichier JSON plutôt que de les inliner dans la conversation.
- **Reproductibilité** : documenter la séquence exacte d'actions (URL, snapshots, scripts) pour rejouer le débogage.
- **Si DevTools MCP ne suffit pas** : orienter vers Playwright MCP (`dev-playwright-browser-automation`) pour les scénarios E2E complexes, ou vers l'interface Chrome DevTools native pour le profiling GPU/memory avancé.
