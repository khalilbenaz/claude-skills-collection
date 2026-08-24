---
name: business-it-commercial-proposal
description: Génération d'offres commerciales pour des projets IT — lots techniques, chiffrage jour-homme, hypothèses, SLA, TMA et annexes techniques. Se déclenche avec "offre commerciale IT", "proposition commerciale IT", "devis IT", "appel d'offres", "offre technique et financière", "chiffrage jour-homme", "SOW", "réponse à AO". Also triggers on "IT project proposal", "software quote", "SOW for a client".
---

# IT Commercial Proposal Generator

## Workflow

### Étape 1 — Cadrage du besoin

Avant d'écrire une seule ligne, extraire ces informations du client :

```
CONTEXTE    : secteur, taille entreprise, périmètre fonctionnel
PROBLÈME    : pain point actuel, coût de l'inaction
OBJECTIFS   : KPI cibles (délai de traitement, taux d'erreur, SLA...)
CONTRAINTES : budget indicatif, deadline, stack imposée, normes (RGPD, PCI-DSS...)
DÉCIDEURS   : qui signe ? (DG, DSI, DAF) — cela dicte le ton
AO/GRÉ À GRÉ : réponse à appel d'offres formel (2 enveloppes) ou négociation directe ?
```

Si une information manque, générer une liste de questions de cadrage structurées et les poser en bloc — pas au fil de la génération.

**Critère de passage** : ne pas produire l'offre tant que contexte + objectifs + contraintes budget ne sont pas connus.

---

### Étape 2 — Structure de l'offre (ordre de rédaction interne)

Rédiger dans cet ordre (l'executive summary se place en tête dans le livrable final mais se rédige en dernier) :

| # | Section | Destinataire principal | Longueur cible |
|---|---------|----------------------|----------------|
| 1 | Compréhension du besoin | Tous | 1/2 page |
| 2 | Solution proposée + architecture | DSI / CTO | 1–2 pages |
| 3 | Méthodologie & livrables | Chef de projet | 1 page |
| 4 | Planning (phases + jalons) | Chef de projet | tableau |
| 5 | Équipe projet | DSI / DRH | 1/2 page |
| 6 | Chiffrage financier | DAF / DG | tableau |
| 7 | Références similaires | Tous | 1/2 page |
| 8 | Conditions contractuelles | Juridique | 1/2 page |
| 9 | **Executive Summary** (rédigé en dernier) | DG / DAF | 1/2 page max |

---

### Étape 3 — Rédiger chaque section

**Compréhension du besoin**
Reformuler mot pour mot ce que le client a exprimé, puis compléter avec les enjeux business sous-jacents. Cela crédibilise l'offre et prouve l'écoute.

**Solution proposée**
- Décrire l'architecture cible en 3–5 composants clés avec le nom des technologies choisies et la justification du choix (ex. : "PostgreSQL plutôt qu'Oracle : réduction TCO de 60%, compétences internes disponibles").
- Inclure un schéma textuel ou ASCII si un vrai diagramme n'est pas disponible :

```
[Frontend React] → [API Gateway (Kong)] → [Microservices .NET 8]
                                                    ↓
                                          [PostgreSQL 16] + [Redis cache]
```

**Chiffrage financier — modèle de tableau**

```
Profil              | TJM (€HT) | Jours Phase 1 | Jours Phase 2 | Total jours | Coût HT
--------------------|-----------|---------------|---------------|-------------|----------
Chef de projet      |   800     |      10       |       5       |     15      |  12 000
Architecte solution |  1 000     |       5       |       2       |      7      |   7 000
Développeur senior  |   700     |      20       |      30       |     50      |  35 000
QA / Test           |   600     |       0       |      10       |     10      |   6 000
TOTAL               |           |              |               |             |  60 000
TVA 20%             |           |              |               |             |  12 000
TOTAL TTC           |           |              |               |             |  72 000
```

Toujours préciser :
- Mode de facturation : forfait fixe / régie / abonnement mensuel
- Jalons de paiement (ex. : 30% à la commande, 40% à la livraison phase 1, 30% à la recette finale)
- Exclusions explicites : licences tierces, hébergement, déplacements au-delà de 50 km, formations
- Validité de l'offre : 30 ou 60 jours selon le contexte

**Options / variantes (toujours proposer au moins deux)**

```
Option A — MVP (4 mois)   : 42 000 € HT — fonctionnalités core uniquement
Option B — Complet (7 mois): 60 000 € HT — intégrations + reporting + maintenance 6 mois incluse
```

**Executive Summary (rédigé en dernier)**

5 questions auxquelles il doit répondre en moins de 20 lignes :
1. Quel est le problème client ?
2. Quelle est la solution proposée ?
3. Pourquoi nous (différenciation) ?
4. Quelle valeur / ROI attendu ?
5. Quand et pour quel budget ?

---

### Étape 4 — Adapter le ton selon le décideur

| Interlocuteur | Priorités à mettre en avant | Ce qu'il faut éviter |
|---------------|----------------------------|----------------------|
| DG / CEO | ROI, délai de retour sur investissement, risque business | Détails techniques |
| DAF / CFO | Coût total de possession (TCO), modèle de facturation, risques budgétaires | Acronymes tech |
| DSI / CTO | Architecture, maintenabilité, sécurité, performance, scalabilité | Jargon business vague |
| Chef de projet | Planning détaillé, livrables, critères de recette, gouvernance | ROI financier |

---

### Étape 5 — Relecture et qualification finale

Checklist avant livraison :

- [ ] Chiffrage cohérent avec le planning (nb jours × TJM = total)
- [ ] Aucun engagement hors scope non chiffré
- [ ] Date de validité présente
- [ ] Deux enveloppes séparées si AO formel
- [ ] Orthographe et grammaire irréprochables
- [ ] Executive summary auto-suffisant (peut se lire seul)
- [ ] Variante MVP + variante complète proposées
- [ ] Références client avec secteur + résultat mesurable

---

## Garde-fous et anti-patterns

**Ne pas faire**

- **Lister des fonctionnalités** au lieu de bénéfices : "Nous livrons un module de reporting" → inutile. Dire : "Le reporting temps réel réduit le délai de clôture mensuelle de 3 jours à 4 heures."
- **Chiffrage opaque** : un forfait global sans décomposition est un signal d'alarme pour tout acheteur public ou DSI expérimenté.
- **Promettre sans engagement contractuel** : toute promesse de délai ou de performance doit être accompagnée d'un critère de recette mesurable.
- **Executive summary générique** : copier-coller un template sans personnaliser au contexte client — se voit immédiatement et disqualifie l'offre.
- **Ignorer les contraintes réglementaires** : pour les secteurs banque, santé, assurance — mentionner explicitement la conformité RGPD, PCI-DSS, ISO 27001, etc.
- **TJM sans justification pour des profils senior** : si les taux sont élevés, les justifier par la rareté du profil ou la criticité du projet.

**Pièges fréquents**

- Oublier la TVA ou le régime fiscal applicable (AO public : HT obligatoire, TVA séparée)
- Ne pas distinguer régie et forfait dans le même document
- Proposer un planning sans marge de risque (ajouter 15–20% de buffer sur les phases d'intégration)
- Référencer des technologies obsolètes ou abandonnées en 2026 (ex. : Angular 1, jQuery comme stack principale)

---

## Bonnes pratiques 2026

- **AI-augmented delivery** : si l'équipe utilise des outils IA (GitHub Copilot, Cursor, Claude Code), le mentionner comme accélérateur de productivité — c'est désormais un différenciateur positif attendu par les DSI modernes.
- **Green IT** : pour les projets cloud, estimer l'empreinte carbone et proposer des choix d'architecture éco-responsables (régions Azure/AWS à énergie renouvelable, right-sizing, serverless).
- **Sécurité by design** : intégrer une section ou un paragraphe dédié à la posture sécurité (SAST/DAST dans la CI, gestion des secrets, politiques RBAC) — désormais exigé dans la majorité des AO publics et grandes entreprises.
- **Modèle de facturation flexible** : proposer un abonnement SaaS ou TaaS (Team as a Service) mensuel en alternative au forfait projet — tendance forte en 2025–2026 pour les prestataires IT.
- **SLA chiffré** : pour toute offre incluant de la maintenance ou du run, inclure un tableau de SLA avec niveaux de criticité, temps de réponse et pénalités contractuelles.


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
