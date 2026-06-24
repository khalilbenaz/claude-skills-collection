---
name: communication-pitch-deck-designer
description: Création de pitch decks pour startups et projets avec structure, métriques et appel à l'action. Se déclenche avec "pitch deck", "présentation investisseur", "levée de fonds", "startup pitch", "deck". Génère des slides structurées slide par slide, formule les métriques clés, adapte la narration au stade de maturité et au profil investisseur.
---

# Pitch Deck Designer

## Étape 0 — Recueil des paramètres (obligatoire avant toute génération)

Collecter impérativement :

| Paramètre | Exemples |
|---|---|
| Stade | pré-seed · seed · série A · série B |
| Secteur | SaaS B2B · marketplace · deeptech · fintech |
| Montant recherché | 500 k€ · 2 M€ · 10 M€ |
| Profil investisseur | VC généraliste · corporate VC · business angel · family office |
| Métriques disponibles | MRR, ARR, churn, NPS, CAC, LTV, croissance M/M |
| Format cible | présentation live (10 min) · envoi email · one-pager |

---

## Étape 1 — Structure cible par stade

### Pré-seed (≤ 12 slides)
```
1. Cover + one-liner
2. Problème (viscéral, chiffré)
3. Solution
4. Produit (démo / screenshots)
5. Marché (TAM/SAM/SOM)
6. Business model
7. Traction early (signaux, lettres d'intention, beta users)
8. Équipe
9. Ask + use of funds
10. Appendice (optionnel)
```

### Seed (≤ 14 slides)
```
1. Cover + hook
2. Problème
3. Solution
4. Produit + démo
5. Marché
6. Business model + unit economics
7. Traction (graphiques MRR/ARR, cohortes rétention)
8. Go-to-Market
9. Compétition (matrice positionnement)
10. Équipe + advisors
11. Financials (P&L 3 ans)
12. Ask + milestones 18 mois
13. Appendice
```

### Série A (≤ 16 slides) : même squelette + deep dive métriques (slide 7 étendue), roadmap produit, cap table actuel.

---

## Étape 2 — Formules de contenu par slide critique

### Slide Problème
```
Format :
[Persona] doit [situation actuelle] mais [friction/coût/risque].
Cela coûte [chiffre €/$] par [unité de temps] à l'industrie.

Exemple (SaaS RH) :
"Les PME de 50-500 employés gèrent les congés par email et Excel.
Erreurs de paie, litiges RH → 8h perdues/semaine/manager.
Coût secteur France : 2,3 Md€/an (source : INSEE 2024)."
```

### Slide Solution (règle des 3 bullets max)
```
[Produit] permet à [persona] de [verbe d'action] en [temps/facilité],
sans [point de douleur éliminé].

→ bullet 1 : valeur principale (ROI, gain temps, réduction coût)
→ bullet 2 : différenciateur clé (AI, intégrations, UX)
→ bullet 3 : preuve (case study, NPS, chiffre client)
```

### Slide Marché — calcul TAM/SAM/SOM
```
TAM = marché total adressable (top-down, source fiable)
SAM = segment que votre GTM peut atteindre (bottom-up)
SOM = réaliste à 3 ans (SAM × taux pénétration cible)

Exemple :
TAM : 12 Md€ (gestion RH PME Europe, Gartner 2025)
SAM : 1,8 Md€ (PME 50-500 France+Bénélux, SaaS cloud)
SOM : 54 M€ ARR en année 3 (3 % du SAM)
```

### Slide Traction — graphiques à prioriser
```
Ordre d'impact décroissant :
1. Courbe ARR/MRR avec CAGR affiché
2. Net Revenue Retention (NRR > 110 % = excellent)
3. Cohortes rétention (D30, D90, D180)
4. CAC Payback Period (< 12 mois pour SaaS seed)
5. Pipeline signé + LOI
```

### Slide Financials (série A)
```
Tableau P&L simplifié sur 3 ans :
        Année 1   Année 2   Année 3
ARR      0,8 M€    3,2 M€   10 M€
Charges  1,2 M€    2,8 M€    7 M€
EBITDA  -0,4 M€    0,4 M€    3 M€
Cash     18 mois   ...       ...

Hypothèses clés à indiquer en note de bas de slide.
```

### Slide Ask
```
Structure :
"Nous levons [montant] pour [durée] mois de runway.
Utilisation :
  - [%] Product & Tech : [objectif précis]
  - [%] Sales & Marketing : [objectif précis]
  - [%] Ops / G&A
Milestones clés :
  → [M+6] : [KPI cible]
  → [M+12] : [KPI cible]
  → [M+18] : [KPI = critère série suivante]"
```

---

## Étape 3 — Storytelling et fil narratif

Appliquer le framework **Problem → Stakes → Solution → Proof → Vision** :

1. **Problem** : ancrer dans une réalité que l'investisseur ressent ou comprend
2. **Stakes** : si rien ne change, que se passe-t-il ? (chiffre de marché manqué, coût croissant)
3. **Solution** : votre réponse précise, pas générique
4. **Proof** : traction, témoignage client, donnée d'usage
5. **Vision** : dans 5 ans, quel monde avez-vous construit ? (exit potentiel, part de marché)

**One-liner mémorable** — template :
```
"[Nom] est le [référence connue] pour [persona] qui [problème],
sans [friction principale]."

Ex : "Payroll.io est le Stripe for payroll pour les PME africaines
qui paient encore leurs employés en espèces, sans infrastructure bancaire."
```

---

## Étape 4 — Adaptation au profil investisseur

| Profil | Accent | À éviter |
|---|---|---|
| VC généraliste | Scalabilité, TAM, exit potentiel | Slides trop techniques |
| Corporate VC | Synergies, fit stratégique | Concurrence frontale avec la maison mère |
| Business angel | Équipe, conviction fondateur | Trop de jargon financier |
| Family office | Profitabilité, capital préservation | Projections irréalistes |

---

## Garde-fous et anti-patterns

**Contenu**
- Ne jamais écrire "notre marché est de 100 Md€" sans segmentation SAM/SOM — signal de manque de rigueur
- Éviter "pas de concurrents" — remplacer par matrice de positionnement (axes : prix × sophistication)
- Ne pas mélanger ARR et MRR dans le même graphique sans conversion explicite
- Projections financières > 3x la croissance actuelle sans driver explicite = red flag

**Format**
- Pas plus de 40 mots par slide en mode présentation live
- Pas de tableaux Excel copiés tels quels (illisibles à 4 mètres)
- Police minimum 24pt pour le corps, 36pt pour les titres
- Palette 2-3 couleurs max ; pas de fond noir sauf brand forte

**Process**
- Ne pas envoyer le deck complet par email sans version "lecture autonome" avec notes
- Toujours préparer 5 questions difficiles et les réponses (due diligence simulée)
- Deck ≠ business plan : le deck ouvre la conversation, il ne la remplace pas

---

## Bonnes pratiques 2026

- **AI-assisted visuals** : Utiliser Gamma.app, Beautiful.ai ou Canva AI pour prototyper rapidement ; exporter en PDF/PPTX pour personnalisation
- **Data rooms** : Notion, Docsend ou Papermark pour tracker les ouvertures et le temps par slide
- **Benchmarks sectoriels** : référencer Crunchbase, PitchBook ou Dealroom pour valider les multiples de valorisation
- **Narration audio** : certains fonds demandent un Loom de 3 min du fondateur en plus du deck — préparer le script
- **Version mobile** : 30 % des VCs ouvrent le deck sur mobile (Docsend 2025) — vérifier la lisibilité

---

## Appendice recommandé

Slides supplémentaires à préparer mais non montrées par défaut :

- Détail des hypothèses financières
- Cohortes de rétention complètes
- Organigramme équipe + prochains recrutements
- Comparatif concurrents détaillé
- Cap table actuel + pré/post money simulation
- FAQ due diligence (questions types levée)


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
