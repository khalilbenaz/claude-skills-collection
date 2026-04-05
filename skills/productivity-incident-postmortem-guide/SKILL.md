---
name: productivity-incident-postmortem-guide
description: Rédaction de post-mortems techniques après un incident — timeline, analyse des causes racines, actions correctives et leçons apprises. À utiliser quand l'utilisateur doit documenter un incident, analyser une panne ou structurer un retour d'expérience. Se déclenche aussi avec "post-mortem", "postmortem", "incident report", "retour d'expérience", "RCA", "root cause analysis", "blameless postmortem", "analyse de panne".
---

# Guide de Post-Mortem d'Incident

## Workflow

1. **Documenter** : capturer la timeline complète de l'incident.
2. **Analyser** : identifier les causes racines (pas les symptômes).
3. **Proposer** : actions correctives concrètes et mesurables.
4. **Partager** : communication blameless à l'équipe.

## Template de post-mortem

```markdown
# Post-Mortem : [Titre de l'incident]

**Date** : YYYY-MM-DD
**Durée** : HH:MM (de détection à résolution)
**Sévérité** : SEV1 / SEV2 / SEV3
**Auteur** : [Nom]
**Révisé par** : [Nom(s)]

## Résumé

[2-3 phrases décrivant l'incident, son impact et sa résolution]

## Impact

| Métrique | Valeur |
|----------|--------|
| Utilisateurs impactés | X |
| Durée d'indisponibilité | HH:MM |
| Transactions perdues | X |
| Revenu impacté | X € |
| SLA impacté | Oui/Non |

## Timeline

| Heure (UTC) | Événement |
|-------------|-----------|
| 14:00 | Déploiement de la version 2.3.1 en production |
| 14:15 | Première alerte Prometheus : taux d'erreur > 5% |
| 14:18 | L'équipe on-call est notifiée |
| 14:25 | Diagnostic : connexions DB saturées |
| 14:30 | Décision de rollback vers v2.3.0 |
| 14:35 | Rollback effectué, taux d'erreur en baisse |
| 14:45 | Retour à la normale confirmé |

## Causes racines

### Cause immédiate
[Ce qui a directement causé l'incident]

### Causes sous-jacentes (5 Whys)
1. **Pourquoi** le service a crashé ? → Pool de connexions DB saturé
2. **Pourquoi** le pool était saturé ? → Nouvelle requête sans pagination
3. **Pourquoi** la requête n'avait pas de pagination ? → Pas de review perf
4. **Pourquoi** pas de review perf ? → Pas dans la checklist de PR
5. **Pourquoi** pas dans la checklist ? → Jamais formalisé comme exigence

### Facteurs contributifs
- [Facteur 1 : absence de monitoring sur la taille du pool]
- [Facteur 2 : pas de load test avant déploiement]

## Ce qui a bien fonctionné
- Alerte Prometheus déclenchée en 15 minutes
- Procédure de rollback fonctionnelle et rapide
- Communication claire dans le canal #incidents

## Ce qui peut être amélioré
- Délai de 7 minutes entre l'alerte et la notification on-call
- Pas de runbook pour ce type d'incident
- Load tests non automatisés dans la CI

## Actions correctives

| # | Action | Priorité | Responsable | Deadline | Ticket |
|---|--------|----------|-------------|----------|--------|
| 1 | Ajouter une alerte sur la taille du pool de connexions | P1 | @ops | J+3 | #456 |
| 2 | Ajouter la review perf dans la checklist PR | P1 | @lead | J+5 | #457 |
| 3 | Implémenter la pagination sur toutes les requêtes list | P2 | @dev | J+10 | #458 |
| 4 | Créer un runbook pour les incidents DB | P2 | @ops | J+14 | #459 |
| 5 | Automatiser les load tests dans la CI | P3 | @devops | J+30 | #460 |

## Leçons apprises
- [Leçon clé que l'équipe retient de cet incident]
```

## Méthodologie des 5 Whys

Technique pour remonter des symptômes à la cause racine en posant "Pourquoi ?" de manière itérative. S'arrêter quand on atteint une cause systémique (processus, outil, culture) plutôt qu'une erreur humaine.

## Niveaux de sévérité

| Niveau | Critère | Exemple |
|--------|---------|---------|
| **SEV1** | Service principal indisponible, impact majeur | API de paiement down |
| **SEV2** | Dégradation significative, workaround possible | Latence x10, certaines fonctions KO |
| **SEV3** | Impact mineur, peu d'utilisateurs touchés | Bug sur une page secondaire |

## Principes du blameless postmortem

- Se concentrer sur les **systèmes et processus**, pas sur les personnes
- Chaque erreur humaine est un symptôme d'un **problème systémique**
- L'objectif est d'**apprendre**, pas de punir
- Documenter les **faits**, pas les jugements
- Les actions correctives doivent être **mesurables** et **assignées**

## Règles
- Un post-mortem doit être rédigé dans les **48 heures** suivant la résolution.
- Chaque action corrective doit avoir un **responsable**, une **deadline** et un **ticket**.
- Le post-mortem est **blameless** — pas de mise en cause individuelle.
- Les causes racines doivent être **systémiques**, pas "erreur humaine".
- Le post-mortem doit être **partagé** avec toute l'équipe.


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
