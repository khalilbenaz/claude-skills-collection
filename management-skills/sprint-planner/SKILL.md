---
name: sprint-planner
description: Aide à planifier des sprints agile, organiser le backlog, estimer les stories et gérer la capacité de l'équipe. Se déclenche avec "sprint", "sprint planning", "backlog", "vélocité", "agile", "scrum". Also triggers on "plan a sprint", "groom the backlog", "team capacity planning".
---

# Sprint Planner

## Workflow

### Étape 1 — Collecter le contexte équipe

Avant toute estimation, recueillir :

| Info | Exemple |
|---|---|
| Taille équipe | 5 devs + 1 QA |
| Durée sprint | 2 semaines (10 jours ouvrés) |
| Absences connues | 2 jours congés (dev A), 1 jour formation (dev B) |
| Focus factor historique | 0.70 (70 % du temps sur le sprint) |

> Focus factor = temps réellement productif / temps calendaire disponible. Partir sur 0.65–0.75 si inconnu.

---

### Étape 2 — Calculer la capacité réelle

```
Capacité (points) = vélocité_moyenne_3_derniers_sprints × (jours_disponibles / jours_sprint_complet)

Exemple :
- Vélocité moyenne : 40 pts
- Jours disponibles : 10j - 3j absences = 7j
- Jours sprint complet : 10j
- Capacité ajustée : 40 × (7/10) = 28 pts
```

Buffer obligatoire : soustraire 10–15 % pour support, incidents, revues de PR.

```
Capacité nette = 28 × 0.85 = ~24 pts
```

---

### Étape 3 — Vérifier la Definition of Ready (DoR)

Chaque story candidate doit cocher **tous** les critères avant d'entrer dans le sprint :

- [ ] Rédigée en format user story : "En tant que `<rôle>`, je veux `<action>` afin de `<valeur>`"
- [ ] Critères d'acceptation listés (format Given/When/Then ou liste à puces)
- [ ] Estimée (story points ou T-shirt size)
- [ ] Dépendances identifiées et déblocables dans le sprint
- [ ] Maquette/design disponible si besoin
- [ ] Pas de blocker technique connu non résolu

Story qui échoue à la DoR → retour au backlog, pas de négociation.

---

### Étape 4 — Estimer avec Planning Poker

Séquence Fibonacci recommandée : `1, 2, 3, 5, 8, 13, 21, ?`

Règles d'animation :
1. PO lit la story + critères d'acceptation.
2. Chaque dev vote en silence (cartes physiques ou outil type PlanningPoker.com / Jira).
3. Révéler simultanément.
4. Si écart > 2 niveaux → discussion de 2 min max, puis re-vote.
5. Consensus = valeur la plus basse sur laquelle l'équipe est à l'aise.

Critères de décision rapide :

| Points | Signal |
|---|---|
| 1–3 | Story triviale, attention aux oublis cachés |
| 5–8 | Taille idéale |
| 13 | Limite haute, envisager un découpage |
| 21+ | Trop gros — découper obligatoirement |

---

### Étape 5 — Sélectionner les stories

1. Trier le backlog par priorité PO (MoSCoW ou ordre Jira/ADO).
2. Ajouter les stories dans le sprint du plus prioritaire au moins prioritaire **jusqu'à atteindre la capacité nette**.
3. Ne jamais dépasser la capacité nette, même si le PO insiste.
4. Si une story dépasse seule la capacité restante → la découper ou la reporter.

```
Exemple : capacité nette = 24 pts
Story #101 : 8 pts  → total = 8  ✓
Story #102 : 5 pts  → total = 13 ✓
Story #103 : 8 pts  → total = 21 ✓
Story #104 : 5 pts  → total = 26 ✗ → reporter
Story #105 : 3 pts  → total = 24 ✓ (si #104 reportée)
```

---

### Étape 6 — Décomposer en tâches techniques

Pour chaque story retenue, créer des tâches (< 1 jour chacune idéalement) :

```
Story : "Afficher le solde en temps réel"
Tâches :
  - [ ] Endpoint GET /account/balance (dev, 3h)
  - [ ] Intégration front composant BalanceWidget (dev, 4h)
  - [ ] Tests unitaires service + composant (dev, 2h)
  - [ ] Test E2E scénario solde (QA, 2h)
```

Tâche > 8h → la redécouper.

---

### Étape 7 — Formuler le Sprint Goal

Un seul objectif, 1–2 phrases, orienté valeur métier (pas liste de features) :

```
Bon : "Permettre au client de consulter son solde et d'initier un virement depuis l'app mobile."
Mauvais : "Finir les stories #101, #102 et #105."
```

Le sprint goal guide les arbitrages en cours de sprint si un imprévu survient.

---

### Étape 8 — Clôturer le sprint planning

- Équipe confirme verbalement l'engagement sur le contenu.
- Sprint backlog verrouillé dans l'outil (Jira, Azure DevOps, Linear...).
- Sprint goal affiché sur le board.
- Date/heure de la Daily, Review et Rétro fixées.

---

## Anti-patterns à éviter

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Surcharger la capacité "parce qu'on est motivés" | Carry-over chronique, moral en berne | Respecter la capacité nette sans exception |
| Stories floues sans critères d'acceptation | Débat en fin de sprint, rejet en review | DoR stricte, retour backlog si flou |
| Estimer sous pression du PO | Estimates biaisés, retard garanti | Votes anonymes, règle des 2 min de discussion |
| Sprint goal = liste de tickets | Aucune cohérence, arbitrage impossible | 1 objectif métier unique, formulé en valeur |
| Tâches de > 1 jour | Manque de visibilité, blocages invisibles | Découpage systématique à < 8h |
| Ignorer la dette technique | Vélocité qui s'effondre sprint après sprint | Réserver 15–20 % de la capacité à la dette |

---

## Bonnes pratiques 2026

- **Vibe check en ouverture** : 2 min pour que chacun dise son niveau d'énergie (1–5). Identifie les surcharges cachées avant de commencer.
- **Definition of Done (DoD) visible** : affiché sur le board, mise à jour à chaque rétro. Sans DoD partagée, "terminé" ne veut rien dire.
- **Velocity trend** : surveiller la tendance sur 6 sprints, pas seulement la moyenne des 3 derniers. Une tendance baissière est un signal d'alerte.
- **Async planning possible** : pour les équipes distribuées, utiliser un outil de Planning Poker async (Jira/ADO + extension, PlanningPoker.com) plutôt qu'une réunion synchrone de 3h.
- **Refine ≠ Plan** : le backlog refinement (grooming) doit précéder le sprint planning d'au moins 48h. Ne pas faire les deux le même jour.
