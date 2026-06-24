---
name: technical-debt-manager
description: Aide à identifier, prioriser et planifier le remboursement de la dette technique avec des métriques de suivi. Se déclenche avec "dette technique", "technical debt", "refactoring", "code legacy", "dette", "tech debt".
---

# Technical Debt Manager

## 1. Inventaire — recensement des sources

Commencer par une collecte structurée. Sources classiques :

| Catégorie | Exemples concrets |
|---|---|
| Code | duplication >30 lignes, méthodes >200 lignes, couplage fort |
| Architecture | monolithe impossible à scaler, absence de séparation couches |
| Dépendances | packages avec CVE ouverts, versions EOL (ex : .NET 6, Node 16) |
| Tests | couverture <40%, pas de tests d'intégration, tests flaky |
| Infrastructure | scripts de déploiement manuels, pas d'IaC |
| Documentation | README absent, API sans spec OpenAPI, ADR manquants |
| Workarounds prod | flags hardcodés, configs non versionnées, cron jobs orphelins |

**Commandes utiles pour l'inventaire rapide :**

```bash
# Dépendances obsolètes Node
npx npm-check-updates --format group

# Audit de sécurité npm
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.severity=="critical")'

# Complexité cyclomatique Python
radon cc src/ -s -n C   # affiche les fonctions complexité >= C

# Duplication de code
jscpd --min-lines 10 --reporters json src/
```

```bash
# .NET : packages obsolètes
dotnet list package --outdated --format json

# Couverture de tests .NET
dotnet test --collect:"XPlat Code Coverage" && reportgenerator -reports:coverage.xml -targetdir:report
```

---

## 2. Classification — Quadrant de Fowler

Positionner chaque élément sur deux axes :

```
                    PRUDENT              IMPRUDENT
DÉLIBÉRÉ    "On sait qu'on doit     "On déploie vite,
             refacto plus tard"      on verra après"
             → OK si tracé (ADR)     → Éviter

INADVERTANT "On a appris un         "On ne savait pas
             meilleur pattern         qu'on faisait mal"
             depuis"                 → Former l'équipe
             → Refacto planifiée
```

Associer à chaque item : **type**, **auteur/équipe**, **date de création**, **ADR ou ticket existant**.

---

## 3. Évaluation de l'impact — score de priorité

Pour chaque élément de dette, noter sur 5 :

- **P** : probabilité d'incident ou de ralentissement (1=faible, 5=certain)
- **I** : impact si le problème survient (1=cosmétique, 5=production down)
- **C** : coût de remboursement (1=< 1 jour, 5=sprint entier)

**Score de priorité** = (P × I) / C → plus le score est élevé, plus c'est urgent.

Exemple de tableau :

| Item | P | I | C | Score | Action |
|---|---|---|---|---|---|
| Auth sans refresh token | 4 | 5 | 2 | 10 | Sprint suivant |
| README obsolète | 2 | 2 | 1 | 4 | Quick win (< 2h) |
| ORM N+1 sur /orders | 3 | 4 | 3 | 4 | Planifier |
| Migration Node 16→20 | 5 | 4 | 2 | 10 | Sprint suivant |

---

## 4. Priorisation — critères de décision

**Traiter en priorité si :**
- La dette ralentit activement une feature en cours (couplage, tests flaky).
- CVE critique ou dépendance EOL dans les 3 mois.
- Score (P×I)/C ≥ 8.
- L'item bloque le recrutement ou la montée en compétence.

**Différer si :**
- Le module est en voie d'être remplacé (<6 mois).
- Score < 3 et aucun développeur ne touche ce code.
- Le remboursement nécessite un arrêt service non planifiable.

**Quick wins à ne jamais rater :**
- Mettre à jour une dépendance avec 0 breaking change.
- Ajouter un test sur un bug qu'on vient de corriger.
- Supprimer du code mort (feature flags désactivés, endpoints dépréciés).

---

## 5. Stratégies de remboursement

| Stratégie | Quand l'utiliser | Exemple |
|---|---|---|
| **Règle 20%** (1 jour/sprint) | Dette diffuse, équipe stable | Chaque sprint : 1 jour refacto |
| **Sprint technique dédié** | Dette localisée bloquante | Sprint "migration Node 20" |
| **Boy Scout Rule** | Culture quotidienne | "Leave the code cleaner than you found it" |
| **Strangler Fig** | Remplacement progressif d'un module | Nouveau service en parallèle, migration par route |
| **Branch by abstraction** | Gros refacto sans arrêt | Interface + implémentation legacy → nouvelle implémentation |

**Template ADR pour dette intentionnelle :**
```markdown
## ADR-042 : Workaround authentification JWT

**Statut** : Accepted / To Refactor
**Date** : 2026-06-24
**Contexte** : Deadline J+3, pas le temps d'implémenter le refresh token.
**Décision** : Token valide 24h, session expirée = re-login.
**Conséquences** : UX dégradée. Refacto planifiée sprint S+4.
**Ticket** : PROJ-1234
```

---

## 6. Métriques de suivi (avant/après obligatoire)

Mesurer **avant** de commencer, **après** chaque remboursement :

```bash
# Couverture de tests (Jest)
jest --coverage --coverageReporters=json-summary
cat coverage/coverage-summary.json | jq '.total.lines.pct'

# Complexité moyenne (Python)
radon mi src/ -s | awk '{sum+=$NF; count++} END {print sum/count}'

# Taille du bundle (webpack)
npx webpack-bundle-analyzer stats.json --mode=json | jq '.assets[].size' | paste -sd+ | bc
```

KPIs à suivre en dashboard (Jira, ADO, Notion) :

- % couverture de tests (cible : ≥ 70%)
- Nombre de dépendances avec CVE critique (cible : 0)
- Vélocité sprint (avant/après refacto)
- Temps moyen résolution bug (MTTR)
- Score SonarQube / Code Climate GPA
- Nombre de TODO/FIXME en production (`grep -r "TODO\|FIXME\|HACK" src/ | wc -l`)

---

## 7. Communication business

Traduire la dette en langage décisionnel :

- **"Ce module prend 3× plus de temps à modifier"** → "Chaque feature dans ce périmètre coûte 2 jours de plus."
- **"Dépendance EOL fin 2026"** → "Risque de 0 patch de sécurité après décembre, exposition CVE permanente."
- **"Pas de tests"** → "Chaque déploiement est un pari. Incident toutes les N semaines = X heures de prod perdues."

Template slide PO/PM :

```
Dette actuelle : 12 items → 8 jours/sprint perdus (estimation)
Investissement remboursement : 3 sprints × 1 jour = 3 jours
ROI attendu : -3 jours perdus/sprint à partir de S+3
```

---

## Garde-fous & anti-patterns

- **"On refactore tout d'un coup"** : non. Strangler Fig ou par module. Le big bang échoue.
- **Refacto sans tests** : toujours écrire les tests caractéristiques AVANT de changer le code (Golden Master Testing).
- **Planifier sans métriques** : impossible de prouver le ROI. Mesurer avant/après systématiquement.
- **Cacher la dette au PO** : la dette non visible n'est jamais remboursée. La rendre explicite dans le backlog.
- **Viser 0 dette** : objectif irréaliste et contre-productif. Viser un niveau stable et gérable.
- **Refacto = réécriture** : préférer l'amélioration incrémentale. Réécrire = risque de régression + perte de connaissance implicite.
- **Ignorer la dette de test** : c'est souvent la plus coûteuse. Un code non testé = refacto risquée.
