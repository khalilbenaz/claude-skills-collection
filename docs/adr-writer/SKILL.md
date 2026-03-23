---
name: adr-writer
description: Rédaction d'Architecture Decision Records (ADR) pour documenter les choix d'architecture avec leur contexte, alternatives et conséquences. À utiliser quand l'utilisateur doit documenter une décision technique, justifier un choix d'architecture ou créer un historique des décisions. Se déclenche aussi avec "ADR", "architecture decision record", "décision d'architecture", "choix technique", "documenter une décision", "pourquoi ce choix".
---

# Rédacteur d'ADR (Architecture Decision Records)

## Workflow

1. **Identifier** : une décision d'architecture significative a été prise ou doit l'être.
2. **Contextualiser** : décrire le problème et les contraintes.
3. **Documenter les options** : lister les alternatives avec avantages/inconvénients.
4. **Rédiger l'ADR** : format structuré, concis et pérenne.

## Template ADR

```markdown
# ADR-XXXX : [Titre de la décision]

**Date** : YYYY-MM-DD
**Statut** : Proposé | Accepté | Déprécié | Remplacé par ADR-YYYY
**Décideurs** : [Noms ou équipes]

## Contexte

[Quel est le problème ? Pourquoi devons-nous prendre cette décision maintenant ?
Quelles sont les contraintes (techniques, métier, équipe, budget, délai) ?]

## Décision

[La décision prise, formulée clairement.]

**Nous avons décidé de [choix] parce que [raison principale].**

## Alternatives considérées

### Option A : [Nom]
- ✅ [Avantage 1]
- ✅ [Avantage 2]
- ❌ [Inconvénient 1]
- ❌ [Inconvénient 2]

### Option B : [Nom] ← **Retenue**
- ✅ [Avantage 1]
- ✅ [Avantage 2]
- ❌ [Inconvénient 1]

### Option C : [Nom]
- ✅ [Avantage 1]
- ❌ [Inconvénient 1]
- ❌ [Inconvénient 2]

## Conséquences

### Positives
- [Conséquence positive 1]
- [Conséquence positive 2]

### Négatives
- [Trade-off accepté 1]
- [Trade-off accepté 2]

### Risques
- [Risque identifié + mitigation]

## Références
- [Lien vers la discussion / ticket / RFC]
- [Documentation technique pertinente]
```

## Exemple concret

```markdown
# ADR-0012 : Utiliser RabbitMQ comme message broker

**Date** : 2025-10-15
**Statut** : Accepté
**Décideurs** : Équipe backend, Tech Lead

## Contexte

Notre architecture microservices a besoin d'un système de messaging
asynchrone pour la communication inter-services. Le volume actuel est
de ~50K messages/jour avec une projection à 500K/jour dans 12 mois.
L'équipe a de l'expérience avec RabbitMQ mais pas avec Kafka.

## Décision

**Nous avons décidé d'utiliser RabbitMQ avec MassTransit parce que
l'équipe le maîtrise déjà et que le volume projeté reste dans ses
capacités.**

## Alternatives considérées

### Apache Kafka
- ✅ Meilleur pour les très hauts volumes (>1M msg/s)
- ✅ Rétention durable des messages
- ❌ Courbe d'apprentissage élevée pour l'équipe
- ❌ Surdimensionné pour notre volume actuel
- ❌ Infrastructure plus lourde (ZooKeeper/KRaft)

### RabbitMQ + MassTransit ← **Retenu**
- ✅ Équipe expérimentée
- ✅ MassTransit simplifie les patterns (saga, outbox)
- ✅ Adapté au volume actuel et projeté
- ❌ Moins performant que Kafka au-delà de 1M msg/s

### Azure Service Bus
- ✅ Service managé, pas d'infra à gérer
- ❌ Vendor lock-in Azure
- ❌ Coût élevé à fort volume

## Conséquences

### Positives
- Mise en production rapide (équipe déjà formée)
- Patterns saga et outbox via MassTransit

### Négatives
- Migration vers Kafka nécessaire si >1M msg/jour
- Pas de replay de messages natif

### Risques
- Si le volume dépasse les projections, revoir cette décision (ADR à planifier)
```

## Organisation des ADRs

```
docs/
└── adr/
    ├── README.md           # Index des ADRs
    ├── 0001-use-csharp.md
    ├── 0002-microservices-architecture.md
    ├── 0012-use-rabbitmq.md
    └── template.md         # Template vierge
```

## Quand écrire un ADR ?

| Situation | ADR nécessaire ? |
|-----------|-----------------|
| Choix de framework/langage | Oui |
| Choix de base de données | Oui |
| Pattern d'architecture (CQRS, Event Sourcing) | Oui |
| Choix de librairie mineure | Non |
| Refactoring interne | Non (sauf si changement de pattern) |
| Migration d'infrastructure | Oui |

## Règles
- Un ADR documente **une seule décision**.
- Le statut doit être mis à jour quand une décision est remplacée.
- Inclure au moins **2 alternatives** pour montrer que le choix est réfléchi.
- Les ADRs ne sont **jamais supprimés** — ils sont marqués comme dépréciés/remplacés.
- Écrire l'ADR **au moment de la décision**, pas après coup.
