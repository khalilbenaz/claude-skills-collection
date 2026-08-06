---
name: dev-playwright-browser-automation
description: Automatisation de navigateur via Playwright MCP — naviguer, cliquer, remplir des formulaires, prendre des captures d'écran et déboguer des pages web. À utiliser quand l'utilisateur veut interagir avec un navigateur, tester une interface ou automatiser des actions web. Se déclenche aussi avec "ouvre cette page", "teste le formulaire", "automatise le navigateur", "capture d'écran de la page", "remplis le formulaire". Also triggers on "Playwright automation", "automate a browser", "fill a form automatically".
---

# Automatisation Navigateur avec Playwright MCP

## Workflow en étapes

### 1. Naviguer vers la page cible
Toujours commencer par un `navigate` vers l'URL exacte. Pour les apps locales, préférer `127.0.0.1` à `localhost` (évite les problèmes DNS).

```
playwright_navigate: { url: "http://127.0.0.1:3000/login" }
```

### 2. Inspecter avant d'interagir
Utiliser `snapshot` (arbre d'accessibilité) pour identifier les éléments disponibles. Ne jamais deviner un sélecteur.

```
playwright_snapshot  →  renvoie les ref= de chaque élément interactif
```

Snapshot en priorité sur screenshot : plus léger, donne les `ref` nécessaires aux clics/fill.

### 3. Interagir avec les éléments

**Cliquer sur un bouton/lien**
```
playwright_click: { element: "Connexion", ref: "e12" }
```

**Remplir un formulaire (field par field)**
```
playwright_fill: { element: "Email", ref: "e5", value: "user@example.com" }
playwright_fill: { element: "Mot de passe", ref: "e6", value: "secret" }
playwright_click: { element: "Se connecter", ref: "e9" }
```

**Menu déroulant**
```
playwright_select: { element: "Rôle", ref: "e8", values: ["admin"] }
```

**Raccourci clavier (ex: soumettre avec Entrée)**
```
playwright_press: { element: "champ", ref: "e6", key: "Enter" }
```

### 4. Attendre et vérifier
Après une action asynchrone (soumission, navigation, chargement AJAX), faire un nouveau `snapshot` avant de valider. Ne jamais supposer que le résultat est immédiat.

### 5. Déboguer si nécessaire
```
playwright_console_messages   →  erreurs JS, warnings, logs
playwright_network_requests   →  appels API, codes HTTP, payloads
playwright_evaluate: { expression: "document.title" }  →  JS arbitraire
```

### 6. Capture d'écran (visuel uniquement)
Réserver aux vérifications d'apparence ou rapports. Pas un substitut au snapshot.
```
playwright_screenshot: { name: "resultat-apres-login" }
```

---

## Critères de décision

| Situation | Action |
|-----------|--------|
| Trouver un élément cliquable | `snapshot` → lire les `ref` |
| Vérifier un texte affiché | `snapshot` → chercher dans l'arbre |
| Bug CSS / rendu visuel | `screenshot` |
| Erreur JS inexpliquée | `console_messages` |
| Appel API qui échoue | `network_requests` |
| Page SPA (React/Vue/Angular) | `snapshot` après chaque navigation, l'arbre se reconstruit |
| Champ masqué / disabled | JS via `evaluate` pour forcer la valeur |

---

## Anti-patterns et pièges

**Ne jamais faire :**
- Utiliser un sélecteur CSS deviné sans snapshot préalable — les `ref` changent à chaque reload.
- Enchaîner des actions sans vérifier l'état intermédiaire sur les pages asynchrones.
- Utiliser `screenshot` pour "voir ce qu'il y a" à la place du `snapshot` — 10× plus lent et pas de `ref`.
- Supposer qu'un formulaire est soumis parce que `click` a fonctionné — toujours lire le snapshot suivant.

**Pièges fréquents :**

| Symptôme | Cause probable | Remède |
|----------|---------------|--------|
| `ref` introuvable | Page rechargée depuis le dernier snapshot | Refaire un `snapshot` |
| Champ rempli mais valeur ignorée | Input contrôlé (React) — `fill` non déclenche pas `onChange` | Ajouter un `press: Tab` après le `fill` |
| Click sans effet visible | Élément hors viewport | `evaluate: element.scrollIntoView()` puis re-click |
| Timeout navigation | SPA avec routing client-side | Attendre un élément cible plutôt que `networkidle` |
| Contenu iframe non visible dans snapshot | Iframe cross-origin | Naviguer directement vers l'URL de l'iframe |

---

## Bonnes pratiques 2026

- **Playwright MCP** expose des outils discrets (`playwright_navigate`, `playwright_click`, etc.) — chaque appel est atomique, pas de session globale à gérer.
- Préférer les **localisateurs sémantiques** (label, role, text) aux XPath/CSS quand le `ref` n'est pas disponible.
- Sur les SPAs : attendre un élément clé (`snapshot` + vérifier sa présence) plutôt qu'un délai fixe.
- Pour les tests répétables : noter la séquence `navigate → snapshot → fill/click → snapshot → assert` comme pattern de base.
- En cas de CAPTCHA ou 2FA : signaler à l'utilisateur, ne pas tenter de contourner.
- Après un `playwright_close`, le contexte navigateur est détruit — relancer `navigate` pour recommencer.

---

## Dépannage rapide

| Problème | Solution |
|----------|----------|
| Navigateur non démarré | Lancer `playwright_navigate` — le MCP démarre Chromium automatiquement |
| Domaine local inaccessible | Remplacer `localhost` par `127.0.0.1` |
| Snapshot vide ou tronqué | Naviguer vers une sous-page plus ciblée |
| Éléments introuvables | Refaire `snapshot` — la page a peut-être rechargé |
| CORS sur `evaluate` | Normal : le JS s'exécute dans le contexte de la page, pas externe |


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
