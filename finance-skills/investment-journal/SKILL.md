---
name: investment-journal
description: Aide à documenter et suivre des décisions d'investissement avec raisonnement et résultats. À utiliser quand l'utilisateur parle d'investissements et veut les organiser. Se déclenche aussi avec "mes investissements", "journal d'investissement", "portefeuille", "j'ai investi dans", "suivi placements".
---

# Investment Journal

Outil de documentation rigoureuse des décisions d'investissement : raisonnement ex-ante, suivi de performance, bilan et apprentissage. Ne constitue pas un conseil financier.

---

## Workflow en étapes

### 1. Saisir une nouvelle position

Collecter les données minimales pour une entrée utile :

```
Actif         : [ex. ETF MSCI World / BTC / SCPI Primopierre / SCI Immo]
Type          : [action, ETF, crypto, immobilier, obligataire, SCPI, autre]
Montant (EUR) : [ex. 2 500]
Prix d'entrée : [ex. 82,40 €/part ou 31 200 €/lot]
Quantité      : [ex. 30 parts]
Date          : [YYYY-MM-DD]
Broker/enveloppe : [PEA / CTO / AV / PER]
Horizon       : [court <1 an | moyen 1-5 ans | long >5 ans]
Risque perçu  : [1=très faible ... 5=très élevé]
Thèse         : [1-3 phrases : pourquoi maintenant, pourquoi cet actif]
Déclencheur de sortie : [objectif de prix, durée, événement]
```

**Exemple complet :**
```
Actif         : Amundi MSCI World (CW8)
Type          : ETF
Montant       : 3 000 EUR
Prix d'entrée : 500,00 EUR/part
Quantité      : 6 parts
Date          : 2026-06-24
Enveloppe     : PEA
Horizon       : long (>10 ans)
Risque        : 3/5
Thèse         : Exposition globale diversifiée, faibles frais (0,20% TER),
                DCA mensuel automatique, pas de stock-picking.
Sortie        : retraite ~2040 ou rééquilibrage si poids >70% portefeuille.
```

---

### 2. Tableau de suivi consolidé

Maintenir un tableau unique, mis à jour à chaque révision (hebdomadaire ou mensuelle) :

| Date entrée | Actif | Enveloppe | Montant (EUR) | Prix entrée | Prix actuel | Qté | Val. actuelle | +/- EUR | +/- % | Statut |
|-------------|-------|-----------|--------------|-------------|-------------|-----|--------------|---------|-------|--------|
| 2026-01-10  | CW8   | PEA       | 2 500        | 480,00      | 512,00      | 5   | 2 560        | +60     | +2,4  | OPEN   |
| 2026-03-05  | BTC   | CTO       | 1 000        | 72 000      | 65 000      | 0,014 | 910       | -90     | -9,0  | OPEN   |
| 2025-11-20  | XYZ   | CTO       | 500          | 18,50       | —           | 27  | —            | —       | —     | CLOSED |

Formule P&L simple (copiable dans Excel/Sheets) :
```
= (Prix_actuel - Prix_entrée) / Prix_entrée * 100   → % gain/perte
= Prix_actuel * Quantité - Montant_investi           → EUR gain/perte
```

---

### 3. Critères de décision — avant d'entrer

Poser ces questions avant toute entrée :

| Critère | Question clé | Réponse attendue |
|---------|-------------|-----------------|
| Compréhension | Puis-je expliquer l'actif en 2 min ? | Oui sinon stop |
| Allocation | Quel % du portefeuille total ? | <10% par ligne risquée |
| Liquidité | Puis-je sortir en <5j si besoin ? | Oui pour les fonds d'urgence |
| Corrélation | Cet actif corrèle-t-il mes autres ? | Minimiser si possible |
| Coût total | Frais de courtage + spread + TER ? | Calculé avant achat |
| Fiscalité | Enveloppe optimale ? | PEA > AV > CTO selon durée |

---

### 4. Bilan périodique (mensuel/trimestriel)

Calculer :
- **Performance globale** : `(Valeur totale actuelle - Capital total investi) / Capital investi * 100`
- **Diversification** : répartition par type d'actif, géographie, secteur
- **Exposition au risque** : % du portefeuille en actifs risque >=4
- **Benchmark** : comparer à un indice de référence (ex. MSCI World, inflation)

Template bilan trimestriel :
```
Période      : Q2 2026
Capital total: 15 000 EUR
Valeur totale: 15 780 EUR
Performance  : +5,2% / Benchmark MSCI World: +4,8%
Meilleure ligne : CW8 +8,1%
Moins bonne   : BTC -9,0%
Répartition  : ETF 60% | Crypto 7% | Oblig 20% | Cash 13%
Action Q3    : renforcer ETF obligataire, pas de nouvelle crypto
```

---

### 5. Journal des sorties et leçons

À chaque clôture de position, documenter :

```
Actif         : [nom]
Date sortie   : [YYYY-MM-DD]
Prix de sortie: [valeur]
Durée         : [jours détenus]
Résultat      : [+/- EUR et %]
Thèse validée : [oui / non / partielle]
Raison sortie : [objectif atteint / stop-loss / besoin liquidité / erreur initiale]
Leçon         : [1-2 phrases concrètes pour les prochaines décisions]
```

---

## Garde-fous et anti-patterns

**Ne pas faire :**
- Investir sans thèse écrite — "j'ai un bon feeling" n'est pas une thèse.
- Ignorer les frais : 1% de frais annuels = -26% sur 30 ans (règle des 72).
- Concentrer >30% sur un seul actif risqué.
- Modifier la thèse a posteriori pour justifier une perte (biais de confirmation).
- Trader sur des actifs non compris (mème stocks, options exotiques, leviers x5+).
- Négliger la fiscalité : PEA vs CTO peut faire plusieurs milliers d'euros d'écart.

**Pièges fréquents (2026) :**
- Effet FOMO crypto/IA : entrée au pic d'un narrative viral.
- Frais cachés des plateformes "0 commission" (spread élargi, change EUR/USD).
- Rééquilibrage trop fréquent : génère des frais et événements fiscaux inutiles.
- Confondre investissement et épargne de précaution (fonds d'urgence non investissable).

---

## Bonnes pratiques (2026)

- **DCA** (Dollar-Cost Averaging) : automatiser des achats récurrents — réduit l'impact du timing.
- **Rééquilibrage annuel** : ramener les poids cibles sans sur-trader.
- **Règle des 5%** : aucune ligne spéculative >5% du portefeuille total.
- **Enveloppes fiscales en priorité** : PEA avant CTO pour actions européennes/ETF éligibles ; AV pour l'horizon successoral.
- **Tenir le journal même en perte** : les erreurs documentées valent plus que les succès non analysés.

---

> Ce journal est un outil d'organisation personnelle. Il ne constitue pas un conseil financier. Consultez un conseiller financier agréé (CIF) pour toute décision significative.
