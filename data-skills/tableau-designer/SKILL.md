---
name: tableau-designer
description: Conception de dashboards Tableau incluant calculated fields, LOD expressions, actions et storytelling. Se déclenche avec "Tableau", "dashboard Tableau", "LOD expression", "calculated field", "Tableau Server. Also triggers on "Tableau dashboard".
---

# Tableau Designer

## Workflow

### 1. Cadrer les besoins avant d'ouvrir Tableau

- Lister les **3-5 questions métier** auxquelles le dashboard doit répondre (ex. « Quel commercial a le meilleur taux de conversion ce mois-ci ? »).
- Identifier le public cible → adapte le grain :
  - Exécutif : KPIs agrégés, peu de filtres, mobile-friendly
  - Opérationnel : drill-down, filtres temporels, export CSV
  - Analytique : LOD, paramètres dynamiques, tooltips détaillés
- Esquisser le layout sur papier avant de toucher Tableau (économise 50 % des itérations).

### 2. Préparer et modéliser les données

**Connexions recommandées par cas :**

| Cas | Connexion | Raison |
|---|---|---|
| Dashboard haute fréquence (>100 accès/j) | Extract `.hyper` | Cache local, rendu rapide |
| Données temps-réel (<15 min) | Live | Fraîcheur garantie |
| Plusieurs tables > 10 M lignes | Relationship (Tableau 2020.2+) | Évite les fanout JOIN |
| Petits fichiers CSV/Excel | Published Data Source | Gouvernance centralisée |

**Optimisation extract :**
```
# Filtres recommandés sur l'extract
Date >= DATEADD('year', -2, TODAY())    -- limiter la fenêtre temporelle
[Status] IN ('Active', 'Closed')        -- exclure les statuts obsolètes
```

Créer les **hiérarchies** (Année > Trimestre > Mois), **groupes** et **alias** directement dans la source pour les réutiliser dans toutes les feuilles.

### 3. Construire les Calculated Fields

**Agrégations conditionnelles :**
```
// CA sur les nouveaux clients uniquement
IF [Client Type] = 'New' THEN [Revenue] ELSE 0 END
// → toujours agréger ensuite : SUM(calcul_ci-dessus)
```

**Calculs de table (Table Calculations) :**
```
// Croissance mois sur mois
(SUM([Revenue]) - LOOKUP(SUM([Revenue]), -1)) / ABS(LOOKUP(SUM([Revenue]), -1))
// Vérifier l'Addressing/Partitioning : Edit Table Calculation > Specific Dimensions
```

**Calculs temporels courants :**
```
DATEDIFF('day', [Order Date], TODAY())          // ancienneté en jours
DATETRUNC('month', [Order Date])                // tronquer au 1er du mois
DATENAME('weekday', [Order Date])               // nom du jour
```

**Organisation :** regrouper les champs calculés dans des dossiers (`Clic droit > Folders`) — KPIs, Ratios, Dates, Flags.

### 4. Maîtriser les LOD Expressions

**Choisir la bonne syntaxe :**

| LOD | Quand l'utiliser | Exemple |
|---|---|---|
| `FIXED` | Calcul indépendant des filtres de vue | CA par région quelle que soit la sélection |
| `INCLUDE` | Ajouter une dimension absente de la vue | Moyenne par client dans une vue par région |
| `EXCLUDE` | Supprimer une dimension présente | Total hors dimension sélectionnée |

**Exemples copiables :**
```
// Premier achat par client (FIXED)
{ FIXED [Customer ID] : MIN([Order Date]) }

// Ratio client par région (INCLUDE)
{ INCLUDE [Customer ID] : COUNTD([Order ID]) }
// → mettre en AVG() dans la vue pour obtenir le nb moyen de commandes/client

// Total global sans la dimension Mois (EXCLUDE)
{ EXCLUDE [Order Month] : SUM([Revenue]) }
// → utiliser pour calculer un % du total : SUM([Revenue]) / [Total sans mois]
```

**Piège fréquent :** les FIXED ignorent les filtres dimensionnels mais **pas les filtres de contexte** (`Add to Context`). Si le résultat semble faux, vérifier l'ordre d'évaluation : Extract → Data Source → Context → FIXED → LOD INCLUDE/EXCLUDE → Table Calc.

### 5. Construire les visualisations

**Choix du type de graphique :**

| Objectif | Type recommandé | À éviter |
|---|---|---|
| Comparaison catégories | Bar chart horizontal | Pie chart >5 catégories |
| Évolution temporelle | Line chart | Bar chart avec >12 périodes |
| Distribution | Histogram / Box plot | — |
| Corrélation | Scatter plot | — |
| Géographie | Filled map / Symbol map | — |
| Part du tout | Treemap / Stacked bar | Donut chart |

**Bonnes pratiques visuelles :**
- Palette : max 4 couleurs sémantiques ; utiliser la palette divergente pour les écarts (rouge = négatif, vert = positif).
- Axes : commencer à 0 pour les barres, laisser libre pour les courbes de tendance.
- Tooltips enrichis : ajouter des métriques secondaires et un `ATTR([Context info])` pour le diagnostic rapide.
- Taille de police minimale : 10 pt pour les labels, 12 pt pour les titres.

### 6. Assembler le dashboard

**Layout :**
- Conteneur vertical principal → conteneurs horizontaux par ligne → feuilles.
- Activer **Fixed Size** (ex. 1200×800) pour les dashboards embarqués, **Automatic** pour le web responsive.
- Padding uniforme : 8-12 px entre les objets.

**Actions — types et usages :**

| Type | Déclencheur recommandé | Cas d'usage |
|---|---|---|
| Filter Action | Select (hover = trop sensible) | Cross-filter entre graphiques |
| Highlight Action | Hover | Mettre en valeur une série |
| URL Action | Menu | Lien vers fiche CRM ou ticketing |
| Set Action | Select | Paramétrer dynamiquement un LOD |

**Performance Recorder** (`Help > Settings and Performance > Start Performance Recording`) : identifier les feuilles >2 s. Corriger en priorité : réduire le nombre de marques (<5 000 par feuille), simplifier les calculs imbriqués, passer en extract.

### 7. Publier et gouverner sur Tableau Server / Cloud

```bash
# Publier via tabcmd (CLI)
tabcmd login -s https://tableau.monentreprise.com -u admin -p MotDePasse
tabcmd publish "MonDashboard.twbx" -r "Projet/Sous-projet" --overwrite

# Rafraîchissement manuel d'un extract
tabcmd refreshextracts --workbook "NomClasseur"
```

**Permissions minimales par rôle :**
- Viewer : View + Download Image
- Explorer : View + Download + Filter
- Creator : View + Edit + Connect

**Certifier une Published Data Source :** `Clic droit > Certification > Ajouter une note` — signal de confiance pour les utilisateurs.

**Planifier les extracts :** Tableau Server > Tasks > Schedule → choisir hors heures ouvrées (ex. 02h00) pour éviter la contention.

---

## Garde-fous & anti-patterns

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| JOIN dans la source à la place des Relations (2020.2+) | Fanout → doublons dans les agrégations | Migrer vers le modèle de données avec Relations |
| LOD FIXED sans filtre de contexte | Calcul sur tout l'historique même si l'utilisateur filtre sur une période | Ajouter le filtre date en Context Filter |
| Table Calculation sur une vue avec >50 000 lignes | Timeout ou résultat erroné | Précalculer dans la source ou via un extrait agrégé |
| Dashboard >10 feuilles sur une seule page | Rendu lent, surcharge cognitive | Segmenter en onglets ou dashboards liés par navigation |
| Utiliser `COUNTD()` sur connexion Live SQL | Requête COUNT DISTINCT coûteuse à chaque interaction | Pré-agréger dans la couche SQL ou passer en extract |
| Blending multi-sources comme substitut aux joins | Limitations LOD, pas de Table Calc cross-source | Consolider les données en amont (ETL) |
| Publier un `.twbx` avec données intégrées sensibles | Fuite de données | Utiliser Published Data Source + extract serveur |

---

## Checklist avant publication

- [ ] Toutes les feuilles chargent en <3 s sur un volume de production
- [ ] Pas de `Null` non intentionnel dans les KPIs (ajouter `ZN()` ou `IFNULL()`)
- [ ] Les filtres rapides ont `Apply to worksheets: All using this data source`
- [ ] Les couleurs sont accessibles (test daltonisme : éviter rouge/vert seuls)
- [ ] Le titre du dashboard indique la date de fraîcheur des données
- [ ] Les permissions sont configurées par groupe (pas par utilisateur individuel)
