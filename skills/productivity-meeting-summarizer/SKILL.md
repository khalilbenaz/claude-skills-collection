---
name: productivity-meeting-summarizer
description: Résume une réunion avec décisions, actions et prochaines étapes. À utiliser quand l'utilisateur colle des notes de réunion ou décrit ce qui s'est dit. Se déclenche aussi avec "résume la réunion", "compte-rendu", "meeting notes", "qu'est-ce qu'on a décidé", "PV de réunion".
---

# Meeting Summarizer

## Workflow en 6 étapes

### 1. Analyser l'input
Avant de produire le résumé, identifier :
- Le **type de réunion** (stand-up, retrospective, design review, comité de direction, client call…) — le ton et le niveau de détail s'adaptent.
- La **source** : notes brutes, transcript complet, description orale, audio transcrit.
- Les **participants** nommés ou identifiables (initiales, rôles).

Si l'input est ambigu (ex. : notes sans contexte), poser une seule question ciblée : *"Qui étaient les participants et quel était l'objectif ?"*

### 2. Résumé exécutif (3-5 phrases)
- Contexte : pourquoi la réunion a eu lieu.
- Résultat principal : ce qui a changé ou été validé.
- Impact immédiat.

Exemple :
```
Réunion de revue de sprint S42 (24/06/2026, équipe produit).
Décision de reporter la feature F-217 (paiement récurrent) au sprint S44 faute de capacité.
Les bugs critiques #3401 et #3402 passent en priorité P0 immédiate.
```

### 3. Décisions prises
Liste numérotée, chaque décision doit être :
- **Formulée comme une action factuelle** (verbe au passé ou présent de vérité).
- Associée à un contexte minimal si nécessaire.

```
1. [VALIDÉ] Architecture microservices retenue pour le module paiement.
2. [REPORTÉ] Démo client repoussée au 15/07.
3. [ANNULÉ] Intégration Stripe suspendue — budget gelé.
```
Préfixes utiles : `[VALIDÉ]` `[REPORTÉ]` `[ANNULÉ]` `[EN ATTENTE]`

### 4. Plan d'actions (tableau)
| # | Action | Responsable | Deadline | Statut |
|---|--------|-------------|----------|--------|
| 1 | Ouvrir ticket Jira pour F-217 | @alice | 25/06 | À faire |
| 2 | Envoyer devis révisé au client | @bob | 28/06 | À faire |
| 3 | Vérifier compatibilité API v3 | @carlos | 30/06 | En cours |

Si le responsable est inconnu : mettre `[?]` et signaler en bas du tableau.

### 5. Points en suspens
Questions ouvertes non résolues pendant la réunion :
- Format : *"Qui valide les accès prod ?"* → responsable de la réponse + deadline suggérée.
- Ne pas inventer de résolution.

### 6. Prochaine réunion
Si mentionnée :
```
Date : 01/07/2026 à 10h00
Sujets à préparer :
  - Démo F-219 (authentication SSO)
  - Revue budget Q3
```

---

## Formats de sortie

### Format complet (défaut)
Sections 2 à 6 complètes. Utilisé pour : PV officiel, archive, partage Confluence/Notion.

### Format express (≤ 6 lignes)
Déclenché si l'utilisateur demande "version courte" ou "TL;DR" :
```
RÉUNION : [titre] — [date]
DÉCIDÉ : [décision 1] / [décision 2]
ACTIONS : [action] → @resp (deadline) / [action] → @resp (deadline)
SUSPENDU : [point ouvert]
PROCHAINE : [date] — [sujet]
```

### Format email
Déclenché avec "envoie un email" ou "rédige un mail" :
```
Objet : CR Réunion [titre] — [date]

Bonjour à tous,

Voici le compte-rendu de notre réunion de [date].

[résumé exécutif]

DÉCISIONS
[liste]

ACTIONS
[tableau simplifié]

Prochaine réunion : [date]

Cordialement,
[Expéditeur]
```

---

## Critères de décision — décision vs discussion

| Signal | Décision | Discussion |
|--------|----------|------------|
| "On décide de…", "c'est validé", "go" | ✅ | |
| "On en reparle", "à confirmer", "à étudier" | | ✅ |
| Vote explicite avec majorité | ✅ | |
| Désaccord non tranché | | ✅ |
| Un seul participant l'affirme sans accord général | | ✅ |

---

## Garde-fous et anti-patterns

**Ne pas faire :**
- Transformer une opinion en décision ("Alice pense que…" ≠ décision).
- Inventer un responsable quand ce n'est pas clair — mettre `[?]`.
- Résumer les debates comme des décisions parce que c'est "probable".
- Ignorer les actions implicites ("Bob va checker ça" = action réelle).
- Coller le résumé sans adapter le niveau de détail au type de réunion.

**Pièges fréquents :**
- Les stand-ups n'ont généralement pas de "décisions" — seulement des blockers et des updates.
- Les discussions "off the record" ou hors-agenda ne doivent pas apparaître dans le PV.
- Un transcript automatique (Zoom, Teams) contient des artefacts (noms mal transcrits, répétitions) — les nettoyer sans altérer le fond.

---

## Bonnes pratiques 2026

- **Structurer pour les outils collaboratifs** : Markdown compatible Notion, Confluence, GitHub Issues.
- **Tags de priorité** : si l'équipe utilise MoSCoW ou P0/P1/P2, appliquer la même nomenclature.
- **Actions SMART** : chaque action doit avoir un verbe d'action précis, un responsable nommé, une deadline.
- **Lien vers artefacts** : mentionner les tickets, PRs, docs référencés pendant la réunion (ne pas les créer, juste les citer).
- **Durée indicative** : noter la durée réelle si connue (aide à calibrer la densité du CR).
- Pour les réunions clients, toujours distinguer les engagements de l'équipe des demandes du client encore non validées.


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
