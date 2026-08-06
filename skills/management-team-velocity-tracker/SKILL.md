---
name: management-team-velocity-tracker
description: Suivi de la vélocité d'équipe et des métriques agile pour piloter la performance et la prévisibilité. Se déclenche avec "vélocité", "burndown", "lead time", "cycle time", "throughput", "métriques agile". Also triggers on "team velocity", "agile metrics", "predictability of the team".
---

# Team Velocity Tracker

## Workflow

### 1. Définir le périmètre de mesure
- Confirmer la durée du sprint (1, 2 ou 3 semaines) — elle doit rester constante.
- Identifier la source de données : Jira, Azure DevOps, Linear, Shortcut.
- Décider de l'unité : **story points** (estimation relative) ou **nombre de stories** (throughput). Les deux métriques sont complémentaires.

### 2. Extraire les données brutes (6–10 sprints minimum)

**Azure DevOps — requête WIQL pour extraire les stories complétées par sprint :**
```wiql
SELECT [System.Id], [System.Title], [Story Points], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate]
FROM WorkItems
WHERE [System.WorkItemType] = 'User Story'
  AND [System.State] = 'Done'
  AND [System.IterationPath] UNDER 'MonProjet\Sprint 1'
ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC
```

**Jira — JQL équivalent :**
```jql
project = MONPROJET AND issuetype = Story AND status = Done
AND sprint in closedSprints() ORDER BY sprint ASC
```

**Export CSV via Azure DevOps CLI :**
```bash
az boards query --wiql "SELECT [System.Id],[Story Points],[System.IterationPath] FROM WorkItems WHERE ..." --output table
```

### 3. Calculer les métriques fondamentales

| Métrique | Formule | Signal |
|---|---|---|
| Vélocité moyenne | Σ SP livrés / N sprints | Planification de release |
| Médiane | Valeur centrale des N sprints | Robuste aux outliers |
| Écart-type (σ) | √(Σ(x-μ)²/N) | Prévisibilité |
| Throughput | Nbre stories/sprint | Indépendant des estimations |
| Lead time | Date Done − Date Création | Réactivité end-to-end |
| Cycle time | Date Done − Date "In Progress" | Efficacité d'exécution |

**Règle de décision sur la stabilité :**
- σ < 20 % de la moyenne → équipe **prévisible**, planification fiable.
- σ entre 20–40 % → équipe **instable**, investiguer les causes.
- σ > 40 % → mesure non fiable, priorité à stabiliser avant de prévoir.

### 4. Construire les graphiques essentiels

**Velocity chart (Python/pandas) :**
```python
import pandas as pd, matplotlib.pyplot as plt

df = pd.DataFrame({
    'sprint': ['S1','S2','S3','S4','S5','S6'],
    'sp':     [32, 28, 35, 30, 33, 31]
})
mean_vel = df['sp'].mean()
df.plot(x='sprint', y='sp', kind='bar', title='Vélocité par sprint')
plt.axhline(mean_vel, color='red', linestyle='--', label=f'Moyenne {mean_vel:.0f} SP')
plt.legend(); plt.tight_layout(); plt.savefig('velocity.png')
```

**Graphiques clés à produire :**
- **Burndown** du sprint courant (SP restants vs. idéal).
- **Velocity chart** historique avec bande σ.
- **Cumulative Flow Diagram** (CFD) — détecter l'accumulation dans un état.
- **Lead time distribution** (histogramme + percentile 85).

### 5. Produire des prévisions par simulation Monte Carlo

Quand on a ≥ 10 sprints de throughput historique :

```python
import random, statistics

throughput_history = [6, 7, 5, 8, 6, 7, 9, 6, 7, 8]  # stories/sprint
backlog_remaining = 40  # stories à livrer
simulations = 10_000
results = []

for _ in range(simulations):
    sprints, done = 0, 0
    while done < backlog_remaining:
        done += random.choice(throughput_history)
        sprints += 1
    results.append(sprints)

p50 = statistics.median(results)
p85 = sorted(results)[int(0.85 * simulations)]
p95 = sorted(results)[int(0.95 * simulations)]
print(f"50 % → {p50} sprints | 85 % → {p85} | 95 % → {p95}")
```

**Lecture :** présenter trois dates de livraison (optimiste P50, réaliste P85, pessimiste P95) plutôt qu'une date unique.

### 6. Analyser les tendances et anomalies

Checklist d'analyse :
- [ ] Sprints atypiques identifiés (congés, incidents, onboarding) → les **exclure ou annoter**, ne pas les corriger.
- [ ] CFD montre-t-il un goulot ? (largeur d'une colonne qui s'élargit = blocage).
- [ ] Cycle time en hausse → dette technique, WIP trop élevé, ou dépendances externes.
- [ ] Lead time > 3× cycle time → tickets restent trop longtemps en backlog.
- [ ] Vélocité en baisse progressive → signal d'alerte burnout ou dette.

### 7. Formuler des recommandations actionnables

Structurer chaque recommandation ainsi :
```
Problème observé : cycle time médian passé de 3 à 6 jours sur les 4 derniers sprints.
Hypothèse : revues de code bloquantes (> 48 h d'attente en moyenne).
Action : limiter WIP à N/2 (N = taille d'équipe), définir SLA review ≤ 1 jour ouvré.
Mesure du succès : cycle time < 4 jours d'ici 3 sprints.
```

---

## Garde-fous & anti-patterns

| Anti-pattern | Risque | Correctif |
|---|---|---|
| Comparer la vélocité de deux équipes | Story points non comparables entre équipes | Utiliser le throughput si comparaison nécessaire |
| Augmenter la vélocité comme objectif | Inflation des estimations, qualité dégradée | La vélocité sert à **prévoir**, pas à évaluer la performance |
| Moyenne sur < 3 sprints | Statistiquement non significatif | Attendre 5+ sprints avant toute décision |
| Inclure les sprints 0 / perturbés | Fausse les projections | Annoter et exclure des calculs de base |
| Ignorer le WIP | Cache la vraie cause de lenteur | Afficher le WIP en temps réel sur le board |
| Prédire une date unique | Fausse confiance | Toujours présenter intervalles de confiance |

---

## Bonnes pratiques 2026

- **Flow metrics > story points** : les équipes matures privilégient le cycle time et le throughput (pas d'estimation biaisée). Les story points restent utiles pour le capacity planning.
- **Percentile 85 comme engagement** : c'est le standard industry (Kanban Guide 2020+) pour les SLAs de livraison.
- **CFD automatisé** : configurer le CFD directement dans Azure DevOps (Analytics → Cumulative Flow) plutôt que de le construire manuellement.
- **Sprint Review comme point de collecte** : enregistrer la vélocité immédiatement après la review, avant tout ajustement.
- **DORA metrics complémentaires** : associer les métriques agile aux DORA metrics (deployment frequency, change failure rate) pour relier livraison agile et qualité opérationnelle.


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
