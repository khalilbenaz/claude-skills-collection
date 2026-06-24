---
name: finance-budget-tracker
description: Aide à créer et suivre un budget mensuel clair et réaliste. À utiliser quand l'utilisateur veut organiser ses finances, suivre ses dépenses ou créer un budget. Se déclenche aussi avec "budget", "mes finances", "où va mon argent", "gérer mon argent", "budget mensuel", "économiser".
---

# Budget Tracker

## Workflow — étapes numérotées

### 1. Collecter les revenus nets mensuels

Demande toutes les sources **nettes d'impôts** :

- Salaire principal (après cotisations/impôts)
- Revenus secondaires : freelance, loyers perçus, dividendes, allocations
- Revenus irréguliers : moyenne sur 3 mois si variable

> Si l'utilisateur ignore son net exact, propose d'estimer à partir du brut :
> **Net ≈ Brut × 0,78** (France) | **Net ≈ Brut × 0,85** (Maroc, charges sociales ~15 %)

---

### 2. Répertorier les dépenses fixes (non-négociables)

Exemples : loyer/hypothèque, crédits, assurances, abonnements internet/mobile, mutuelles, pensions.

```
Dépenses fixes totales = _____ DH/€/FCFA
```

Critère : si tu peux l'annuler en moins de 30 jours → dépense variable, pas fixe.

---

### 3. Catégoriser les dépenses variables

Regroupe par poste, propose des valeurs par défaut si l'utilisateur n'a pas de chiffres :

| Poste | Fourchette usuelle | Valeur utilisateur |
|---|---|---|
| Alimentation (courses) | 15–25 % du revenu | |
| Transport | 5–15 % | |
| Loisirs / sorties | 5–10 % | |
| Habillement | 2–5 % | |
| Santé / pharmacie | 2–5 % | |
| Divers / imprévus | 3–5 % | |

---

### 4. Construire le tableau de bord mensuel

Génère ce tableau complet, adapte la devise :

| Catégorie | Prévu | Réel | Écart | % utilisé | Statut |
|---|---|---|---|---|---|
| **Revenus nets** | | | | | |
| Salaire | X | | | | |
| Autres | X | | | | |
| **TOTAL REVENUS** | **X** | | | | |
| **Dépenses fixes** | | | | | |
| Loyer | X | | | | |
| Crédits | X | | | | |
| Abonnements | X | | | | |
| **Dépenses variables** | | | | | |
| Alimentation | X | | | | |
| Transport | X | | | | |
| Loisirs | X | | | | |
| Imprévus | X | | | | |
| **TOTAL DÉPENSES** | **X** | | | | |
| **SOLDE MENSUEL** | **X** | | | | |
| **Épargne cible** | X | | | | |

Formule clé : `SOLDE = REVENUS - DÉPENSES TOTALES - ÉPARGNE`

---

### 5. Appliquer une règle de répartition (choix selon profil)

**Règle 50/30/20** (profil standard) :
- 50 % → besoins essentiels (fixes + alimentation + transport)
- 30 % → envies / loisirs
- 20 % → épargne + remboursement de dettes

**Règle 60/20/20** (profil serré / revenu modeste) :
- 60 % → dépenses vitales
- 20 % → loisirs
- 20 % → épargne

**Règle personnalisée** : si l'utilisateur a un objectif précis (achat immobilier, remboursement crédit), adapte les pourcentages en conséquence.

---

### 6. Analyser les écarts et signaler les alertes

Seuils d'alerte à afficher :

| Condition | Signal |
|---|---|
| % utilisé > 100 % sur un poste | DÉPASSEMENT |
| Solde mensuel < 0 | DEFICIT — action requise |
| Épargne < 5 % des revenus | RISQUE — fonds d'urgence insuffisant |
| Dépenses fixes > 60 % du revenu | RIGIDITÉ BUDGÉTAIRE élevée |

---

### 7. Formuler des recommandations actionnables

Structure chaque recommandation ainsi :

```
Poste concerné : [Abonnements]
Constat : 4 abonnements streaming = 55 €/mois
Action : Garder 1 plateforme principale → économie potentielle : 35 €/mois
Impact annuel : +420 €
```

Priorise par **impact annuel décroissant**. Maximum 5 recommandations pour rester actionnable.

---

### 8. Définir un objectif d'épargne SMART

```
Objectif : [ex. fonds d'urgence = 3 mois de dépenses]
Montant cible : _____ DH/€
Épargne mensuelle : _____ DH/€
Délai estimé : _____ mois
```

Fonds d'urgence minimum recommandé : **3 à 6 mois de dépenses fixes**.

---

## Garde-fous et anti-patterns

**Ne pas faire :**
- Proposer un budget avec 0 % de loisirs → non-tenable, abandon garanti
- Ignorer les dépenses annuelles (assurance auto, vacances) → les ramener en mensuel : `annuel ÷ 12`
- Confondre revenu brut et net dans les calculs
- Donner des conseils d'investissement ou de placement (hors scope)
- Juger ou commenter les choix de dépenses de l'utilisateur

**Pièges courants :**
- Les abonnements oubliés (Netflix, Spotify, SaaS divers) : demander de vérifier les relevés des 3 derniers mois
- Les dépenses groupées (cigarettes, café quotidien) : `2,5 €/jour × 30 = 75 €/mois`
- Les crédits à la consommation cachés dans "divers"
- Les virements intra-comptes comptés deux fois comme dépenses

---

## Bonnes pratiques 2026

- **Revue mensuelle le 1er du mois** : comparer prévu vs réel, ajuster le mois suivant
- **Catégories stables** : ne pas changer les catégories en cours d'année pour pouvoir comparer
- **Automatiser le suivi** : virement automatique vers l'épargne dès réception du salaire ("pay yourself first")
- **Fonds imprévus** : toujours budgétiser 3–5 % pour les imprévus — sinon le premier incident casse le budget
- **Révision annuelle** : recalibrer au changement de situation (augmentation, enfant, déménagement)
- **Outils compatibles** : Google Sheets, Notion, YNAB, Bankin', Linxo — le meilleur outil est celui que l'utilisateur utilise réellement


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
