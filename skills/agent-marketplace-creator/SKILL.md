---
name: agent-marketplace-creator
description: Création de marketplaces et registres d'agents IA réutilisables et partageables. Se déclenche avec "marketplace agent", "agent store", "agent registry", "partager agent", "distribuer agent", "agent template", "agent catalog", "agent as a service", "skill marketplace". Also triggers on "agent marketplace", "share agents".
---

# Agent Marketplace Creator

## Quand utiliser ce skill

Utilise ce skill pour concevoir une plateforme de distribution d'agents IA : registre interne d'entreprise, marketplace public, bibliothèque de templates réutilisables ou place de marché avec monétisation. Il couvre l'architecture, le packaging, la gouvernance et la distribution.

---

## Étape 1 — Choisir l'architecture cible

**Critère de décision :**

| Besoin | Architecture |
|---|---|
| Contrôle total, déploiement simplifié | Centralisée (registry + runtime hébergés) |
| Agents hébergés chez leurs créateurs | Fédérée (marketplace = couche discovery) |
| Usage interne entreprise uniquement | Registry privé (Artifact Hub, Harbor, custom) |
| Monétisation publique | SaaS centralisé avec billing intégré |

**Composants obligatoires :**
- **Registry** : base de données des agents + métadonnées indexées
- **Versioning** : semantic versioning strict, compatibilité ascendante
- **Discovery** : search full-text + filtres + recommandations
- **Runtime** : sandbox isolée par agent, ressources déclarées
- **IAM** : auth créateur (publication) séparée de auth utilisateur (consommation)

---

## Étape 2 — Format de packaging standardisé

Structure minimale d'un agent publiable :

```
my-agent/
├── agent.yaml          # manifeste principal
├── system_prompt.md    # instructions de l'agent
├── tools.json          # outils requis et configs
├── config.schema.json  # paramètres configurables (JSON Schema)
├── README.md           # documentation utilisateur
└── tests/
    ├── fixtures/       # inputs de test
    └── expected/       # outputs attendus
```

**`agent.yaml` minimal :**

```yaml
name: my-data-analyst
version: 1.2.0
description: Analyse des fichiers CSV et génère des rapports visuels.
author: k.benazzouz@b3gtech.com
license: MIT
category: data
tags: [csv, analysis, reporting]
runtime:
  model: claude-sonnet-4-6
  max_tokens: 4096
permissions:
  network: false
  filesystem: read-only
  tools: [code_execution, file_read]
dependencies:
  agents: []
  mcp_servers: []
```

**`config.schema.json` exemple :**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "properties": {
    "language": {
      "type": "string",
      "enum": ["fr", "en", "ar"],
      "default": "fr",
      "description": "Langue des rapports générés"
    },
    "chart_style": {
      "type": "string",
      "enum": ["minimal", "detailed"],
      "default": "minimal"
    }
  }
}
```

**Publier un SDK CLI :**

```bash
# Initialiser un nouveau package agent
agent-sdk init my-agent --template data-analyst

# Valider le package avant publication
agent-sdk validate ./my-agent

# Publier sur le registry
agent-sdk publish ./my-agent --registry https://registry.monentreprise.com
```

---

## Étape 3 — Discovery et indexation

Utiliser **Typesense** (léger) ou **Elasticsearch** (scalable) pour l'index.

**Champs à indexer :** `name`, `description`, `tags[]`, `category`, `author`, `downloads_count`, `rating_avg`, `updated_at`.

**Filtres clés à exposer :**
- Catégorie (data, code, communication, productivité, sécurité)
- Modèle requis (claude, gpt-4, gemini…)
- Permissions réseau (réseau autorisé / sandbox strict)
- Licence (open-source / commercial)
- Tier (gratuit / pro)

**API search minimale :**

```http
GET /api/v1/agents?q=csv+analysis&category=data&license=open&sort=downloads
```

---

## Étape 4 — Versionnage et cycle de vie

Appliquer **SemVer strict** (MAJOR.MINOR.PATCH) :

| Changement | Version |
|---|---|
| Breaking change prompt/API | MAJOR |
| Nouvelle fonctionnalité rétrocompat | MINOR |
| Bugfix, correction de prompt | PATCH |

**Politique de dépréciation :**
- Annonce 90 jours avant la fin de support d'une version MAJOR
- Tag `deprecated` dans le registry, bannière dans la UI
- Support de la version précédente pendant 6 mois minimum
- Guide de migration fourni obligatoirement pour tout changement MAJOR

**CI du registry — vérifications automatiques à chaque push :**

```yaml
# .github/workflows/agent-ci.yml
steps:
  - name: Validate schema
    run: agent-sdk validate .
  - name: Run tests
    run: agent-sdk test . --fixture tests/fixtures/
  - name: Security scan
    run: agent-sdk scan . --check prompt-injection,data-leak
  - name: Compat check
    run: agent-sdk compat-check . --against-previous
```

---

## Étape 5 — Authentification et accès

**Séparation des rôles :**

| Rôle | Auth | Permissions |
|---|---|---|
| Créateur | API key longue durée + 2FA | Publish, update, delete ses propres agents |
| Utilisateur | OAuth2 / API key | Install, invoke, rate |
| Admin | RBAC interne | Approve, ban, override |

**Rate limiting par tier (exemple Nginx/Kong) :**

```yaml
# Kong rate-limit plugin
config:
  minute: 60      # free tier
  hour: 1000
  policy: local
```

---

## Étape 6 — Déploiement des agents — 4 modes

| Mode | Description | Idéal pour |
|---|---|---|
| **Managed** | Marketplace héberge et exécute | Zero-ops, usage ponctuel |
| **Self-hosted** | Package exporté, runtime interne | Données sensibles, air-gapped |
| **API endpoint** | Agent exposé en REST/streaming | Intégration applicative |
| **Embedded SDK** | Bibliothèque à intégrer | Produit SaaS tiers |

**Endpoint API standard :**

```http
POST /api/v1/agents/{agent_id}/invoke
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "input": "Analyse ce fichier CSV...",
  "config": { "language": "fr" },
  "stream": true
}
```

---

## Étape 7 — Facturation et monétisation

**Modèles disponibles :**
- **Pay-per-use** : facturation au token ou à l'invocation
- **Subscription** : accès illimité mensuel/annuel
- **Freemium** : quota gratuit (ex : 100 invocations/mois) + payant
- **Revenue sharing** : créateurs touchent 70 % des revenus générés

**Intégration Stripe :**

```python
# Webhook Stripe pour crediter le créateur
@app.post("/webhooks/stripe")
async def stripe_webhook(event: StripeEvent):
    if event.type == "invoice.payment_succeeded":
        agent_id = event.metadata["agent_id"]
        creator_id = get_agent_creator(agent_id)
        amount = event.amount_paid * 0.70  # 70% pour le créateur
        credit_creator_wallet(creator_id, amount)
```

Afficher **coût estimé par invocation** sur la fiche agent (inclure coût LLM sous-jacent + frais marketplace).

---

## Étape 8 — Assurance qualité et validation

**Pipeline de review à deux niveaux :**

1. **Automatique (bloquant) :**
   - Validation du schema `agent.yaml` + `config.schema.json`
   - Tests fournis passants à 100 %
   - Scan injection de prompt (`agent-sdk scan`)
   - Taille du system prompt < 50 000 tokens
   - Permissions déclarées cohérentes avec les outils utilisés

2. **Manuelle (pour agents sensibles) :**
   - Accès à des données utilisateurs
   - Permissions réseau + filesystem write
   - Niveau de permission `enterprise`

**Score de qualité public (0–100) :**

```
score = (test_coverage * 0.3) + (rating_avg/5 * 0.3) + (doc_completeness * 0.2) + (uptime * 0.2)
```

---

## Anti-patterns et pièges

- **Ne jamais publier un agent sans sandbox** : exécuter des agents en environnement non isolé expose l'infrastructure hôte à des injections de prompt qui déclenchent des commandes système.
- **Éviter les configurations "tout-en-un"** : un agent qui fait trop de choses est impossible à tester, versionner et monitorer correctement. Préférer la composition d'agents spécialisés.
- **Ne pas négliger la migration** : un MAJOR sans guide de migration force les utilisateurs à rester bloqués sur l'ancienne version — cela fragmente l'écosystème.
- **Éviter les secrets dans `agent.yaml`** : toujours passer les credentials via un vault (AWS Secrets Manager, HashiCorp Vault, Doppler) référencé par nom, jamais en clair dans le manifeste.
- **Ne pas mélanger auth créateur et auth utilisateur** : deux surfaces d'attaque distinctes, deux rotations de clés distinctes, deux audit logs distincts.
- **Pas de rate limiting absent** : sans limite, un seul agent malveillant ou bogué peut consommer tout le budget LLM du marketplace en quelques minutes.

---

## Bonnes pratiques 2026

- **Observabilité créateur** : exposer via dashboard les métriques par agent — invocations, taux d'erreur, latence p50/p99, satisfaction (thumbs up/down). Sans données, pas d'amélioration.
- **Licence explicite obligatoire** : MIT, Apache 2.0, BSL, commercial ou propriétaire — refuser toute publication sans déclaration de licence.
- **Interopérabilité MCP** : exposer les agents comme serveurs MCP pour permettre leur consommation directe depuis Claude Code et d'autres clients compatibles.
- **Tests de non-régression comportementale** : les benchmarks de réponse sur un dataset golden set doivent être exécutés à chaque nouvelle version pour détecter les dérives de comportement liées aux mises à jour de modèle.
- **Changelog public automatique** : générer le changelog depuis les commits Git (Conventional Commits) et le publier automatiquement sur la fiche marketplace à chaque release.


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
