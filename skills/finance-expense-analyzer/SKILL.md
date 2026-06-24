---
name: finance-expense-analyzer
description: Analyse un relevé de dépenses et identifie les tendances, fuites d'argent et pistes d'économie. À utiliser quand l'utilisateur colle un relevé bancaire ou liste ses dépenses. Se déclenche aussi avec "analyse mes dépenses", "relevé bancaire", "où part mon argent", "trop de dépenses", "fuites d'argent".
---

# Expense Analyzer

## Étape 0 — Réception et nettoyage des données

Avant toute analyse, évalue la qualité de l'input :

- **Format CSV** : vérifie séparateur (`,` ou `;`), encodage (UTF-8), présence des colonnes date/libellé/montant.
- **Copier-coller bancaire** : extrais date, libellé, débit/crédit avec regex si nécessaire.
- **Liste informelle** : reformate en tableau structuré avant de continuer.

Si des lignes sont ambiguës, liste-les explicitement et propose une catégorie par défaut.

Exemple de normalisation rapide (Python) :
```python
import pandas as pd

df = pd.read_csv("releve.csv", sep=";", parse_dates=["Date"])
df.columns = ["date", "libelle", "debit", "credit"]
df["montant"] = df["debit"].fillna(0) - df["credit"].fillna(0)
df = df[df["montant"] > 0]  # garder uniquement les dépenses
```

---

## Étape 1 — Catégorisation

Classe chaque ligne dans une catégorie. Hiérarchie recommandée :

| Catégorie       | Exemples de libellés clés                          |
|-----------------|----------------------------------------------------|
| Logement        | loyer, EDF, GDF, assurance habitation, syndic      |
| Transport       | SNCF, Uber, essence, péage, assurance auto         |
| Alimentation    | Carrefour, Leclerc, Lidl, Monoprix, boulangerie    |
| Santé           | pharmacie, mutuelle, médecin, laboratoire          |
| Abonnements     | Netflix, Spotify, SFR, Orange, Adobe, Amazon Prime |
| Loisirs         | restaurant, cinéma, sport, voyage, culture         |
| Épargne/invest. | virement épargne, assurance-vie, courtier          |
| Divers          | tout ce qui ne rentre pas ailleurs                 |

Règle de décision : si un libellé contient un mot-clé connu → catégorie directe. Sinon → heuristique sur le montant + contexte. Si incertain → marque `?` et indique la règle appliquée.

---

## Étape 2 — Résumé par catégorie

Pour chaque catégorie, fournis :
- **Total** en devise locale
- **% du revenu net** (si fourni) ou **% du total dépenses**
- **Nombre de transactions**

Format de sortie attendu :

```
Catégorie       | Total    | % dépenses | Nb txn
----------------|----------|------------|-------
Logement        | 950 €    | 32 %       | 3
Alimentation    | 480 €    | 16 %       | 22
Abonnements     | 120 €    | 4 %        | 8
...
TOTAL           | 2 980 €  | 100 %      | 67
```

Repères budgétaires (règle 50/30/20) :
- Besoins (logement + transport + santé) : ≤ 50 % du revenu net
- Envies (loisirs, restaurants, abonnements) : ≤ 30 %
- Épargne : ≥ 20 %

---

## Étape 3 — Détection d'anomalies

Cherche systématiquement :

1. **Doublons** : même libellé + même montant + écart < 3 jours → signal fort.
2. **Abonnements oubliés** : récurrences mensuelles < 20 € souvent invisibles (ex. essais gratuits devenus payants).
3. **Pics inhabituels** : montant > 2× la médiane de la catégorie sur la période.
4. **Charges fantômes** : libellé inconnu + montant rond (5, 10, 15 €/mois) → risque de souscription non voulue.
5. **Frais bancaires** : agios, frais de tenue de compte, commissions de change.

Pour chaque anomalie, indique : libellé exact, montant, date, impact annuel estimé.

---

## Étape 4 — Tendances (si données multi-périodes)

Si au moins 2 mois sont fournis :
- Calcule la variation mensuelle par catégorie (en € et %).
- Identifie les catégories en hausse continue (tendance à surveiller).
- Calcule le solde moyen mensuel : `revenus - dépenses`.

```
Alimentation : jan 420 € → fév 510 € → mar 480 € (+14 % sur 3 mois, pic fév)
Abonnements  : jan 95 €  → fév 95 €  → mar 120 € (+26 %, nouvel abonnement détecté en mar)
```

---

## Étape 5 — Top 5 des postes de dépense

Liste les 5 transactions ou sous-catégories les plus élevées avec :
- Montant exact
- Libellé bancaire
- Impact annuel projeté (× 12 si récurrent)
- Levier d'action possible (oui/non/partiel)

---

## Étape 6 — Pistes d'économie

Formule 3 à 6 recommandations **chiffrées et actionnables**, classées par potentiel d'économie décroissant :

Exemples :
- "Cumul abonnements streaming : 35 €/mois. Conserver 1 seul → économie 25 €/mois = **300 €/an**."
- "Frais bancaires : 7 €/mois. Compte en ligne (Boursorama, Fortuneo) : 0 €. → **84 €/an**."
- "Restaurants midi : 18 repas × 14 € = 252 €/mois. Panier repas 3j/sem → **-90 €/mois**."

Ne propose pas d'optimisation sur les postes déjà raisonnables (logement dans la moyenne régionale, mutuelle obligatoire, etc.).

---

## Garde-fous et anti-patterns

- **Ne jamais juger** les choix de consommation (loisirs, restaurants, mode). Ton neutre et factuel.
- **Ne pas extrapoler** sans base : si un seul mois est fourni, pas de "tendance".
- **Ne pas inventer** des libellés ou catégories non présents dans les données.
- **Ne pas arrondir** les montants dans les calculs intermédiaires ; arrondi uniquement à l'affichage.
- **Devise** : utilise systématiquement la devise des données. Si mixte (€ + $), convertis au taux du jour et signale-le.
- **Données manquantes** : si revenus non fournis, omets les ratios % du revenu et indique-le clairement.
- **Confidentialité** : ne répète pas les IBAN, numéros de carte ou données personnelles détectées dans les libellés.

---

## Bonnes pratiques 2026

- Propose d'exporter l'analyse en CSV ou Markdown si l'utilisateur veut archiver.
- Si l'utilisateur utilise un outil de gestion (YNAB, Bankin', Linxo, Copilot), adapte la nomenclature des catégories à cet outil.
- Pour les indépendants/freelances : sépare dépenses pro et perso dès le début ; signale les dépenses potentiellement déductibles (repas pro, abonnements métier, matériel).
- Recommande une revue trimestrielle des abonnements plutôt qu'annuelle (les offres changent vite).


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
