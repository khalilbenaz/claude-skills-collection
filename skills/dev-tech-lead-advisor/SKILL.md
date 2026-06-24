---
name: dev-tech-lead-advisor
description: Guide opérationnel pour tech leads : architecture, ADR/RFC, code reviews, mentoring, dette technique, standards et communication vers le management. Se déclenche avec "tech lead", "lead technique", "décision technique", "mentoring", "code review strategy", "technical leadership", "team lead dev".
---

# Tech Lead Advisor

## 1. Clarifier ton rôle de Tech Lead

**Répartition cible du temps :**

| Activité | % recommandé |
|---|---|
| Coding (features / bugs) | 30–40 % |
| Reviews / mentoring / pair | 30–35 % |
| Architecture / RFC / ADR | 15–20 % |
| Reporting / planning / recrutement | 10–15 % |

> En dessous de 30 % de coding tu perds le contact avec la réalité du code. Au-dessus de 60 % tu bloques l'équipe.

**Indicateurs que tu remplis ton rôle :**
- L'équipe peut livrer sans toi pendant 2 semaines.
- Les revues ne sont pas toutes bloquées par toi.
- Les juniors progressent mesuralement chaque trimestre.

---

## 2. Décisions d'architecture : RFC → ADR

### Processus RFC (pour décisions à impact moyen/élevé)

```
1. Rédige un doc RFC dans le wiki/repo (template ci-dessous)
2. Annonce en channel #tech avec deadline de commentaires (3–5 jours)
3. Intègre les retours, documente les alternatives rejetées
4. Publie un ADR dans docs/adr/ avec statut "Accepted"
```

**Template ADR minimal (`docs/adr/0042-choix-orm.md`) :**
```markdown
# ADR-0042 : Choix ORM — Entity Framework Core vs Dapper

## Statut : Accepted — 2026-05-10

## Contexte
API avec ~80 endpoints, équipe de 5 devs, mix requêtes CRUD simples
et rapports analytiques complexes.

## Décision
Entity Framework Core pour les entités métier + Dapper pour les requêtes
analytiques critiques (performance < 100 ms).

## Alternatives rejetées
- Dapper seul : trop verbeux pour le CRUD, onboarding plus long.
- NHibernate : ecosystem vieillissant, peu de support actif.

## Conséquences
- +1 dépendance (Dapper) à maintenir.
- Les devs doivent connaître les deux APIs.
```

**Critère de décision : RFC obligatoire si :**
- Changement de stack, framework majeur ou base de données.
- Ajout de dépendance critique (auth, messaging, observabilité).
- Modification du schéma de déploiement.
- Impact sur plus d'un service ou plus d'une équipe.

---

## 3. Code Reviews efficaces

### Checklist de review (à afficher dans le template PR)

```markdown
## Checklist Review
- [ ] Sécurité : pas de secret en dur, validation des inputs, auth checked
- [ ] Tests : couverture des cas limites, mocks appropriés
- [ ] Performance : N+1 query, locks inutiles, allocations évitables
- [ ] Lisibilité : noms expressifs, fonctions courtes (< 40 lignes)
- [ ] Documentation : méthodes publiques commentées, README à jour si besoin
- [ ] Breaking change : API / contrat / migration DB gérés
```

### Niveaux de commentaires (préfixer dans les reviews)

```
[BLOCKER]  Bug, faille sécu, regression — merge interdit
[MAJOR]    Design à revoir, dette significative — discussion requise
[MINOR]    Amélioration de lisibilité — à corriger dans ce sprint
[NIT]      Style, préférence — auteur décide, non-bloquant
[QUESTION] Curiosité / demande de clarification — pas de changement requis
```

**Exemple de commentaire actionnable :**
```
[MAJOR] Cette requête est dans une boucle → N+1 SQL à chaque appel.
Utilise un batch load ou un .Include() ici :
  var orders = await context.Orders
    .Include(o => o.Lines)
    .Where(o => o.CustomerId == id)
    .ToListAsync();
```

**SLA de review :** Répondre dans les 24 h ouvrées. Si tu ne peux pas reviewer en profondeur, assigne à un autre reviewer.

---

## 4. Mentoring et croissance d'équipe

### Cycle de délégation progressive

```
Niveau 1 — Observer : junior regarde, tu expliques
Niveau 2 — Guidé : junior code, tu poses des questions Socratiques
Niveau 3 — Autonome : junior livre, tu reviewes seulement
Niveau 4 — Mentor inversé : junior documente et forme d'autres
```

### Template 1:1 technique mensuel (30 min)

```markdown
1. Blocages techniques actuels (10 min)
   — Qu'est-ce qui te ralentit en ce moment ?
   — Y a-t-il une techno/concept que tu veux mieux comprendre ?

2. Feedback bidirectionnel (10 min)
   — Ce qui s'est bien passé depuis le dernier 1:1.
   — Un point que tu ferais différemment.

3. Objectif du mois prochain (10 min)
   — Un skill ou une responsabilité à développer.
   — Comment je peux t'aider à y arriver.
```

---

## 5. Gérer la dette technique

### Audit rapide : score de dette par module

```bash
# Lignes de code par fichier (top 20 = candidats à refacto)
git ls-files | xargs wc -l | sort -rn | head -20

# Fichiers les plus modifiés (= zones de friction)
git log --since="6 months ago" --name-only --format="" | sort | uniq -c | sort -rn | head -20

# TODO/FIXME en codebase
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.cs" -n | wc -l
```

### Présenter la dette au management

Évite le jargon technique. Traduis en termes business :

| Problème technique | Langage business |
|---|---|
| Absence de tests sur le module paiement | Risque : tout changement peut casser le flux de paiement sans détection automatique |
| SDK tiers en version EOL | Risque réglementaire et sécurité : failles non patchées |
| Couplage fort entre 3 services | Toute évolution de l'un bloque les deux autres → délais multipliés |

**Règle des 20 %** : Négocier un budget fixe par sprint dédié à la dette (bug prioritaires, refacto, upgrades). Non-négociable, non-reportable.

---

## 6. Standards et automatisation

### Stack de quality gates (CI obligatoire)

```yaml
# .github/workflows/quality.yml (exemple)
- name: Lint
  run: dotnet format --verify-no-changes

- name: Tests + Coverage
  run: dotnet test --collect:"XPlat Code Coverage"

- name: Coverage Gate
  run: |
    coverage=$(xmllint --xpath ... coverage.xml)
    [ "$coverage" -ge 80 ] || exit 1

- name: Security Scan
  uses: github/codeql-action/analyze@v3

- name: Dependency Audit
  run: dotnet list package --vulnerable --include-transitive
```

**Règle d'or** : Si une règle n'est pas dans le CI, elle n'existe pas. Les conventions non-automatisées créent de la friction et du ressentiment en review.

---

## 7. Communication vers le management

### Format de rapport technique mensuel (5 min à lire)

```markdown
## Santé technique — Juin 2026

### Indicateurs clés
| Métrique | Valeur | Tendance |
|---|---|---|
| Couverture de tests | 74 % | ↑ +3 % |
| Dette critique (issues) | 12 | ↓ -4 |
| Temps moyen de déploiement | 8 min | → stable |
| Incidents P1 (30 jours) | 1 | ↓ -2 |

### Risques actifs
1. SDK auth en EOL Q3 2026 — migration planifiée sprint 41
2. Monolithe orders : couplage élevé — RFC en cours

### Demandes d'arbitrage
- Dédier 2 sprints à la migration SDK (impact : retard de 1 feature)
```

---

## 8. Anti-patterns — Pièges fréquents

| Anti-pattern | Symptôme | Correctif |
|---|---|---|
| **Hero coding** | Tu codes la nuit pour débloquer l'équipe | Délégue, puis forme pour que ça ne se reproduise pas |
| **Review bottleneck** | Les PRs attendent 48 h+ | Distribue les reviews, forme des reviewers secondaires |
| **Architecture astronaute** | RFC de 20 pages pour une API CRUD | Timebox la conception : 1 h de design, 30 min de review |
| **Standard non écrit** | Débats de style en review** | Linter + formatter + pre-commit hooks |
| **One-man RFC** | Tu décides seul les grandes orientations | Ouvre la RFC à l'équipe, 3 jours minimum |
| **Feedback annuel** | Le junior découvre ses lacunes en revue RH | 1:1 mensuel, feedback inline en review |
| **Dette invisible** | "On n'a pas le temps de parler de ça au PO" | Backlog dette public, indicateurs visibles |
| **Onboarding informel** | Nouveau dev perdu 2 semaines | Checklist d'onboarding + buddy désigné + objectif J+30 |

---

## 9. Checklist de lancement rapide (nouveau Tech Lead)

```
Semaine 1 :
  [ ] Auditer le codebase (top fichiers par taille + changements)
  [ ] Identifier les 3 modules les plus fragiles
  [ ] Lire les 5 derniers incidents / post-mortems
  [ ] 1:1 de 30 min avec chaque membre de l'équipe

Semaine 2–4 :
  [ ] Documenter les décisions existantes non documentées (ADR rétro)
  [ ] Définir ou réviser la checklist de PR
  [ ] Mettre en place le quality gate CI s'il est absent
  [ ] Identifier un junior à mentorer activement

Mois 2 :
  [ ] Premier rapport technique au management
  [ ] RFC pour la dette technique prioritaire
  [ ] Rétrospective des standards avec l'équipe
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
