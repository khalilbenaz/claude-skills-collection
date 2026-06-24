---
name: power-bi-designer
description: Conception de dashboards Power BI — DAX, modèle de données, visualisations avancées et Row-Level Security. Se déclenche avec "Power BI", "DAX", "dashboard Power BI", "rapport Power BI", "modèle de données Power BI".
---

# Power BI Designer

## Workflow

### 1. Analyser les besoins métier
- Identifier les KPIs (ex. : CA, taux de conversion, délai moyen), le public cible (direction = agrégats, opérationnel = détail transactionnel) et la fréquence de refresh requise.
- Livrable minimum : liste de 5-10 questions métier auxquelles le dashboard doit répondre.

### 2. Concevoir le modèle de données (star schema)
- **Tables de faits** : mesures numériques + clés étrangères uniquement. Jamais de colonnes de description.
- **Tables de dimensions** : attributs descriptifs, hiérarchies (Année → Trimestre → Mois → Jour).
- Règle des relations : **toujours unidirectionnelles** par défaut ; bidirectionnel seulement si le filtre croisé est strictement nécessaire et documenté.
- Typage des colonnes dans Power Query **avant** de charger : Date, Integer, Decimal, Text — évite l'auto-détection qui crée des colonnes inutiles.

```m
// Power Query — typage explicite en fin de requête
#"Types appliqués" = Table.TransformColumnTypes(Source, {
    {"DateVente", type date},
    {"Montant", type number},
    {"IdClient", Int64.Type}
})
```

### 3. Connecter et transformer les sources (Power Query / M)
- Utiliser le **Query Folding** : filtrer et agréger côté source (SQL, SSAS) avant de ramener les données dans Power BI.
- Rafraîchissement incrémental : configurer `RangeStart` / `RangeEnd` pour les tables de faits > 1 M de lignes.

```m
// Paramètres requis pour le rafraîchissement incrémental
// Créer deux paramètres de type Date/Time : RangeStart et RangeEnd
#"Filtre incrémental" = Table.SelectRows(Source, each
    [DateVente] >= RangeStart and [DateVente] < RangeEnd
)
```

- Désactiver le chargement des requêtes intermédiaires (staging) pour ne charger que les tables finales.

### 4. Écrire les mesures DAX
**Règle fondamentale** : mesures pour les calculs dynamiques, colonnes calculées uniquement pour les attributs statiques.

```dax
-- Mesure de base
CA Total = SUM(Ventes[Montant])

-- DIVIDE pour éviter les divisions par zéro
Taux Conversion =
DIVIDE(
    COUNTROWS(FILTER(Leads, Leads[Statut] = "Converti")),
    COUNTROWS(Leads),
    0
)

-- YTD (Year-to-Date)
CA YTD =
CALCULATE(
    [CA Total],
    DATESYTD(Calendrier[Date])
)

-- Comparaison année précédente
CA N-1 =
CALCULATE(
    [CA Total],
    SAMEPERIODLASTYEAR(Calendrier[Date])
)

-- Variation %
Var% CA =
DIVIDE([CA Total] - [CA N-1], [CA N-1], BLANK())

-- Mesure avec contexte filtré
CA Région Active =
CALCULATE(
    [CA Total],
    KEEPFILTERS(Régions[Actif] = TRUE())
)
```

**Critères de choix mesure vs colonne calculée :**

| Besoin | Mesure DAX | Colonne calculée |
|---|---|---|
| Agrégation dynamique | Oui | Non |
| Filtre par slicer | Oui | Non |
| Attribut de dimension fixe | Non | Oui |
| Tri personnalisé | Non | Oui |

### 5. Construire les visualisations
- **Bar/Column chart** : comparaisons catégorielles (max 10-12 barres).
- **Line chart** : tendances temporelles, ne pas mixer > 3 séries.
- **Card / KPI visual** : indicateurs en haut de page, valeur + variation.
- **Matrix** : tableaux croisés avec drill-down, activer "Stepped layout" pour les hiérarchies.
- **Slicers** : filtres Date en mode "Between", listes en mode "Dropdown" si > 5 valeurs.
- **Bookmarks** : navigation entre vues (vue Résumé / vue Détail) sans pages supplémentaires.

Ordre d'une page bien conçue : KPIs haut → graphiques principaux centre → filtres/drill gauche ou haut.

### 6. Configurer la Row-Level Security (RLS)

```dax
-- Rôle "Vendeur" : ne voit que ses propres ventes
[Email Vendeur] = USERPRINCIPALNAME()

-- Rôle "Région" : filtre par région assignée
[Code Région] IN
    VALUES(
        FILTER(RegionUtilisateurs,
            RegionUtilisateurs[Email] = USERPRINCIPALNAME()
        )[Code Région]
    )
```

- Tester avec **Modeling → View as → [nom du rôle]** avant de publier.
- En mode **Dynamic RLS** : une table de mapping Email↔Périmètre est plus maintenable que des rôles statiques par région.
- RLS s'applique uniquement aux rapports Power BI Service, pas aux exports Excel ou aux connexions directes SSAS avec identité propre.

### 7. Optimiser les performances
- **DAX Studio** : analyser les mesures lentes avec Server Timings + Query Plan.
- **Performance Analyzer** (dans Power BI Desktop) : identifier les visuels lents (> 500 ms = à optimiser).
- Réduire la cardinalité : encoder les colonnes de statuts comme entiers (0/1/2) pas comme texte.
- Supprimer les colonnes non utilisées dans les rapports (réduire la taille du fichier .pbix).
- Préférer `SUMX` sur des tables petites ; éviter `FILTER(ALL(Table), ...)` sur de grandes tables.

```dax
-- Mauvais : FILTER sur toute la table de faits
Mauvaise Mesure =
CALCULATE([CA Total], FILTER(ALL(Ventes), Ventes[Montant] > 1000))

-- Bon : utiliser KEEPFILTERS ou une dimension
Bonne Mesure =
CALCULATE([CA Total], Ventes[Montant] > 1000)
```

### 8. Publier et distribuer
- **Pipelines de déploiement** : workspace Dev → Test → Prod avec règles de paramétrage par étape.
- Refresh planifié : maximum 8x/jour en Pro, 48x/jour en Premium. Toujours configurer une alerte d'échec de refresh.
- **Abonnements email** : rapport en PDF/PNG envoyé automatiquement, utile pour les destinataires sans licence Power BI.
- Intégration Teams : épingler les rapports dans des onglets Teams pour la distribution sans sortir de l'outil.

---

## Anti-patterns et pièges

| Piège | Impact | Solution |
|---|---|---|
| Relations bidirectionnelles excessives | Ambiguïté des filtres, résultats incorrects | Unidirectionnel par défaut, bidirectionnel documenté |
| Colonnes calculées pour les agrégations | Modèle lourd, recalcul à chaque refresh | Mesures DAX |
| CALCULATE sans REMOVEFILTERS | Contexte non contrôlé, valeurs surprenantes | Ajouter ALL() ou ALLEXCEPT() explicitement |
| Pas de table Calendrier dédiée | Time intelligence impossible | Toujours créer une `DimCalendrier` marquée comme "Date Table" |
| Ignorer Query Folding | Toutes les transformations en mémoire locale | Vérifier l'icône "Native Query" dans Power Query |
| RLS testée seulement en local | Erreurs de périmètre en production | Tester avec "View as role" + vérification USERPRINCIPALNAME() en service |
| Trop de visuels par page | Temps de rendu > 3s | Max 8-10 visuels par page |

## Bonnes pratiques 2026

- **Fabric / Direct Lake** : pour les entrepôts sur Microsoft Fabric, utiliser le mode Direct Lake (remplace Import + DirectQuery) — lecture directe depuis OneLake sans import ni requêtes SQL en temps réel.
- **Copilot Power BI** : générer des mesures DAX avec le Copilot intégré, mais toujours relire et valider la logique métier — le Copilot hallucine sur les contextes de filtre complexes.
- **Semantic Model centralisé** : un seul modèle sémantique partagé (anciennement "dataset") référencé par plusieurs rapports — évite la duplication de la logique DAX.
- **Versioning .pbix** : Power BI Desktop 2025+ supporte le format `.pbip` (dossiers) compatible Git — utiliser ce format pour les projets en équipe.
- **Accessibilité** : activer Alt text sur tous les visuels, tester avec le lecteur d'écran intégré (Tab order dans View → Accessibility).
