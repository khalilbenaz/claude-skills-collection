---
name: zapier-workflow-builder
description: Automatisation avec Zapier — Zaps multi-étapes, filtres, paths, webhooks et intégration entre applications. Se déclenche avec "Zapier", "Zap", "automatiser sans code", "connecter des apps", "webhook Zapier". Also triggers on "Zapier zap", "connect two apps", "no-code automation".
---

# Zapier Workflow Builder

## Workflow

### 1. Cadrer le besoin avant d'ouvrir Zapier

- Lister : **trigger app + événement**, **action app(s) + opération**, champs à mapper.
- Vérifier le plan Zapier : Paths et multi-step nécessitent au minimum le plan **Starter** ; Looping et Code by Zapier nécessitent **Professional**.
- Estimer la consommation mensuelle de tâches (= nombre d'exécutions × nombre d'actions par exécution) pour choisir le bon plan.

**Critère de décision : Zap ou autre outil ?**

| Besoin | Recommandation |
|---|---|
| Connecter 2 apps SaaS sans dev | Zapier |
| Logique complexe / boucles imbriquées | Make (Integromat) ou n8n |
| Volume > 50 000 tâches/mois | Make ou pipeline dédié |
| Accès base de données directe | n8n + SQL step |

---

### 2. Configurer le trigger

1. Choisir l'app source et l'événement (ex. `New Lead` dans HubSpot).
2. Connecter le compte OAuth ou API Key — Zapier stocke les credentials chiffrés.
3. Cliquer **Test trigger** : récupérer un enregistrement réel pour avoir des données d'exemple dans toutes les étapes suivantes.
4. Si l'app ne supporte pas le polling : utiliser **Webhooks by Zapier → Catch Hook** et copier l'URL générée dans l'app source.

```
URL webhook Zapier exemple :
https://hooks.zapier.com/hooks/catch/123456/abcxyz/
```

---

### 3. Ajouter les étapes de transformation

**Formatter by Zapier** — transformer sans code :
- `Text → Split Text` : découper un champ `"Nom Prénom"` → `["Nom", "Prénom"]`
- `Numbers → Format Number` : `1234.5` → `"1 234,50 €"`
- `Date/Time → Format Date` : ISO 8601 → `DD/MM/YYYY`

**Filter by Zapier** — stopper l'exécution si la condition n'est pas remplie :
```
Champ : "Statut"   Condition : "exactly matches"   Valeur : "Payé"
```
Placer les filtres **le plus tôt possible** dans le Zap pour éviter de consommer des tâches.

**Delay by Zapier** :
- `Delay For` : attendre N minutes/heures.
- `Delay Until` : attendre une date/heure issue d'un champ de l'enregistrement.

---

### 4. Configurer les actions de destination

1. Choisir l'app cible et l'opération (ex. `Create Row` dans Google Sheets).
2. Mapper les champs en cliquant sur l'icône `+` pour insérer des variables dynamiques des étapes précédentes.
3. Utiliser les **champs imbriqués** si l'action accepte du JSON : cliquer "Use a Custom Value" et entrer la variable directement.
4. Tester l'action individuellement — vérifier dans l'app cible que l'enregistrement est créé/modifié correctement.

---

### 5. Implémenter les Paths (branches conditionnelles)

Les Paths remplacent plusieurs Zaps séparés sur le même trigger.

```
Trigger : Nouveau formulaire soumis
│
├── Path A : budget > 10 000 € → Notifier équipe commerciale Slack + Créer deal HubSpot
├── Path B : budget 1 000–10 000 € → Envoyer email automatique + Créer contact CRM
└── Path C : budget < 1 000 € → Ajouter à liste Mailchimp seulement
```

- Chaque Path a sa propre condition et ses propres actions.
- Les Paths s'exécutent en **parallèle** — un seul Path peut aussi être vide (no-op intentionnel).
- Maximum **5 Paths** par Zap sur plan Professional.

---

### 6. Webhooks — appels API sortants

**Envoyer une requête HTTP POST** :

```json
// Action : Webhooks by Zapier → POST
URL    : https://api.monservice.com/v1/contacts
Method : POST
Headers:
  Authorization : Bearer {{api_key}}
  Content-Type  : application/json
Data (JSON):
{
  "email": "{{1. Email}}",
  "name":  "{{1. Full Name}}",
  "source": "zapier"
}
```

**Parser la réponse** : Zapier expose automatiquement les champs JSON de la réponse dans les étapes suivantes sous `webhooks_by_zapier__catch_hook`.

Pour les API paginées ou les réponses complexes : utiliser **Code by Zapier (Python/JavaScript)**.

---

### 7. Code by Zapier — pour les cas non couverts nativement

```javascript
// Exemple JavaScript — construire un objet JSON dynamique
const items = inputData.line_items.split(',');
const total = items.reduce((acc, item) => {
  const [name, price] = item.split(':');
  return acc + parseFloat(price);
}, 0);

output = [{ total: total.toFixed(2), count: items.length }];
```

```python
# Exemple Python — appel API avec authentification custom
import requests

resp = requests.get(
    'https://api.exemple.com/orders',
    headers={'X-Api-Key': input_data['api_key']},
    params={'status': 'pending'}
)
orders = resp.json()
output = [{'order_count': len(orders['data'])}]
```

---

### 8. Tester et activer

1. Tester chaque étape individuellement avec les données récupérées au step 2.
2. Lancer un **test complet** (bouton "Test Zap") — vérifier l'enregistrement créé dans l'app cible.
3. Tester les cas limites : champ vide, valeur nulle, format de date inattendu.
4. Activer le Zap → surveiller le **Task History** pendant les 24 premières heures.

---

## Surveillance et maintenance

- **Alertes d'erreur** : Zapier > Settings > Notifications → activer les emails sur erreur d'étape.
- **Task History** : inspecter les exécutions en erreur — Zapier affiche l'étape exacte et le message d'erreur.
- **Naming convention** : `[APP_SOURCE] → [APP_CIBLE] — [Description courte]`
  - Exemple : `HubSpot → Slack — Nouveau deal > 10k€`
- **Versioning** : Zapier garde un historique des versions du Zap — possible de revenir à la version précédente.

---

## Garde-fous et anti-patterns

| Anti-pattern | Problème | Remède |
|---|---|---|
| Pas de filtre en début de Zap | Consomme des tâches inutilement | Ajouter un Filter juste après le trigger |
| Zaps en doublon pour chaque condition | Maintenance éclatée | Centraliser avec Paths |
| Mapper un champ texte libre comme ID | Données corrompues si l'utilisateur change le texte | Toujours mapper l'ID unique (uuid, record_id) |
| Aucune gestion des champs vides | Erreurs silencieuses dans l'app cible | Utiliser Formatter → "Default Value" ou un filtre préventif |
| Activer sans test end-to-end | Création de doublons ou données erronées en prod | Test obligatoire avant activation |
| Stocker des secrets dans les champs libres | Credential exposé dans les logs Zapier | Utiliser les connexions OAuth ou les champs "Password" dans Zapier |
| Zap sans nom descriptif ni notes | Ingérable après 3 mois | Nommer + documenter la logique métier dans le champ "Notes" |

---

## Bonnes pratiques 2026

- **Utilisez Zapier Tables** pour stocker un état entre exécutions (ex. dédoublonnage, compteurs) sans passer par un outil externe.
- **Interfaces by Zapier** : créer des formulaires internes déclenchant directement un Zap, sans app tierce.
- **Zapier AI Actions** : exposer des Zaps comme outils appelables par un LLM (GPT, Claude) via l'intégration OpenAI/Zapier — utile pour les agents IA.
- Préférer les **webhooks instantanés** aux triggers par polling quand l'app source le supporte — latence < 1 s vs jusqu'à 15 min sur les plans bas.
- Audit trimestriel : désactiver les Zaps sans exécution depuis 30 jours — libère du quota et réduit la surface d'erreur.
