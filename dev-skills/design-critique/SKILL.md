---
name: design-critique
description: Critique constructive d'interfaces et suggestions d'amélioration UX/UI. Se déclenche avec "critique mon design", "avis sur mon UI", "améliorer mon interface", "feedback design", "review UX", "est-ce que mon design est bon", "UI review".
---

# Design Critique

## Workflow

### 1. Contexte et périmètre (avant tout)
Identifier avant de commencer :
- Cible utilisateur (consumer grand public / B2B / développeurs / seniors)
- Plateforme (web desktop, mobile native iOS/Android, tablette, TV)
- Stade du projet (wireframe, maquette haute-fidélité, produit live)
- Contraintes connues (charte graphique imposée, dark mode requis, accessibilité légale RGAA/WCAG)

### 2. Première impression — les 5 secondes
Répondre à ces trois questions sans réfléchir :
1. Qu'est-ce que ce produit fait ?
2. À qui s'adresse-t-il ?
3. Quelle action suis-je censé faire maintenant ?

Si l'une des réponses est floue → problème de clarté à signaler en priorité.

### 3. Hiérarchie visuelle
Vérifier avec le test du "blur" (défocaliser mentalement l'écran) :

| Niveau | Signal attendu | Anti-pattern |
|--------|---------------|--------------|
| H1 — titre principal | Largest element, bold | Plusieurs éléments de même poids |
| CTA principal | Couleur contrastante, seul de son type | Deux boutons primaires côte à côte |
| Body content | Lisible, subordonné au titre | Même taille que les titres |
| Metadata / labels | Réduit, discret | Trop proche du corps |

### 4. Typographie — critères mesurables
```
Taille corps          : ≥ 16px (mobile ≥ 14px uniquement pour labels)
Line-height body      : 1.4 – 1.6
Longueur de ligne     : 45 – 75 ch (CSS: max-width: 75ch)
Nombre de fontes      : ≤ 2 (une pour les titres, une pour le corps)
Contrastes de taille  : H1/body ratio ≥ 2x
```

Outil de vérification rapide : `https://typescale.com` (générer la scale et comparer).

### 5. Couleurs et contraste WCAG
Seuils obligatoires :

| Contexte | Ratio minimum (AA) | Ratio idéal (AAA) |
|----------|--------------------|-------------------|
| Texte normal | 4.5:1 | 7:1 |
| Texte large (≥ 18px bold) | 3:1 | 4.5:1 |
| Éléments UI (bordures, icônes) | 3:1 | — |

Outil : `npx color-contrast-checker` ou `https://webaim.org/resources/contrastchecker/`

Vérifier aussi :
- Mode daltonisme (deuteranopie) : ne jamais coder une info par la couleur seule → toujours ajouter icône ou label.
- Dark mode : tester avec `prefers-color-scheme: dark` si applicable.

### 6. Spacing et grille
Utiliser une spacing scale cohérente (exemple Tailwind / Material 8px base) :
```
4px  (0.25rem) — séparateur interne
8px  (0.5rem)  — gap entre éléments liés
16px (1rem)    — padding standard de card
24px (1.5rem)  — gap entre sections
32px (2rem)    — section breathing room
48px (3rem)    — séparation majeure
```

Anti-pattern : spacing arbitraire (13px, 22px, 37px) → toujours arrondir à la scale.

### 7. Composants et interactions
Checklist :
- [ ] Affordance : les boutons ont une forme reconnaissable de bouton (shadow, border-radius, fond plein)
- [ ] États : `hover`, `active`, `focus-visible`, `disabled` définis pour chaque composant interactif
- [ ] Focus visible : outline ≥ 2px visible (ne jamais `outline: none` sans alternative)
- [ ] Touch targets (mobile) : ≥ 44×44px (Apple HIG) / 48×48dp (Material)
- [ ] Feedback d'erreur : message texte + couleur + icône (pas uniquement rouge)

Exemple CSS focus accessible :
```css
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}
```

### 8. Heuristiques de Nielsen — grille d'évaluation rapide
| # | Heuristique | Question à poser |
|---|-------------|-----------------|
| 1 | Visibilité du statut | L'utilisateur sait-il ce qui se passe ? (loaders, progress) |
| 2 | Correspondance monde réel | Le vocabulaire est-il celui de l'utilisateur, pas du développeur ? |
| 3 | Contrôle utilisateur | Peut-on annuler / revenir en arrière facilement ? |
| 4 | Consistance et standards | Les patterns suivent-ils la plateforme (iOS HIG / Material) ? |
| 5 | Prévention d'erreurs | Les erreurs sont-elles évitées avant de survenir (validation inline) ? |
| 6 | Reconnaissance > rappel | L'info nécessaire est-elle visible sans avoir à mémoriser ? |
| 7 | Flexibilité | Y a-t-il des raccourcis pour les utilisateurs avancés ? |
| 8 | Esthétique minimaliste | Chaque élément a-t-il une raison d'être ? |
| 9 | Aide à la récupération | Les messages d'erreur expliquent-ils comment corriger ? |
| 10 | Documentation | Le produit est-il utilisable sans aide ? Si non, la doc est-elle accessible ? |

### 9. Recommandations priorisées
Structurer le feedback en trois niveaux actionnables :

**P1 — Quick wins** (< 1 jour, fort impact)
- Corriger les ratios de contraste WCAG insuffisants
- Uniformiser le spacing sur la scale 8px
- Ajouter les états `hover`/`focus` manquants

**P2 — Améliorations majeures** (1 sprint)
- Refonte d'un composant ou d'un flow entier
- Restructuration de la hiérarchie visuelle d'une page

**P3 — Nice-to-have** (backlog)
- Micro-interactions et transitions
- Illustrations et empty states
- Dark mode

Chaque suggestion doit inclure : **problème observé → impact utilisateur → solution concrète** (avec référence visuelle ou snippet si possible).

---

## Anti-patterns courants (pièges fréquents)

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Deux CTA primaires côte à côte | L'utilisateur hésite, taux de conversion baisse | Un seul bouton primary ; l'autre en secondary/ghost |
| `outline: none` sans alternative | Inaccessible au clavier | Remplacer par `outline-offset` stylé |
| Couleur seule pour coder une info | Daltoniens exclus | Ajouter icône + label texte |
| Modals empilées | Désorientation complète | Une seule modal active ; préférer les drawers sur mobile |
| Animations > 300ms sur interactions répétées | Frustration utilisateur avancé | Respecter `prefers-reduced-motion` ; durée ≤ 200ms pour feedback immédiat |
| Densité identique desktop/mobile | Mobile illisible | Adapter la taille des touch targets et le spacing par breakpoint |
| 3+ niveaux de gris similaires | Hiérarchie invisible | Limiter à 3 grises distinctes (light / mid / dark) |

## Principes de référence
- **Gestalt** : proximité, similarité, continuité, fermeture → grouper les éléments liés visuellement.
- **Loi de Fitts** : les cibles importantes doivent être grandes et proches (CTA en bas de mobile, pas en haut).
- **Loi de Hick** : plus il y a de choix, plus la décision prend du temps → simplifier les menus.
- **Effet de primauté/récence** : les utilisateurs retiennent le premier et le dernier élément → placer les CTA à ces positions.
- **WCAG 2.2 (2024 standard)** : critère 2.5.8 Target Size minimum 24×24px, 3.2.6 Consistent Help.
