---
name: management-stakeholder-communicator
description: Aide à communiquer efficacement avec les parties prenantes via des rapports de statut, des présentations COPIL et des stratégies d'escalade. Se déclenche avec "stakeholder", "parties prenantes", "reporting", "status update", "comité de pilotage", "COPIL". Also triggers on "stakeholder update", "status report", "communicate a delay".
---

# Stakeholder Communicator

## Workflow

### 1. Cartographie des parties prenantes

Avant d'écrire quoi que ce soit, remplir la matrice pouvoir/intérêt :

| Partie prenante | Pouvoir (1-5) | Intérêt (1-5) | Stratégie         | Fréquence |
|----------------|--------------|--------------|-------------------|-----------|
| DG / sponsor    | 5            | 3            | Garder informé    | Bi-mensuel |
| Chef de projet  | 3            | 5            | Collaboration     | Hebdo      |
| Équipe tech     | 2            | 5            | Consulter         | Quotidien  |
| Client métier   | 4            | 4            | Gérer activement  | Hebdo      |
| DSI             | 4            | 2            | Satisfaire        | Mensuel    |

**Règle de décision :**
- Pouvoir ≥ 4 ET Intérêt ≥ 4 → gestion active, communication directe
- Pouvoir ≥ 4 ET Intérêt < 3 → satisfaire sans sur-communiquer
- Pouvoir < 3 ET Intérêt ≥ 4 → tenir informé, source de feedback
- Pouvoir < 3 ET Intérêt < 3 → surveiller, communication minimale

---

### 2. Collecte des informations — checklist avant rédaction

```
[ ] % avancement global et par lot/épic (outil : Jira, Azure DevOps, GitHub Projects)
[ ] Jalons atteints / manqués depuis dernier reporting
[ ] Risques actifs (probabilité, impact, mitigation en cours)
[ ] Décisions en attente (qui doit décider, deadline)
[ ] Dépenses vs budget (burn rate, forecast)
[ ] Blocages technique ou organisationnel
[ ] Actions ouvertes du COPIL précédent
```

---

### 3. Rapport de statut — structure type

Utiliser la pyramide inversée : **conclusion en premier**.

```markdown
# Rapport de statut — [Nom Projet] — [Date]

## Résumé exécutif (3 lignes max)
Statut global : 🔴 ROUGE / 🟡 AMBRE / 🟢 VERT
Point critique : [une phrase]
Décision requise : [une phrase ou AUCUNE]

## Avancement
| Lot / Épic      | Statut | % Fait | Delta vs plan |
|----------------|--------|--------|---------------|
| Authentification | 🟢    | 95%    | +0j           |
| Module paiement  | 🟡    | 60%    | -5j           |
| Intégration SFTP | 🔴    | 20%    | -15j          |

## Risques actifs
| # | Risque                        | Proba | Impact | Mitigation              | Owner  |
|---|-------------------------------|-------|--------|-------------------------|--------|
| 1 | Livraison API partenaire tardive | H   | H      | POC alternative lancé   | Tech   |
| 2 | Congés équipe juillet         | M     | M      | Plan de continuité actif| PM     |

## Décisions requises
1. **[Sujet]** — Options : A / B / C — Recommandation : A — Deadline : [date]

## Actions ouvertes
| Action            | Owner  | Due    | Statut  |
|------------------|--------|--------|---------|
| Valider maquette  | Client | 27/06  | En cours|
```

---

### 4. Adaptation du message par audience

| Audience          | Focus                             | Format           | Durée/longueur |
|------------------|-----------------------------------|------------------|----------------|
| DG / Sponsor      | ROI, risques stratégiques, budget | Slide 1 page     | 3 min pitch    |
| Management métier | Planning, livraisons, impacts     | Rapport 1 page   | 5 min          |
| Équipe technique  | Détails tâches, blocages, dette   | Ticket / Readme  | Sans limite    |
| Client externe    | Fonctionnalités livrées, roadmap  | Release notes    | 1 page max     |

**Règle :** plus le pouvoir est élevé, moins il y a de texte. Un DG lit 3 lignes.

---

### 5. Préparation COPIL — template slide

```
Slide 1 — Statut global (RAG) + 1 message clé
Slide 2 — Avancement jalons (tableau ou Gantt simplifié)
Slide 3 — Risques TOP 3 (tableau : risque / impact / mitigation)
Slide 4 — Décisions requises (une par slide si nécessaire)
          Format : Contexte → Options → Recommandation → Vote
Slide 5 — Prochaines étapes + date du prochain COPIL
```

**Pré-alignement obligatoire :**
Envoyer le draft aux décideurs clés 48h avant pour éviter les surprises.
Format du mail de pré-alignement :

```
Objet : [Projet] COPIL [date] — Points sensibles à valider en amont

Bonsoir [prénom],

Avant notre COPIL de [date], je souhaitais vous partager un point sensible :
[Description en 2 phrases].

Options envisagées : A) … B) …
Ma recommandation : A, car [raison].

Besoin de votre validation ou d'un échange de 10 min avant jeudi ?
```

---

### 6. Gestion des escalades

**Critères d'escalade :**
- Blocage non résolu > 3 jours ouvrés
- Risque passant en criticité HAUTE
- Dérapage planning > 10% de la durée du lot
- Décision hors périmètre PM non prise sous 5 jours

**Template d'escalade (email/ticket) :**

```
Objet : [ESCALADE] [Projet] — [Sujet court]

Contexte     : [1 phrase]
Problème     : [ce qui bloque]
Impact       : [délai / budget / qualité — chiffré si possible]
Déjà tentés  : [actions menées]
Options      : A) … B) …
Recommandation : [laquelle et pourquoi]
Décision requise avant : [date]
```

Ne jamais escalader sans avoir tenté au moins une résolution au niveau actuel.

---

### 7. Registre des décisions (Decision Log)

Tenir un fichier versionné (`decisions.md` ou colonne dans Notion/Azure DevOps) :

```markdown
| # | Date   | Décision                        | Décideur     | Contexte              | Actions déclenchées         |
|---|--------|---------------------------------|--------------|-----------------------|-----------------------------|
| 1 | 2026-06-10 | Adoption API REST v2 (abandon SOAP) | DSI + PM | Migration coût élevé | Ticket #1234 créé, plan mis à jour |
```

Diffuser le decision log dans les 24h post-réunion à tous les stakeholders concernés.

---

## Anti-patterns / Pièges

- **Faux vert** — signaler VERT sous pression pour éviter des questions. Un rouge signalé tôt est gérable ; un rouge surpris en COPIL est un incident politique.
- **Over-reporting** — envoyer trop d'informations tue l'attention. Une slide = un message.
- **Escalade sans préparation** — arriver sans options ni recommandation transforme l'escalade en problème supplémentaire pour le décideur.
- **Décisions orales non tracées** — toute décision prise en couloir doit être confirmée par écrit dans les 24h.
- **Communication uniforme** — envoyer le même rapport à la DG et à l'équipe technique est inefficace pour les deux.
- **Absence de pre-alignment** — surprendre un sponsor en COPIL crée de la méfiance ; les décisions importantes se prennent en amont, pas en réunion.
- **Registre de décisions absent** — sans trace, les décisions sont contestées, dupliquées ou oubliées.

## Bonnes pratiques 2026

- **Async-first** : utiliser Teams/Slack pour les status updates hebdos ; réserver le COPIL aux décisions et arbitrages uniquement.
- **One-pager executif** : généré automatiquement depuis les données du projet (Jira/ADO export → template Markdown → PDF).
- **Dashboard live** : un lien vers un board Jira/ADO filtré remplace avantageusement les tableaux d'avancement statiques dans les rapports récurrents.
- **OKR alignment** : chaque rapport de statut doit référencer l'OKR ou l'objectif stratégique auquel le projet contribue — cela renforce la légitimité des demandes de ressources.
- **RACI explicite** : pour chaque lot, identifier clairement R (Responsible), A (Accountable), C (Consulted), I (Informed) avant le lancement pour éviter les flous lors des escalades.


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
