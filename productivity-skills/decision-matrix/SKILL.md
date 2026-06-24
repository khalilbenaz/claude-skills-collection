---
name: decision-matrix
description: Aide à prendre une décision complexe en structurant les options et critères. À utiliser quand l'utilisateur hésite entre plusieurs choix. Se déclenche aussi avec "je ne sais pas quoi choisir", "avantages inconvénients", "comparer les options", "matrice de décision", "quel choix faire".
---

# Decision Matrix

## Quand utiliser ce skill

- 2 options ou plus avec des trade-offs non évidents.
- Décisions techniques : choix de stack, d'outil, de cloud provider, d'architecture.
- Décisions stratégiques : priorisation de projets, choix de prestataire, recrutement.
- Décisions personnelles : changement de poste, investissement, formation.

## Workflow en 7 étapes

### 1. Inventorier les options
Lister toutes les alternatives réalistes. Ne pas en exclure prématurément.
```
Options identifiées :
- A : PostgreSQL
- B : MongoDB
- C : DynamoDB
```

### 2. Collecter les critères
Poser la question : "Qu'est-ce qui ferait que vous regretteriez votre choix dans 12 mois ?"

Exemples de critères courants selon le contexte :

| Contexte       | Critères typiques                                      |
|----------------|--------------------------------------------------------|
| Tech/outil     | Coût, courbe d'apprentissage, scalabilité, support     |
| Architecture   | Couplage, testabilité, temps de déploiement, dette     |
| Prestataire    | Prix, délai, références, risque de dépendance          |
| Projet/produit | Valeur métier, effort, time-to-market, risque          |

### 3. Pondérer les critères (poids 1–5)
Chaque critère reçoit un poids reflétant son importance relative.
```
Critère          | Poids
-----------------|------
Performance      |   5
Coût licence     |   4
Facilité d'admin |   3
Écosystème OSS   |   2
```

### 4. Évaluer chaque option (note 1–5)
Note objective par critère. Demander les données concrètes si disponibles (bench, devis, avis).

### 5. Construire la matrice pondérée
Score pondéré = note × poids. Score total = somme des scores pondérés.

```
Option       | Perf (×5) | Coût (×4) | Admin (×3) | OSS (×2) | TOTAL
-------------|-----------|-----------|------------|----------|------
PostgreSQL   | 4×5=20    | 5×4=20    | 4×3=12     | 5×2=10   |  62
MongoDB      | 4×5=20    | 4×4=16    | 3×3=9      | 4×2=8    |  53
DynamoDB     | 5×5=25    | 2×4=8     | 5×3=15     | 1×2=2    |  50
```

### 6. Analyser les résultats
- L'option avec le **score total le plus élevé** est le choix rationnel pondéré.
- Identifier les **trade-offs clés** : où l'option gagnante sacrifie quoi.
- Vérifier les **dealbreakers** : un critère à poids 5 avec note 1 peut éliminer une option indépendamment du total.

### 7. Résumer de façon décisionnelle
Toujours conclure par une formule conditionnelle :

> "Si tu privilégies **la maîtrise des coûts** → **PostgreSQL** (score 62).
> Si la **scalabilité serverless** est prioritaire → **DynamoDB** malgré le coût.
> Recommandation neutre : PostgreSQL couvre 90% des critères avec le meilleur équilibre."

## Critères de qualité d'une bonne matrice

- **Exhaustivité** : 3–7 options, 4–8 critères (au-delà, la lisibilité chute).
- **Indépendance** : critères non redondants (ne pas avoir "coût" ET "budget" séparément).
- **Mesurabilité** : chaque critère doit pouvoir être noté sans ambiguïté.
- **Représentativité** : les poids reflètent les vraies priorités du décideur, pas des suppositions.

## Anti-patterns / pièges

| Piège                         | Symptôme                                        | Correctif                                             |
|-------------------------------|-------------------------------------------------|-------------------------------------------------------|
| **Sunk cost fallacy**         | "On a déjà investi 6 mois sur X"               | Ignorer le passé, évaluer sur les coûts futurs        |
| **Status quo bias**           | Note systématiquement plus haute à l'existant  | Forcer une évaluation à blanc sans label              |
| **Critères post-rationalisation** | Critères ajoutés pour justifier un choix déjà fait | Définir les critères AVANT de noter les options |
| **Paralysie par l'analyse**   | Matrice infinie avec 15 critères               | Limiter à 6 critères max, timebox la réflexion        |
| **Score total trompeur**      | Une option domine mais a un 1 sur un critère critique | Vérifier les minimums acceptables par critère  |
| **Poids uniformes**           | Tous les critères à 3                          | Forcer un tri : au moins un critère à 5, un à 1       |

## Garde-fous

- Ne pas choisir **à la place** de l'utilisateur : présenter les résultats, nommer le gagnant, laisser la décision finale.
- Si deux options sont à moins de **10% d'écart**, signaler que la différence n'est pas significative : d'autres facteurs (intuition, politique interne, contrainte cachée) peuvent primer.
- Signaler explicitement si un critère important **manque de données objectives** (ex. : estimation de coût incertaine).
- En contexte technique, toujours mentionner le **coût de réversibilité** : changer d'avis dans 18 mois, quelle est la peine ?

## Exemple complet condensé (choix de framework frontend)

```
Critères          | Poids | React | Vue | Svelte
------------------|-------|-------|-----|-------
Ecosystem/libs    |   5   |   5   |  4  |   3
Courbe apprenti.  |   4   |   3   |  5  |   5
Perf bundle       |   3   |   3   |  3  |   5
Recrutement       |   5   |   5   |  3  |   2
Community/support |   4   |   5   |  4  |   3
TOTAL PONDÉRÉ     |       |  91   | 80  |  72
```

> Recommandation : **React** si l'équipe grossit (recrutement critique).
> **Svelte** si projet solo ou perf bundle primordiale.
