---
name: n8n-workflow-designer
description: Workflows d'automatisation avec n8n — nodes, triggers, credentials, déploiement self-hosted, intégrations SaaS et bonnes pratiques de fiabilité. Se déclenche avec "n8n", "workflow n8n", "automatisation open-source", "n8n self-hosted". Also triggers on "n8n workflow", "self-hosted automation", "n8n nodes".
---

# n8n Workflow Designer

## Workflow en étapes

### 1. Choisir et déployer le mode d'exécution

**Critères de décision :**

| Contexte | Mode recommandé |
|---|---|
| Prototype / dev local | `npx n8n` ou Docker simple |
| Prod mono-serveur | Docker + PostgreSQL + reverse proxy |
| Prod haute dispo | n8n Queue Mode (Redis + workers) |
| Zéro ops | n8n Cloud |

**Docker Compose minimal pour la prod :**

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    environment:
      - N8N_ENCRYPTION_KEY=<clé-aléatoire-32-chars>
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=<mot-de-passe>
      - WEBHOOK_URL=https://n8n.mondomaine.com/
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=<mot-de-passe>
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168   # 7 jours
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: <mot-de-passe>
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  n8n_data:
  postgres_data:
```

> Ne jamais exposer le port 5678 directement sur Internet — passer par Nginx/Caddy avec TLS.

---

### 2. Concevoir l'architecture du workflow

Avant de cliquer dans l'éditeur, répondre à ces questions :

- **Trigger** : Webhook (push), Cron (pull périodique), ou événement applicatif (ex. n8n trigger interne) ?
- **Volume** : traitement unitaire ou batch ? Si > 100 items → prévoir `Split In Batches`.
- **Idempotence** : que se passe-t-il si le workflow tourne deux fois avec les mêmes données ? Ajouter une vérification de doublon si nécessaire.
- **Branchements** : IF (2 branches), Switch (n branches), Merge (rejoindre des branches parallèles).

**Squelette type :**

```
[Trigger] → [Valider/Filtrer] → [Transformer] → [Action principale]
                                                      ↓ (error path)
                                              [Notifier erreur]
```

---

### 3. Configurer les credentials

Toujours passer par **Settings → Credentials → New** — jamais en dur dans un nœud Code.

```
# Tester une API Key manuellement avant de la sauvegarder :
curl -H "Authorization: Bearer <TOKEN>" https://api.exemple.com/me
```

Pour OAuth2 : renseigner `N8N_EDITOR_BASE_URL` correctement, sinon le callback échoue.

---

### 4. Assembler les nœuds

**Nœuds clés et leurs usages :**

| Nœud | Usage typique |
|---|---|
| `HTTP Request` | Appel REST/GraphQL externe |
| `Code` (JS ou Python) | Transformation complexe, logique métier |
| `Set` | Renommer, ajouter, supprimer des champs |
| `IF` / `Switch` | Routage conditionnel |
| `Split In Batches` | Traitement paginé / rate-limit safe |
| `Merge` | Réunir deux branches (Inner Join, Left Join, etc.) |
| `Execute Workflow` | Appeler un sous-workflow réutilisable |
| `Wait` | Pause temporelle ou attente de webhook de confirmation |

**Expressions courantes :**

```js
// Accéder au champ d'un item courant
{{ $json.email }}

// Accéder à la sortie d'un nœud précis
{{ $node["HTTP Request"].json.data.id }}

// Timestamp ISO courant
{{ new Date().toISOString() }}

// Environnement / variable globale
{{ $env.MY_SECRET_VAR }}
```

---

### 5. Transformer les données avec le nœud Code

```js
// Exemple : enrichir chaque item avec un champ calculé
for (const item of $input.all()) {
  item.json.fullName = `${item.json.firstName} ${item.json.lastName}`;
  item.json.processedAt = new Date().toISOString();
}
return $input.all();
```

```python
# Python (n8n >= 1.0) — même logique
items = _input.all()
for item in items:
    item.json['fullName'] = f"{item.json['firstName']} {item.json['lastName']}"
return items
```

> Limiter le nœud Code aux transformations sans effets de bord. Les appels HTTP → nœud `HTTP Request`.

---

### 6. Gérer les erreurs et la fiabilité

**Pattern recommandé :**

1. Activer le **Error Trigger** (workflow dédié aux erreurs) → envoie un message Slack/email avec `{{ $json.execution.url }}`.
2. Sur les nœuds critiques (HTTP Request, DB) : activer **Retry On Fail** (3 tentatives, délai exponentiel).
3. Utiliser **Stop and Error** pour valider les préconditions :

```js
// Dans un nœud IF ou Code — arrêt explicite si données manquantes
if (!$json.orderId) {
  throw new Error('orderId manquant — exécution annulée');
}
```

4. Activer `continueOnFail` uniquement quand on veut traiter les erreurs item par item (boucle avec gestion locale).

---

### 7. Tester et itérer

- Utiliser **Pin Data** sur un nœud pour fixer des données de test sans ré-exécuter le trigger.
- Inspecter chaque nœud dans le panneau Output — vérifier la structure JSON exacte avant de câbler le nœud suivant.
- Tester les cas limites : liste vide, champ null, rate limit déclenché.
- Valider le comportement du Error Trigger en forçant une erreur volontaire (`throw new Error('test')`).

---

### 8. Versionner et déployer

**Export/import CLI :**

```bash
# Exporter tous les workflows en JSON
n8n export:workflow --all --output=./workflows/

# Importer depuis un fichier
n8n import:workflow --input=./workflows/mon-workflow.json
```

**Intégration Git (recommandé) :**
- Activer **Source Control** (Settings → Source Control) pour push/pull natif vers Git.
- Committer chaque modification significative avec un message descriptif.
- Séparer les branches `dev` / `prod` et valider en staging avant merge.

**Mise à jour n8n :**

```bash
docker compose pull n8n && docker compose up -d n8n
# Vérifier les breaking changes dans https://docs.n8n.io/release-notes/
```

---

## Garde-fous / Anti-patterns

| Anti-pattern | Risque | Alternative |
|---|---|---|
| Credentials codés en dur dans Code | Fuite de secrets dans les logs et exports JSON | Gestionnaire de credentials n8n |
| Workflow monolithique > 50 nœuds | Impossible à debugger, pas réutilisable | Découper en sous-workflows (`Execute Workflow`) |
| Pas de gestion d'erreur | Échecs silencieux, données perdues | Error Trigger global + retry |
| SQLite en production | Corruption sous charge concurrente | PostgreSQL |
| Traiter 10 000 items sans batch | Timeout, consommation mémoire | `Split In Batches` (taille 50-200) |
| WEBHOOK_URL mal configuré | OAuth callbacks cassés, webhooks non reçus | Vérifier `WEBHOOK_URL` = URL publique exacte |
| Pas de pruning des exécutions | Disque plein en quelques semaines | `EXECUTIONS_DATA_PRUNE=true` + `MAX_AGE` |
| Mise à jour sans lire les release notes | Breaking changes sur les expressions | Toujours lire les notes avant `docker pull` |

---

## Bonnes pratiques 2026

- **Queue Mode** pour la scalabilité : ajouter des workers n8n indépendants derrière Redis — les webhooks et les exécutions sont découplés.
- **Variables d'environnement** pour les valeurs qui changent entre envs (URLs, timeouts) — éviter les valeurs en dur dans les nœuds Set.
- **Sous-workflows réutilisables** : extraire la logique commune (authentification, formatage de date, notification d'erreur) en workflows partagés appelés par `Execute Workflow`.
- **Monitoring** : brancher les logs n8n sur un agrégateur (Loki, Datadog) et alerter sur les exécutions en statut `error` ou `crashed`.
- **Limiter les permissions des credentials** : utiliser des tokens API avec scope minimal (lecture seule si possible).
