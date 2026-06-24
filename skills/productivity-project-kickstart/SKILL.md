---
name: productivity-project-kickstart
description: Structure le lancement d'un projet avec objectifs, livrables, étapes et risques. À utiliser quand l'utilisateur commence un nouveau projet. Se déclenche aussi avec "je lance un projet", "nouveau projet", "par où commencer", "plan de projet", "brief projet", "cahier des charges".
---

# Project Kickstart

Produit un **Project Brief** d'une page, actionnable, adapté au type de projet (perso, side project, pro, tech, client).

---

## Workflow en 8 étapes

### 1. Collecter le contexte minimal

Avant tout, poser ces 3 questions (en une seule fois) :

```
1. Quel est l'objectif principal en 1 phrase ?
2. Qui sont les parties prenantes clés (décideur, équipe, client) ?
3. Y a-t-il une date butoir ou contrainte critique ?
```

Ne pas structurer avant d'avoir ces réponses.

---

### 2. Formuler la Vision (Problem Statement)

Format : `[Pour] <utilisateur> [qui] <problème>, <nom du projet> est un <type de solution> [qui] <bénéfice principal>.`

Exemple concret :
```
Pour l'équipe support qui perd du temps sur les tickets redondants,
BacklogBot est un agent IA qui classe et répond automatiquement
aux tickets de niveau 1 — réduisant le temps de traitement de 60 %.
```

Critère de validation : si la phrase contient "nous", elle est trop floue. Reformuler.

---

### 3. Délimiter le Périmètre (Scope)

Toujours produire un tableau IN / OUT :

| IN (inclus dans v1) | OUT (hors périmètre) |
|---|---|
| Authentification utilisateur | SSO / OAuth tiers |
| Dashboard lecture seule | Export PDF |
| API REST JSON | SDK mobile |

Règle : tout ce qui n'est pas explicitement IN est OUT par défaut.

---

### 4. Définir les Livrables

Liste numérotée, chaque livrable doit être **vérifiable** (pas "une bonne appli", mais "API déployée sur staging avec 95 % uptime mesuré").

Exemple :
```
1. Spécification fonctionnelle signée (J+5)
2. Prototype cliquable Figma validé par le client (J+15)
3. API v1 déployée en staging (J+30)
4. Documentation technique OpenAPI (J+35)
5. Recette utilisateur passée à 0 bug bloquant (J+45)
```

---

### 5. Roadmap avec Milestones

Utiliser des phases plutôt que des semaines flottantes :

```
Phase 0 — Cadrage      : J0  → J+5   (brief validé, stack choisie)
Phase 1 — Foundation   : J+5  → J+20  (setup infra, auth, CI/CD)
Phase 2 — Core MVP     : J+20 → J+40  (features critiques)
Phase 3 — Stabilisation: J+40 → J+50  (tests, perf, sécurité)
Phase 4 — Go-live      : J+50          (déploiement prod, monitoring)
```

Pour les projets tech : créer les milestones directement dans le repo si demandé :
```bash
gh milestone create "Phase 1 — Foundation" --due-date 2026-07-15
gh milestone create "MVP Go-live" --due-date 2026-08-30
```

---

### 6. Ressources et Stack

Matrice minimale :

| Ressource | Qui / Quoi | Disponibilité |
|---|---|---|
| Tech Lead | Khalil | 100 % |
| Dev backend | À recruter | 80 % dès J+5 |
| Infrastructure | Cloudflare Workers + D1 | immédiat |
| Budget CI/CD | 50 $/mois | validé |

Pour les projets solo : indiquer les outils et le temps hebdo disponible.

---

### 7. Risques et Mitigations

Format : 3 à 5 risques maximum, classés par probabilité × impact.

| # | Risque | Prob. | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Dépendance API tierce instable | Haute | Critique | Circuit breaker + mock local |
| R2 | Glissement de périmètre client | Moyenne | Haute | Clause de change request dans le contrat |
| R3 | Équipe réduite en août | Haute | Moyenne | Anticiper la phase stabilisation en juillet |

---

### 8. Critères de Succès (DoD Projet)

Définir des métriques mesurables, pas des intentions :

```
- Temps de réponse API P95 < 200 ms en prod
- Couverture de tests >= 80 %
- 0 vulnérabilité critique (OWASP Top 10) au go-live
- NPS client >= 7/10 à 30 jours post-lancement
- Coût infra mensuel <= budget validé ± 15 %
```

---

## Output : Project Brief (template)

```markdown
# Project Brief — [Nom du projet]
**Date :** YYYY-MM-DD | **Owner :** [nom] | **Version :** 1.0

## Vision
[1 phrase Problem Statement]

## Périmètre
**IN :** [liste]
**OUT :** [liste]

## Livrables & Dates
[liste numérotée avec dates]

## Roadmap
[phases avec jalons]

## Ressources
[matrice]

## Top 3 Risques
[tableau]

## Critères de succès
[liste mesurable]

## Prochaine action immédiate
> [1 seule action concrète à faire dans les 24h]
```

---

## Anti-patterns / Pièges à éviter

- **Big Bang scope** : tout mettre en v1. Couper sans pitié — une feature non livrée vaut mieux qu'une feature boguée.
- **Dates sans buffer** : prévoir systématiquement 20 % de marge sur chaque phase.
- **Livrables vagues** : "application fonctionnelle" n'est pas un livrable. Toujours une condition de vérification observable.
- **Risques sans owner** : chaque risque doit avoir une personne responsable de la mitigation.
- **Brief non signé** : pour un projet client, pas de démarrage sans validation écrite du brief (email suffit).
- **Stack choisie avant le périmètre** : la technologie découle du besoin, jamais l'inverse.

---

## Critères d'adaptation selon le contexte

| Type de projet | Ajustements |
|---|---|
| Side project solo | Supprimer colonnes "qui", simplifier risques, ajouter section "motivation / pourquoi maintenant" |
| Projet client facturable | Ajouter clause de change request, budget détaillé, jalons de facturation |
| Projet open-source | Ajouter section CONTRIBUTING, licence, roadmap publique (GitHub Projects) |
| Migration technique | Ajouter plan de rollback, fenêtre de maintenance, critères go/no-go |


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
