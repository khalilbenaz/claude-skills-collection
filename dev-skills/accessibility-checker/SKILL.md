---
name: accessibility-checker
description: Vérifie et améliore l'accessibilité web (WCAG 2.1/2.2). Se déclenche avec "accessibilité", "a11y", "WCAG", "screen reader", "ARIA", "contraste", "accessible", "handicap", "lecteur d'écran". Also triggers on "accessibility audit", "WCAG compliance", "screen reader issues".
---

# Accessibility Checker

## Workflow en étapes

### 1. Audit automatisé — base de départ

Lancer les outils automatisés pour couvrir ~30-40 % des problèmes détectables :

```bash
# axe-core CLI (Node)
npx axe http://localhost:3000 --tags wcag2aa --reporter json > axe-report.json

# pa11y (CI-friendly)
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter json

# Lighthouse (headless)
npx lighthouse http://localhost:3000 --only-categories=accessibility --output json --quiet
```

Critère de décision : score Lighthouse >= 90 ET zéro violation axe `critical`/`serious` avant merge.

### 2. Navigation clavier (manuelle, ~5 min)

Parcourir la page **uniquement au clavier** (Tab / Shift+Tab / Enter / Espace / Flèches).

Checklist :
- [ ] Focus visible sur chaque élément interactif (ne pas faire `outline: none` sans alternative)
- [ ] Ordre de tab logique — suit le flux visuel de gauche à droite, haut en bas
- [ ] Skip link présent et fonctionnel (`<a href="#main-content" class="skip-link">Aller au contenu</a>`)
- [ ] Aucun keyboard trap (modale fermable avec Echap, focus retourné à l'élément déclencheur)
- [ ] Composants custom (datepicker, slider) utilisables sans souris

```css
/* Focus visible minimal — ne jamais supprimer sans remplacement */
:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}
```

### 3. Sémantique HTML et landmarks

```html
<!-- Structure minimale correcte -->
<header role="banner">…</header>
<nav aria-label="Navigation principale">…</nav>
<main id="main-content">
  <h1>Titre de la page</h1>   <!-- Un seul h1 par page -->
  …
</main>
<footer role="contentinfo">…</footer>
```

Pièges fréquents :
- Sauts de niveau de titre (`h1` → `h3`) : interdit
- Plusieurs `<main>` sans `hidden` sur les inactifs
- `<div>` et `<span>` cliquables sans `role` ni `tabindex`

### 4. ARIA — règle d'or

> Utiliser ARIA uniquement si le HTML natif ne peut pas exprimer le comportement.

```html
<!-- MAL : ARIA redondant -->
<button role="button" aria-label="Envoyer">Envoyer</button>

<!-- BIEN : HTML natif seul -->
<button type="submit">Envoyer</button>

<!-- BIEN : ARIA nécessaire (état dynamique) -->
<button aria-expanded="false" aria-controls="menu-id">Menu</button>
<ul id="menu-id" hidden>…</ul>

<!-- Live region pour les notifications -->
<div role="status" aria-live="polite" aria-atomic="true">
  <!-- Injecté dynamiquement par JS après action utilisateur -->
</div>
```

### 5. Contraste et couleurs

Ratios WCAG 2.1 AA :
| Contexte | Ratio minimum |
|---|---|
| Texte normal (< 18px / < 14px bold) | **4.5:1** |
| Grand texte (≥ 18px ou ≥ 14px bold) | **3:1** |
| Composants UI, bordures de champs | **3:1** |
| Texte décoratif / logo | exempt |

Outils rapides :
```bash
# Vérification couleur via CLI
npx color-contrast-checker "#ffffff" "#767676"  # retourne le ratio

# Extension VS Code : axe Accessibility Linter
# Extension Chrome : Colour Contrast Analyser
```

Anti-pattern : transmettre une information uniquement par la couleur (ex. champ en erreur affiché uniquement en rouge sans icône ni texte).

### 6. Images et médias

```html
<!-- Image porteuse de sens -->
<img src="graph.png" alt="Évolution du CA Q1-Q2 2025 : +12%">

<!-- Image décorative -->
<img src="separator.png" alt="" role="presentation">

<!-- Icône SVG inline cliquable -->
<button>
  <svg aria-hidden="true" focusable="false">…</svg>
  <span class="visually-hidden">Fermer la modale</span>
</button>
```

```css
/* Classe utilitaire — masque visuellement mais accessible aux AT */
.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
}
```

### 7. Formulaires accessibles

```html
<!-- Association explicite label / champ -->
<label for="email">Adresse email <span aria-hidden="true">*</span></label>
<input type="email" id="email" name="email"
       required aria-required="true"
       aria-describedby="email-error">
<p id="email-error" role="alert" hidden>
  Veuillez saisir un email valide.
</p>
```

Critères de validation :
- Message d'erreur lié au champ via `aria-describedby`
- `role="alert"` ou `aria-live="assertive"` pour les erreurs dynamiques
- Ne pas désactiver le bouton Submit — préférer valider après tentative
- Grouper les champs liés dans `<fieldset>` + `<legend>`

### 8. Intégration CI/CD

```yaml
# GitHub Actions — pa11y-ci
- name: Accessibility tests
  run: |
    npx pa11y-ci --sitemap http://localhost:3000/sitemap.xml \
      --config .pa11yci.json
```

```json
// .pa11yci.json
{
  "standard": "WCAG2AA",
  "timeout": 30000,
  "ignore": [],
  "runners": ["axe"]
}
```

### 9. Tests avec lecteurs d'écran (manuel)

| OS | Lecteur | Raccourci navigation |
|---|---|---|
| Windows | NVDA (gratuit) | `H` = titres, `F` = formulaires, `B` = boutons |
| macOS/iOS | VoiceOver | `VO+U` = rotor, `VO+Cmd+H` = titres |
| Android | TalkBack | Swipe droite = élément suivant |

Scénario minimal à tester : chargement page → navigation landmarks → remplissage formulaire → soumission → lecture du message de confirmation.

## Garde-fous et anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| `outline: none` sans alternative | focus invisible | utiliser `:focus-visible` avec style custom |
| `<div onclick>` sans `role`/`tabindex` | inaccessible au clavier | remplacer par `<button>` |
| `aria-label` dupliquant le texte visible | redondance verbale | supprimer l'attribut |
| Placeholder comme seul label | disparaît à la saisie | ajouter un vrai `<label>` |
| `tabindex > 0` | ordre de focus imprévisible | utiliser uniquement `tabindex="0"` ou `-1` |
| Alt text = nom du fichier | inutile pour les AT | décrire le sens de l'image |
| Contraste validé en light mode seulement | échec en dark mode | tester les deux thèmes |

## Référence critères WCAG

Critères AA les plus souvent violés en pratique :
- **1.1.1** Alternatives textuelles (alt, aria-label)
- **1.3.1** Info et relations (sémantique HTML)
- **1.4.3** Contraste (minimum)
- **2.1.1** Clavier
- **2.4.3** Ordre du focus
- **2.4.7** Focus visible
- **3.3.1** Identification des erreurs
- **4.1.2** Nom, rôle, valeur (ARIA correct)

Toujours citer le critère exact (ex. WCAG 2.1 — 1.4.3 AA) dans les rapports.
