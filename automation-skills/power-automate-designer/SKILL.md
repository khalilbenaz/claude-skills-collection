---
name: power-automate-designer
description: Création de workflows avec Power Automate — flows, triggers, connectors, expressions et intégration Office 365. Se déclenche avec "Power Automate", "Microsoft Flow", "automatisation Office 365", "flow Power Automate".
---

# Power Automate Designer

## Workflow

### 1. Analyser le besoin d'automatisation

Cartographier le processus AVANT d'ouvrir Power Automate :

- **Déclencheur** : qu'est-ce qui lance le flow ? (email reçu, fichier déposé, formulaire soumis, heure planifiée, appel HTTP)
- **Données d'entrée** : quelles informations sont disponibles au déclenchement ?
- **Étapes** : quelles actions manuelles remplace-t-on ?
- **Sorties** : notifications, fichiers créés, enregistrements mis à jour, appels API

Critère go/no-go : si le processus contient des décisions subjectives ou nécessite une interface graphique legacy non automatisable par API, préférer un Business Process Flow ou un Desktop Flow.

### 2. Choisir le type de flow

| Type | Cas d'usage | Limite clé |
|---|---|---|
| **Cloud Flow automatisé** | Trigger event-driven (email, SharePoint, Teams) | Dépend de la disponibilité du connecteur |
| **Cloud Flow instantané** | Déclenché manuellement ou via bouton Teams/mobile | Nécessite une interaction humaine |
| **Cloud Flow planifié** | Batch quotidien/hebdomadaire, rapports récurrents | Pas de réactivité aux événements |
| **Desktop Flow (RPA)** | Applications sans API (ERP legacy, interfaces Windows) | Machine cible doit être active + Power Automate Desktop installé |
| **Business Process Flow** | Guidage étape par étape (onboarding, validation multi-niveaux) | Uniquement avec Dataverse |

### 3. Configurer les connecteurs

**Connecteurs standard courants** : SharePoint, Outlook, Teams, Excel Online, Forms, Planner, OneDrive, Dataverse.

**Connecteur personnalisé** (API interne ou tierce non couverte) :

```yaml
# Exemple de définition OpenAPI minimale pour connecteur custom
openapi: "2.0"
info:
  title: Mon API Interne
  version: "1.0"
host: api.monentreprise.com
basePath: /v1
schemes: [https]
paths:
  /orders/{id}:
    get:
      operationId: GetOrder
      parameters:
        - name: id
          in: path
          required: true
          type: string
      responses:
        200:
          description: OK
```

Importer via **Data > Custom connectors > New custom connector > Import an OpenAPI file**.

**Authentification** : préférer OAuth 2.0 ou API Key stockée dans un connecteur custom plutôt qu'un mot de passe hardcodé dans une action HTTP.

### 4. Construire la logique du flow

**Structures de contrôle essentielles** :

```
Condition          → branchement binaire (if/else)
Switch             → branchement sur valeur (évite les Condition imbriqués)
Apply to each      → itération sur tableau
Do until           → boucle conditionnelle (max 60 itérations par défaut)
Parallel branch    → actions concurrentes (gain de temps si indépendantes)
Scope              → regroupement logique + Try/Catch
```

**Déclarer les variables en tête de flow** (toutes en bloc, avant toute logique) :

```
Initialize variable — Name: varErrorMessage  Type: String   Value: ""
Initialize variable — Name: varCounter       Type: Integer  Value: 0
Initialize variable — Name: varItems         Type: Array    Value: []
```

**Conseil** : utiliser `Compose` pour stocker des expressions complexes et les réutiliser par `outputs('Compose_NomEtape')` — évite la duplication.

### 5. Maîtriser les expressions

Fonctions indispensables (syntaxe copiable) :

```
# Date/heure
formatDateTime(utcNow(), 'yyyy-MM-dd')
addDays(utcNow(), -7)
convertTimeZone(utcNow(), 'UTC', 'Romance Standard Time')

# Chaînes
concat(triggerBody()?['subject'], ' — traité')
replace(body('Get_item')?['Title'], ' ', '_')
toLower(trim(variables('varInput')))
split(body('Action')?['emails'], ';')

# Collections
first(body('Get_items')?['value'])
length(body('Get_items')?['value'])
join(variables('varItems'), ', ')
contains(body('Action')?['tags'], 'urgent')

# Conditions inline
if(equals(body('Action')?['status'], 'active'), 'Actif', 'Inactif')
coalesce(triggerBody()?['optionalField'], 'valeur_defaut')

# HTTP / JSON
json(body('HTTP_Call'))
string(variables('varCounter'))
base64(concat(variables('user'), ':', variables('password')))
```

**Accès aux propriétés dynamiques** : utiliser `?['champ']` (null-safe) plutôt que `['champ']` pour éviter les erreurs si le champ est absent.

### 6. Gérer les erreurs (pattern Try/Catch)

Structure recommandée :

```
[Scope] TRY
  ├── Action 1
  ├── Action 2
  └── Action N

[Scope] CATCH
  Configure run after: TRY → has failed / has timed out / has been skipped
  ├── Compose — ErrorDetails:
  │     concat('Erreur: ', result('Scope_TRY')?[0]?['error']?['message'])
  ├── Send email — notif à l'équipe
  └── Terminate — Status: Failed, Message: outputs('Compose_ErrorDetails')
```

**Politique de retry** sur chaque action HTTP/connecteur :
- **Default** : 4 retries, intervalles exponentiels — suffisant dans 90 % des cas
- **Fixed** : utile pour les APIs avec rate-limiting strict (ex: toutes les 60 s)
- **None** : actions idempotentes où un double-appel serait problématique

### 7. Tester et déboguer

1. **Test manuel** : déclencher depuis le portail, vérifier chaque entrée/sortie dans l'historique d'exécution (icône "..." > Run history).
2. **Testeur d'expressions** : dans le champ d'expression, cliquer sur "Peek code" pour valider sans exécuter le flow.
3. **Compose de debug** : ajouter temporairement un `Compose` avec `outputs()` pour inspecter un objet complet.
4. **Données de test réalistes** : inclure champs vides, caractères spéciaux (`&`, `<`, `"`), tableaux vides, valeurs null.
5. **Vérifier les limites** : 30 jours de rétention historique (plan standard), 5 minutes max par action (timeout).

### 8. Déployer entre environnements

Toujours passer par les **Solutions** (pas les flows standalone) :

```
Power Platform Admin Center
  └── Solutions > New solution
        ├── Add existing > Cloud flows
        ├── Add existing > Custom connectors
        └── Add existing > Connection references  ← clé pour les connexions env-spécifiques
```

Export/import entre environnements :

```bash
# Via Power Platform CLI (pac)
pac solution export --path ./solution.zip --name MonSolution --managed false
pac solution import --path ./solution.zip --environment prod-env-id
```

Les **Connection References** permettent de pointer vers des connexions différentes par environnement sans modifier le flow.

---

## Anti-patterns / Pièges

| Piège | Impact | Correction |
|---|---|---|
| `Apply to each` imbriqués sur grands volumes | Timeout 30 min, throttling | Requêtes OData filtrées côté source ; traitement par batch |
| Modifier un flow directement en production | Pas de rollback possible | Solutions + pipeline ALM (GitHub Actions / Azure DevOps) |
| Stocker des credentials dans `Compose` ou des commentaires | Fuite de secrets dans l'historique | Connecteur custom avec API Key, Azure Key Vault via HTTP |
| Ignorer `Configure run after` | Échecs silencieux, données corrompues | Toujours configurer le CATCH sur chaque scope critique |
| Utiliser `Get items` sans filtre OData | Quota de 5 000 lignes SharePoint épuisé | Filtre `$filter=Status eq 'Pending'` + `$top=100` avec pagination |
| Trigger "When an item is created or modified" en boucle | Infinite loop si le flow modifie le même item | Ajouter une colonne `FlowProcessed` ou vérifier le `Modified by` |

## Bonnes pratiques 2026

- **Nommer toutes les actions** (jamais laisser "Send an email (V2)") — l'historique et les expressions `outputs('NomAction')` en dépendent.
- **Utiliser les environnements Managed** (Power Platform Managed Environments) pour activer le DLP et les politiques de gouvernance.
- **Documenter dans les descriptions** de chaque action — le champ "Note" est consultable sans ouvrir le flow.
- **Éviter les connecteurs Premium inutiles** : un connecteur HTTP standard peut remplacer un connecteur Premium si l'API est accessible publiquement.
- **Activer le journal d'audit** (Microsoft Purview) pour les flows manipulant des données sensibles.
- **Versionner les solutions** avec semantic versioning (1.0.0 → 1.1.0) avant chaque déploiement en production.
