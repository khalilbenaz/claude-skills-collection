---
name: dev-project-estimation-helper
description: Estimation de projets logiciels avec méthodes éprouvées, buffers calibrés et communication honnête des fourchettes. Se déclenche avec "estimation", "combien de temps", "planning", "story points", "estimation projet", "délai", "effort", "PERT", "t-shirt sizing".
---

# Project Estimation Helper

## Workflow en 8 étapes

### 1. Cadrer le scope avant tout

Construire un Work Breakdown Structure (WBS) descendant :
- Niveaux : Épiques → User Stories → Tâches techniques
- Règle du 2 jours : toute tâche > 2 jours doit être redécoupée
- Écrire explicitement ce qui est **hors scope** — un out-of-scope flou est la première cause de dérive

```
WBS exemple (feature "Paiement carte") :
├── US1 — Saisie carte (FE)         : 3j
│   ├── Composant form + validation  : 1j
│   ├── Intégration SDK Stripe       : 1j
│   └── Tests + revue                : 1j
├── US2 — Webhook confirmation (BE)  : 2j
└── US3 — Email de reçu              : 1j
TOTAL feature : 6j dev + 1j QA + 0,5j deploy = 7,5j
```

### 2. Choisir la technique selon le contexte

| Contexte | Technique | Précision |
|---|---|---|
| Avant-vente / PMO, besoin rapide | T-shirt sizing (XS/S/M/L/XL) | ±50 % |
| Sprint Agile, équipe impliquée | Planning poker (Fibonacci) | ±25 % |
| Tâche à haute incertitude | Three-point PERT | ±15 % |
| Feature similaire au passé | Estimation par analogie | ±10 % |
| Projet complexe multi-équipes | Decomposition + bottom-up | ±20 % |

**PERT formula** :
```
E = (O + 4×M + P) / 6
σ = (P - O) / 6
Fourchette 95 % = E ± 2σ

Ex: O=3j, M=5j, P=12j → E=5,8j, σ=1,5 → fourchette [2,8j ; 8,8j]
```

### 3. Décomposer l'effort par catégorie

Ne jamais estimer que le code. Répartition typique d'une feature :

```
Développement (code)    : 45 %
Tests (unit + intégr.)  : 20 %
Revue de code + fixes   : 10 %
Documentation           : 5 %
Déploiement / DevOps    : 10 %
Réunions / coordination : 10 %
─────────────────────────────
                  TOTAL : 100 %
```

En pratique : **multiplier l'estimation "code seul" par 1,8 à 2,2**.

### 4. Calibrer les buffers selon l'incertitude

Appliquer le **cône d'incertitude** :

| Phase projet | Variance possible | Buffer recommandé |
|---|---|---|
| Concept / avant specs | ×4 (−75 % / +300 %) | 60-80 % |
| Specs fonctionnelles OK | ×2 (−50 % / +100 %) | 40-50 % |
| Design technique validé | ×1,5 (−33 % / +50 %) | 25-35 % |
| Début implémentation | ×1,25 (−20 % / +25 %) | 15-20 % |
| Code complet, tests en cours | ×1,1 | 5-10 % |

Distinguer :
- **Contingence** = risques identifiés et quantifiés (intégrée à l'estimation)
- **Réserve management** = risques inconnus (tenue séparée, jamais publiée)

### 5. Identifier et quantifier les risques

Pour chaque risque : `Exposition = Probabilité × Impact (jours)`

```
RISQUES TECHNIQUES
──────────────────
API tierce instable        : P=40 %, I=5j → E=2j  → intégrer 2j
Migration base legacy      : P=60 %, I=8j → E=4,8j → intégrer 5j
Tech jamais utilisée       : P=70 %, I=6j → E=4,2j → intégrer 4j

RISQUES ORGANISATIONNELS
────────────────────────
Specs non finalisées       : P=50 %, I=10j → E=5j  → bloquer livraison
Dépendance équipe externe  : P=30 %, I=15j → E=4,5j → mitigation SLA
```

Critère de décision : exposition > 3 jours → intégrer directement dans l'estimation, pas juste dans les risques.

### 6. Construire la timeline et le chemin critique

```bash
# Identifier le chemin critique avec un diagramme réseau
# (ou outil : MS Project, Linear, Jira Advanced Roadmaps)

Tâche A (5j) → Tâche C (3j) → Tâche E (2j)  ← chemin critique = 10j
Tâche B (4j) → Tâche D (2j)                   ← slack = 4j
```

Règles de planification :
- **Paralleliser** les tâches sans dépendance → gain de durée
- **Buffer de stabilisation** : prévoir 1 sprint "freeze + bugfixes" avant chaque release majeure
- **Exclure** : congés, jours fériés, on-call, séminaires (→ utiliser la capacité nette)

```
Capacité nette / sprint 2 semaines (équipe 3 devs) :
= 3 × 10j × 0,75 (overhead 25 %)
= 22,5 jours-personne disponibles
```

### 7. Communiquer la fourchette — format standard

**Ne jamais donner un chiffre unique.** Template de communication :

```
ESTIMATION — [Feature / Projet X]
Date : YYYY-MM-DD | Niveau de détail : [Conception / Design / Impl.]

  Optimiste  (hypothèses favorables)  :  8 semaines
  Réaliste   (baseline)               : 12 semaines  ← référence
  Pessimiste (risques activés)        : 18 semaines

Confiance sur la fourchette réaliste : 70 %

HYPOTHÈSES CLÉS
───────────────
- Specs figées au 2026-07-15
- Équipe complète (3 devs, 1 QA)
- Intégration API X disponible et documentée

TRADE-OFFS
──────────
- Réduire scope de 20 % → gain de 3 semaines
- Ajouter 1 dev senior → réduit pessimiste à 14 sem.
```

### 8. Suivre et recalibrer

Métriques à mesurer chaque sprint :

```
Velocity réelle = story points livrés / sprint
Accuracy        = estimation initiale / temps réel (objectif : 0,8–1,2)
Scope creep     = stories ajoutées post-planning / stories initiales
```

- Re-estimer formellement si scope change > 15 % ou si velocity dévie > 20 %
- Tenir un **estimation log** : date, estimé, réel, cause d'écart
- Rétrospective d'estimation : 15 min par sprint — "qu'est-ce qu'on a mal calibré ?"

---

## Anti-patterns — pièges fréquents

| Anti-pattern | Symptôme | Remède |
|---|---|---|
| Estimation sous pression | "On dit 6 semaines pour ne pas perdre le contrat" | Présenter les trade-offs, jamais plier sur le réaliste |
| Paralysis by analysis | WBS de 200 tâches pour un MVP | Cap : max 3 niveaux de découpage |
| Padding caché | Buffer dissimulé dans chaque tâche | Buffer explicite et centralisé |
| Estimation individuelle sans revue | Un seul dev estime tout seul | Planning poker ou peer review obligatoire |
| Scope creep non tracé | "On ajoute juste un petit truc" | Toute story ajoutée = re-estimation + accord PM |
| Ignorer la dette technique | "On l'ajoutera plus tard" | Allouer 15-20 % de la vélocité au tech debt |
| Estimation en jours calendaires | Confondre 5j dev et 1 semaine | Toujours estimer en jours-personne, convertir ensuite |

## Garde-fous

- **Jamais** d'estimation sur specs orales — exiger un brief écrit minimal
- **Jamais** de date de livraison fixée avant l'étape 3 (décomposition complète)
- Si une tâche ne peut pas être décomposée → c'est un spike (time-boxé 1-2 jours) avant re-estimation
- Les estimations faites il y a > 4 semaines sont périmées si le contexte a changé
- Un stakeholder qui "accepte" uniquement le scénario optimiste = risque projet → escalader

## Références rapides

```
Fibonacci story points : 1 2 3 5 8 13 21 (> 13 = à redécouper)
T-shirt → jours (calibration typique)
  XS=0,5j  S=1-2j  M=3-5j  L=6-10j  XL=10-20j  XXL=spike requis

Buffer minimal par technologie :
  Stack maîtrisée         : +20 %
  Stack partiellement new : +35 %
  Stack inconnue          : +60 %
  Refactoring legacy      : +50-80 %
```


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
