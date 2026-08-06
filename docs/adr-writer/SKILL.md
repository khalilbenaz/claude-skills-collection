---
name: adr-writer
description: Rédaction d'Architecture Decision Records (ADR) pour documenter les choix d'architecture avec leur contexte, alternatives et conséquences. À utiliser quand l'utilisateur doit documenter une décision technique, justifier un choix d'architecture ou créer un historique des décisions. Se déclenche aussi avec "ADR", "architecture decision record", "décision d'architecture", "choix technique", "documenter une décision", "pourquoi ce choix". Also triggers on "write an ADR", "document a technical decision".
---

# Rédacteur d'ADR (Architecture Decision Records)

## Workflow en 5 étapes

### 1. Identifier si un ADR est nécessaire

| Situation | ADR ? |
|-----------|-------|
| Choix de framework, langage, runtime | Oui |
| Choix de base de données ou broker | Oui |
| Pattern d'architecture (CQRS, Event Sourcing, Saga) | Oui |
| Migration d'infrastructure ou de cloud | Oui |
| Décision de sécurité (authN, authZ, chiffrement) | Oui |
| Choix de librairie mineure ou utilitaire | Non |
| Refactoring interne sans changement de contrat | Non |
| Convention de nommage ou style de code | Non (→ guideline) |

### 2. Collecter le contexte

Répondre à ces questions avant d'écrire :
- Quel problème concret cette décision résout-elle ?
- Quelles contraintes non négociables existent (deadline, budget, compétences équipe, réglementation) ?
- Quel est le volume / scale cible ?
- Quelles décisions antérieures (ADR existants) s'appliquent ?

### 3. Lister les alternatives

Au minimum 2 alternatives réalistes (pas de straw man). Pour chaque option :
- Avantages concrets et mesurables si possible
- Inconvénients et risques
- Marquage clair de l'option retenue

### 4. Rédiger l'ADR (voir template)

Règle d'or : une décision = un ADR. Numéroter séquentiellement (0001, 0002…).

### 5. Versionner et notifier

```bash
# Créer le fichier dans le bon dossier
docs/adr/NNNN-titre-kebab-case.md

# Committer avec un message explicite
git add docs/adr/NNNN-*.md
git commit -m "docs(adr): ADR-NNNN choix [sujet]"

# Mettre à jour l'index
docs/adr/README.md
```

---

## Template ADR

```markdown
# ADR-XXXX : [Titre de la décision]

**Date** : YYYY-MM-DD
**Statut** : Proposé | Accepté | Déprécié | Remplacé par ADR-YYYY
**Décideurs** : [Noms ou équipes]
**Tags** : [backend, infra, sécurité, data…]

## Contexte

[Quel est le problème ? Pourquoi maintenant ?
Contraintes : techniques, métier, équipe, budget, réglementation.]

## Décision

**Nous avons décidé de [choix] parce que [raison principale].**

[Détail de la décision en 2-4 phrases maximum.]

## Alternatives considérées

### Option A : [Nom]
- ✅ [Avantage 1]
- ❌ [Inconvénient 1]

### Option B : [Nom] ← **Retenue**
- ✅ [Avantage 1]
- ❌ [Inconvénient 1]

### Option C : [Nom]
- ✅ [Avantage 1]
- ❌ [Inconvénient 1]

## Conséquences

### Positives
- [Bénéfice concret attendu]

### Négatives / Trade-offs acceptés
- [Trade-off conscient]

### Risques et mitigations
- **Risque** : [description] → **Mitigation** : [action]

## Références
- [Ticket / RFC / discussion]
- [Documentation technique]
- [ADRs liés : ADR-XXXX]
```

---

## Exemple concret : choix de message broker

```markdown
# ADR-0012 : Utiliser RabbitMQ comme message broker

**Date** : 2026-01-15
**Statut** : Accepté
**Décideurs** : Équipe backend, Tech Lead
**Tags** : backend, messaging, microservices

## Contexte

Architecture microservices avec besoin de messaging asynchrone inter-services.
Volume actuel : ~50K messages/jour. Projection : 500K/jour dans 12 mois.
Contrainte équipe : expérience RabbitMQ existante, aucune sur Kafka.
Budget infra limité — pas d'opérateur Kafka dédié disponible.

## Décision

**Nous avons décidé d'utiliser RabbitMQ avec MassTransit parce que l'équipe
le maîtrise, le volume projeté reste dans ses capacités, et MassTransit
fournit les patterns saga/outbox sans développement custom.**

## Alternatives considérées

### Apache Kafka
- ✅ Hauts volumes (>1M msg/s), rétention durable, replay natif
- ❌ Courbe d'apprentissage élevée (KRaft, consumer groups, offset management)
- ❌ Surdimensionné et coûteux en ops pour notre volume

### RabbitMQ + MassTransit ← **Retenu**
- ✅ Équipe expérimentée, mise en prod rapide
- ✅ Patterns saga, outbox, retry out-of-the-box
- ❌ Pas de replay natif, moins performant >1M msg/s

### Azure Service Bus
- ✅ Service managé, zero ops
- ❌ Vendor lock-in Azure, coût élevé à volume

## Conséquences

### Positives
- Mise en production dans les 2 semaines (équipe déjà formée)
- Patterns saga et outbox via MassTransit sans code custom

### Négatives / Trade-offs acceptés
- Migration vers Kafka probable si dépassement des projections

### Risques et mitigations
- **Risque** : volume dépasse 1M msg/jour → **Mitigation** : ADR de migration
  à déclencher à 400K/jour (seuil d'alerte à configurer)

## Références
- https://masstransit.io/documentation/patterns
- ADR-0008 : Architecture microservices
```

---

## Organisation des fichiers

```
docs/
└── adr/
    ├── README.md               # Index avec statut et lien de chaque ADR
    ├── template.md             # Template vierge
    ├── 0001-langage-csharp.md
    ├── 0002-microservices.md
    └── 0012-message-broker.md
```

**Index README.md minimal :**

```markdown
# Architecture Decision Records

| N° | Titre | Statut | Date |
|----|-------|--------|------|
| [0001](0001-langage-csharp.md) | Utiliser C# comme langage principal | Accepté | 2024-03-01 |
| [0012](0012-message-broker.md) | RabbitMQ comme message broker | Accepté | 2026-01-15 |
```

---

## Critères de décision : comment choisir entre les options

1. **Compétences équipe** — une techno connue > une techno supérieure sur le papier.
2. **Coût opérationnel total** — licences + ops + formation + migration future.
3. **Fit avec le scale cible** — ne pas surdimensionner ; prévoir un seuil de révision.
4. **Réversibilité** — préférer les décisions réversibles ; documenter le plan de sortie si irréversible.
5. **Contraintes réglementaires** — souveraineté des données, conformité PCI/RGPD.
6. **Écosystème existant** — cohérence avec les ADRs antérieurs et l'infra en place.

---

## Garde-fous et anti-patterns

| Anti-pattern | Correction |
|---|---|
| ADR rédigé 3 mois après la décision | Rédiger au moment de la décision, même si brouillon |
| Un seul ADR pour 5 décisions | Un ADR = une décision |
| Aucune alternative listée | Minimum 2 alternatives réalistes |
| Titre vague : "Choix infra" | Titre précis : "Utiliser Kubernetes pour l'orchestration conteneurs" |
| Statut jamais mis à jour | Mettre "Remplacé par ADR-YYYY" dès qu'une décision est révisée |
| ADR supprimé | Jamais supprimer — marquer Déprécié ou Remplacé |
| Conséquences uniquement positives | Documenter les trade-offs explicitement ; un ADR sans négatifs est suspect |
| Commentaires XML avec `--` dans le titre | Si l'ADR est embarqué en XML, éviter `--` dans les balises |

---

## Bonnes pratiques 2026

- **ADR as code** : stocker dans le dépôt Git du projet, pas dans Confluence ou un wiki externe — la décision vit avec le code.
- **Lier les ADRs** : référencer les ADRs antérieurs dans la section "Références" (`ADR-NNNN`).
- **Seuils de révision** : pour les décisions liées à la capacité/volume, fixer un seuil mesurable qui déclenche une révision (ex. : "à revoir si >400K msg/jour").
- **Décision collégiale** : l'ADR doit mentionner les décideurs réels — éviter "l'équipe" sans nommer.
- **Statut Proposé → Accepté** : faire valider l'ADR par au moins un pair avant de le passer en "Accepté".
- **Outils** : `adr-tools` (CLI), `log4brains` (site statique de visualisation), ou simple dossier Markdown avec CI qui vérifie l'index.

```bash
# Installer adr-tools (Unix/macOS/WSL)
brew install adr-tools

# Initialiser
adr init docs/adr

# Créer un nouvel ADR
adr new "Utiliser PostgreSQL comme base principale"
# Génère : docs/adr/0001-utiliser-postgresql-comme-base-principale.md
```
