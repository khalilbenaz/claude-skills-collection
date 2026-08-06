---
name: savings-goal-planner
description: Aide à planifier un objectif d'épargne avec calcul, timeline et stratégie. À utiliser quand l'utilisateur veut épargner pour un achat, un voyage, un fonds d'urgence. Se déclenche aussi avec "je veux économiser", "objectif épargne", "combien mettre de côté", "fonds d'urgence", "épargner pour". Also triggers on "savings goal", "how much should I save", "save for a purchase".
---

# Savings Goal Planner

## Workflow en 7 étapes

### 1. Cadrage de l'objectif
Collecter au minimum :
- **Montant cible** (€/MAD/autre devise)
- **Date limite** (ou nombre de mois)
- **Raison** : achat, voyage, fonds d'urgence, apport immobilier, autre

Poser la question si l'un manque. Ne pas continuer sans ces 3 données.

---

### 2. Situation financière actuelle
- Revenu net mensuel (après impôts/cotisations)
- Dépenses fixes mensuelles (loyer, crédits, abonnements)
- Épargne déjà accumulée pour cet objectif

> Calcul rapide du solde disponible :
> `disponible = revenu_net − dépenses_fixes`

---

### 3. Calcul de base

Formule sans intérêts (effort mensuel brut) :
```
effort_mensuel = (objectif − épargne_existante) / mois_restants
```

Formule avec intérêts composés (livret, placement) :
```
# Python — copier-coller directement
r = taux_annuel / 12          # taux mensuel
n = mois_restants
C = épargne_existante
G = objectif

# Versement mensuel nécessaire (annuité future)
if r == 0:
    versement = (G - C) / n
else:
    versement = (G - C * (1 + r)**n) * r / ((1 + r)**n - 1)

print(f"Versement mensuel : {versement:.2f}")
```

Utiliser le taux actuel réel du livret (ex. livret A = 2,4 % en 2026, soit `r = 0.002`).

---

### 4. Tableau de projection mois par mois

Générer un tableau Markdown compact (12 mois max en ligne, sinon annuel) :

| Mois | Versement | Solde cumulé | % objectif |
|------|-----------|--------------|------------|
| 1    | 300 €     | 500 €        | 10 %       |
| …    | …         | …            | …          |
| N    | 300 €     | 5 000 €      | 100 %      |

Inclure la date d'atteinte de l'objectif.

---

### 5. Scénarios comparatifs

Toujours proposer 3 scénarios :

| Scénario      | Effort mensuel | Durée       | Note |
|---------------|----------------|-------------|------|
| Conservateur  | −20 % effort   | +X mois     | si revenu incertain |
| Réaliste      | calcul nominal | durée cible | plan de base |
| Optimiste     | +20 % effort   | −X mois     | si rentrée d'argent |

---

### 6. Stratégies pour dégager l'effort mensuel

Proposer 3 à 5 pistes adaptées au contexte :
- **Réduction de dépenses** : abonnements inutilisés, sorties, achats impulsifs
- **Automatisation** : virement automatique le jour du salaire (« pay yourself first »)
- **Revenus complémentaires** : freelance, revente d'objets, heures supplémentaires
- **Optimisation des charges fixes** : renégociation assurance, forfait téléphone
- **Regroupement de crédits** si ratio dépenses/revenu > 40 %

---

### 7. Recommandations et priorisation

Vérifier et mentionner si nécessaire :
- **Fonds d'urgence** : si absent, le prioriser avant tout autre objectif (3 à 6 mois de dépenses fixes)
- **Dettes à taux élevé** : rembourser avant d'épargner si taux crédit > rendement épargne
- **Effort ≥ 30 % du disponible** : signaler le risque, proposer de rallonger la durée

---

## Garde-fous / Anti-patterns

| Piège | Conséquence | Correction |
|-------|-------------|------------|
| Objectif sans date | Pas de sens d'urgence, abandon | Fixer une deadline ferme |
| Versement > disponible réel | Découvert, abandon | Rallonger la durée ou réduire l'objectif |
| Ignorer les dépenses imprévues | Plan cassé au premier incident | Prévoir +10 % de marge sur l'effort |
| Taux d'intérêt irréaliste | Sous-estimation de l'effort | Utiliser le taux actuel du marché, pas historique |
| Épargner avant de rembourser dettes coûteuses | Perte nette garantie | Comparer taux crédit vs rendement |
| Tableau trop long (5 ans mois par mois) | Illisible | Passer en projection annuelle au-delà de 12 mois |

---

## Bonnes pratiques 2026

- **Automatiser** : virement programmé J+1 après salaire — taux de réussite nettement supérieur à l'épargne volontaire
- **Séparer physiquement** : compte dédié à l'objectif (pas le compte courant)
- **Révision trimestrielle** : ajuster le versement si revenu change
- **Indexation** : si objectif > 1 an, intégrer l'inflation (cible 2 % en zone euro)
- **Ne pas recommander** de produits financiers spécifiques (assurance-vie, crypto, etc.) — rester sur les principes
- **Adapter la devise** et la fiscalité au pays de l'utilisateur (mentionner si incertain)
