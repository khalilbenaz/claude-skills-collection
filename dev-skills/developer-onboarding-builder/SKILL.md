---
name: developer-onboarding-builder
description: Création de processus d'onboarding pour nouveaux développeurs. Se déclenche avec "onboarding", "nouveau développeur", "intégration équipe", "setup poste", "getting started guide", "accueil développeur".
---

# Developer Onboarding Builder

## Critères de décision avant de commencer

| Contexte | Action recommandée |
|---|---|
| Première embauche de l'équipe | Créer le process from scratch (étapes 1→8) |
| Onboarding existant mais douloureux | Audit d'abord : identifier les étapes manuelles, les accès qui manquent, la doc périmée |
| Stack change (migration, nouveau service) | Mettre à jour GETTING_STARTED.md + script setup ; réutiliser le reste |
| Profil senior / nouveau sur le domaine métier | Réduire le setup time, allonger le parcours métier (ADR, post-mortems, glossaire) |

---

## Workflow en étapes

### Étape 1 — Script de setup idempotent

Un onboarding sans script se dégrade en 3 semaines. Le script est la source de vérité.

```bash
# Makefile minimal — couvre les cas les plus fréquents
.PHONY: setup check-deps

setup: check-deps
	cp .env.example .env
	npm ci
	docker compose up -d db redis
	npm run db:migrate
	npm run db:seed
	@echo "✅ Env prêt. Lance : npm run dev"

check-deps:
	@command -v node >/dev/null || (echo "Node manquant"; exit 1)
	@command -v docker >/dev/null || (echo "Docker manquant"; exit 1)
```

**Checklist script** :
- [ ] Idempotent (relancer ne casse rien)
- [ ] Testé sur machine vierge (CI ou VM) au moins une fois par trimestre
- [ ] Couvre : runtime, dépendances, variables d'env, DB locale, certificats internes
- [ ] Temps total < 2h sur une machine standard

**Accès à provisionner AVANT J1** :

```
□ Git (repo + droits push sur branches de travail)
□ Slack/Teams (invité dans les channels clés, pas tous)
□ Gestionnaire de tickets (Jira, Linear, Azure DevOps)
□ VPN + credentials
□ Cloud (AWS/GCP/Azure) — environnement dev uniquement, read-only prod
□ Registres privés (npm, Docker Hub, Maven, NuGet)
□ Gestionnaire de secrets (Vault, AWS SSM) — policies en lecture dev
□ Accès monitoring (Grafana, Datadog) — lecture seule
```

---

### Étape 2 — GETTING_STARTED.md

Fichier linkable depuis le README principal. Cible : 30 min de lecture → compréhension globale.

Structure recommandée :

```markdown
# Getting Started

## Architecture en 5 minutes
[Diagramme C4 niveau contexte — un seul schéma suffit]
Qui appelle qui, où vivent les données, quels sont les systèmes externes.

## Tech stack & décisions clés
| Techno | Pourquoi | ADR |
|--------|----------|-----|
| PostgreSQL | … | [ADR-003](./docs/adr/003-postgres.md) |

## Setup local
Voir [SETUP.md](./SETUP.md) ou `make setup`

## Workflow quotidien
git checkout -b feat/mon-sujet
# ... travail ...
git push && ouvrir une PR → review → merge → déploiement auto

## Glossaire
- **Transaction** : au sens métier ici, pas SQL
- **Backoffice** : l'app interne, pas l'admin panel externe

## Contacts & canaux
- Questions techniques : #dev-questions
- Incidents : #alerts
- Buddy : @prenom.nom
```

---

### Étape 3 — J1 : structure de la journée

```
09:00 — Accueil (30 min) : manager + buddy, tour de l'équipe rapide
09:30 — Accès vérifiés ensemble (15 min) — ne pas laisser le dev seul face à un problème d'accès VPN
09:45 — `make setup` en live (1h) — le buddy reste disponible, note les frictions
11:00 — Architecture walkthrough (45 min) — sur le diagramme, pas en improvisation
14:00 — Code walkthrough des modules principaux (1h30) — nav dans le repo, pas de slides
15:30 — Workflow Git en pratique : créer une branche, faire un commit trivial, ouvrir une PR draft
16:30 — 1:1 buddy : questions libres, impressions du jour
```

**Objectif J1 vérifiable** : les tests passent sur la machine du nouveau dev (`npm test` ou `make test`).

---

### Étape 4 — S1 : première semaine

**Sélection des "good first issues"** — critères :
- Périmètre isolé (un seul service/module)
- Tests existants (le dev peut vérifier sans demander)
- Pas bloquant pour les autres
- Effort estimé : 2h–1j max

```
Exemple bon first issue : "Ajouter un champ `updated_at` à l'entité User + migration + test"
Exemple mauvais : "Refactorer le module auth" (trop large, risque de régression)
```

**Planning type S1** :

```
J2 : Pair programming sur un good first issue (30 min ensemble, puis solo)
J3 : Code review reçue sur sa première PR
J4 : Participer en observateur à une vraie code review de l'équipe
J5 : 1:1 tech lead (15 min) — feedback bidirectionnel, ajustements
```

**Objectif S1 vérifiable** : au moins une PR mergée, même minuscule.

---

### Étape 5 — M1 : premier mois

**Feature complète** = backend + frontend + tests + doc + déployée en prod.

Jalons hebdomadaires :
- S2 : feature attribuée, spec validée avec le tech lead
- S3 : implémentation + tests + PR ouverte
- S4 : mergée + déployée + présentation technique de 10–15 min à l'équipe

La présentation force la compréhension réelle. Sujet imposé : quelque chose découvert pendant le mois (une bibliothèque, un pattern utilisé dans le code, un post-mortem).

**Objectif M1 vérifiable** : autonomie sur les tâches de complexité moyenne sans besoin constant de guidance.

---

### Étape 6 — Parcours de formation

Personnaliser selon le profil :

| Profil | Priorité |
|---|---|
| Junior (< 2 ans) | Conventions internes, TDD, revue de code |
| Intermédiaire | Architecture du système, design patterns utilisés, observabilité |
| Senior (nouveau sur le domaine) | ADR, post-mortems, runbooks, culture d'incident |
| New stack (ex: Python → Node) | Idiomes du langage, toolchain, pièges classiques |

Ressources à recenser et partager :
- Tech talks internes enregistrés (lien + durée)
- 3–5 post-mortems instructifs (avec leçons explicites)
- ADR les plus importants (pas toute la liste — sélectionner les 5 qui expliquent les choix structurants)
- Runbooks opérationnels (déploiement, rollback, debug prod)

---

### Étape 7 — Buddy system

**Règles du buddy** :
- Différent du manager hiérarchique (espace safe pour les "questions bêtes")
- Même niveau ou un cran au-dessus
- Disponible pour les questions rapides (Slack < 2h de réponse)

**Cadence** :
- S1 : check-in quotidien (10 min en fin de journée)
- M1 : check-in hebdomadaire (30 min)
- J30 / J90 : feedback formel structuré

**Questions de check-in J7** :
```
1. Qu'est-ce qui était flou dans la documentation ?
2. Quel accès t'a manqué ou a pris trop de temps ?
3. As-tu eu à demander la même chose deux fois ?
→ Chaque réponse = ticket d'amélioration de l'onboarding
```

---

### Étape 8 — Métriques et amélioration continue

**KPIs à tracker** :

| Métrique | Cible | Signal d'alerte |
|---|---|---|
| Time to first commit | < 3 jours | > 5 jours |
| Time to first PR mergée | < 1 semaine | > 2 semaines |
| Time to feature en prod | < 1 mois | > 6 semaines |
| Score satisfaction onboarding (J30) | ≥ 4/5 | < 3.5/5 |

**Questionnaire J30 (4 questions max)** :
```
1. La documentation était-elle suffisante pour démarrer ? (1–5)
2. Le setup local a pris combien de temps ?
3. Qu'est-ce qui t'a le plus bloqué ?
4. Qu'est-ce qui t'a le plus aidé ?
```

Rétrospective onboarding formelle : 1 fois par trimestre ou après chaque 3ème recrutement.

**Règle d'or** : chaque friction remontée → ticket → fix dans GETTING_STARTED.md ou le script. Ne jamais dire "c'est un cas particulier".

---

## Anti-patterns / pièges à éviter

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Accès provisionnés le jour J | Dev bloqué 2h en J1 → signal culturel négatif | Checklist accès complétée J-2 |
| Documentation uniquement sur Confluence/Notion | Introuvable depuis le repo, jamais mise à jour | GETTING_STARTED.md dans le repo, linkée depuis README |
| "Regarde le code, tu comprendras" | Contexte métier jamais expliqué | Walkthrough obligatoire + glossaire |
| Buddy = manager | Pas de questions "bêtes" posées, problèmes cachés | Buddy = pair, manager séparé |
| Good first issues trop ambitieux | Dev bloqué, mauvais signal sur ses compétences | Issues isolées, < 1 jour, testables |
| Onboarding figé | Frictions s'accumulent | Ticket à chaque retour négatif d'un nouveau dev |
| Setup manuel sans script | Reproductibilité zéro, 4h perdues | Script idempotent, testé en CI |
| Formation = liste de liens Confluence | Jamais lu | 3 ressources max par profil, avec contexte ("lis ça avant de toucher au module paiement") |
