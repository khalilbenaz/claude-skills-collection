# 🧠 Claude Skills Collection

La plus grande collection open-source de skills pour Claude — **348 skills** couvrant **34 domaines** du développement, de la sécurité, des agents IA, du DevOps, de la data, et de la vie quotidienne.

> Un skill transforme Claude en assistant spécialisé avec un workflow structuré étape par étape.

[![Skills](https://img.shields.io/badge/skills-348-blue)]()[![Categories](https://img.shields.io/badge/catégories-34-green)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()[![Bundles](https://img.shields.io/badge/bundles-7-purple)]()
[![Language](https://img.shields.io/badge/langue-Français%20%2B%20déclencheurs%20EN-red)]()

🇬🇧 [English README](./README.en.md) — installation, bundles and context cost.

---

## 📥 Installation

### 1. Toute la collection, en plugin Claude Code

```bash
/plugin marketplace add https://github.com/khalilbenaz/claude-skills-collection
/plugin install claude-skills-collection
```

Les 348 skills deviennent des slash commands (`/dev-docker-composer`, `/agent-spawner`, `/cloud-aws-architect`, `/security-threat-modeling`…).

> ⚠️ Le nom **et la description** de chaque skill installé sont chargés dans le contexte de **chaque** session, que le skill serve ou non. La collection complète coûte ainsi ~56 000 tokens permanents. Si vous n'avez besoin que d'un domaine, installez un bundle (ci-dessous) : c'est le même dépôt, la même marketplace, un dixième du coût.

### 2. Un bundle thématique — recommandé

Sept plugins découpent la collection par domaine. Chacun s'installe seul et ne charge que ses propres skills.

```bash
/plugin marketplace add https://github.com/khalilbenaz/claude-skills-collection
/plugin install claude-skills-security     # 10 skills, ~1 800 tokens de contexte
```

<!-- BEGIN:BUNDLES (généré par npm run build:marketplace — ne pas éditer) -->

| Plugin | Domaine | Skills | Contexte permanent | Contenu |
|--------|---------|-------:|-------------------:|---------|
| `claude-skills-dev` | Développement & tests | 120 | ~18 594 tok | Skills de développement : langages et frameworks, architecture, API, tests, performance, debug, documentation. |
| `claude-skills-agents` | Agents IA, LLM & prompting | 68 | ~11 598 tok | Conception d’agents et de systèmes multi-agents, serveurs MCP, orchestration LLM, RAG, fine-tuning, ingénierie de prompts. |
| `claude-skills-cloud-ops` | Cloud, DevOps & réseaux | 40 | ~5 853 tok | AWS/Azure/GCP, Kubernetes, Terraform, CI/CD, administration Linux, réseaux, API gateways, automatisation et IoT. |
| `claude-skills-data` | Data & bases de données | 19 | ~2 717 tok | Modélisation et optimisation de bases (Postgres, SQL Server, MongoDB, Redis…), pipelines ETL, dbt, Kafka, BI et qualité de données. |
| `claude-skills-security` | Sécurité | 10 | ~1 780 tok | Threat modeling, durcissement d’API, audit de dépendances, réponse à incident, conformité et architecture zero-trust. |
| `claude-skills-business` | Business, carrière & écriture | 39 | ~6 225 tok | Propositions commerciales, CV et entretiens, freelancing, marketing et SEO, management d’équipe, rédaction et productivité. |
| `claude-skills-life` | Santé, bien-être & vie quotidienne | 64 | ~11 664 tok | Suivi de santé, bien-être psychologique, parentalité, relations, apprentissage, budget personnel, démarches juridiques et voyage. Accompagnement, jamais un avis professionnel. |
| `claude-skills-collection` | Tout | 348 | ~56 385 tok | Les 7 bundles réunis |

<!-- END:BUNDLES -->

Le coût de contexte est une estimation calibrée sur `claude plugin details` ; `npm run check` le recalcule à chaque build.
Chaque bundle embarque en plus les 2 méta-skills (routeur + mode concis) : `claude-skills-security` = les 8 skills de `security-skills/` + ces 2 méta-skills.

### 3. À la carte — un skill, ou une catégorie

Plus léger : seuls les skills choisis sont copiés dans `~/.claude/skills`.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.sh | sh -s -- dev-code-reviewer --launch
curl -fsSL .../install.sh | sh -s -- --category security     # la catégorie security-skills (8 skills)
curl -fsSL .../install.sh | sh -s -- --search redis          # chercher avant d'installer
curl -fsSL .../install.sh | sh -s -- --list                  # catégories et volumes

# Windows (PowerShell)
iex "& { $(iwr -useb https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.ps1) } dev-code-reviewer -Launch"
```

> 📖 **Catalogue & manuels en ligne** : [khalilbenaz.github.io/claude-skills-collection/manuals](https://khalilbenaz.github.io/claude-skills-collection/manuals/) — un manuel détaillé par skill, recherche instantanée, installation en 1 commande.
> 🤖 **Index machine-lisible** : [`skills.json`](./skills.json) (nom, catégorie, résumé, déclencheurs, chemins) pour vos propres outils.

---

## 🏗️ Architecture & build

- **Source de vérité unique** : les dossiers `<catégorie>-skills/`, `docs/` et `meta-skills/` (noms courts, `kebab-case`). C'est là qu'on édite les skills.
- **Artefacts générés — ne jamais les éditer à la main** : `skills/` (payload du plugin), `manuals/` (site), `docs/SKILL_CATALOG.md`, `skills.json` et `.claude-plugin/marketplace.json` (les 7 bundles + le plugin complet). Chaque skill du plugin est **préfixé par sa catégorie** (`dev-skills/docker-composer` → `dev-docker-composer`) pour éviter les collisions de slash-commands.
- Un bloc **Communication Rules** adapté au domaine est ajouté à la génération (concis pour le technique, bienveillant + disclaimer pour les domaines humains).

```bash
npm run check          # frontmatter strict, collisions, longueurs, liens, compteurs, coût contexte
npm run check:routing  # deux skills qui se disputent les mêmes déclencheurs
npm test               # tests des scripts de build (parsing, nommage, artefacts)
npm run build          # check + routing + skills/ + manuals/ + catalogue + marketplace
```

`npm run check` échoue notamment sur : clé de frontmatter non supportée par Claude Code, `description` > 1024 c., corps > 500 lignes, deux skills à description identique, collision de nom public, catégorie rattachée à zéro ou plusieurs bundles, compteur de skills désynchronisé entre `README`, `index.html`, `package.json` et les manifestes du plugin. Il affiche aussi le coût de contexte permanent de chaque bundle.

`npm run check:routing` échoue si deux skills partagent au moins deux déclencheurs cités, ou portent le même nom de dossier dans deux catégories — un prompt contenant ces mots serait routé au hasard. Les homonymies légitimes se déclarent, avec justification, dans [`scripts/routing-allowlist.json`](./scripts/routing-allowlist.json).

> ⚠️ `.claude-plugin/plugin.json` ne doit pas exister : les entrées de `marketplace.json` sont en `strict: false` et portent toutes les métadonnées. Sa seule présence fait échouer le chargement de **tous** les plugins (« conflicting manifests »). Le build s'arrête si le fichier réapparaît.

La CI ([`validate.yml`](./.github/workflows/validate.yml)) rejoue check + routing + tests + build et échoue si un artefact committé n'est pas à jour. Détails : [CONTRIBUTING](./docs/CONTRIBUTING.md).

---

## 📦 Catégories

<!-- BEGIN:CATEGORIES (généré par npm run build:catalog — ne pas éditer) -->

| Catégorie | Skills | Commandes | Source |
|-----------|-------:|-----------|--------|
| 💻 Développement | 111 | `/dev-*` | [`dev-skills/`](./dev-skills) |
| 🤖 Agents IA | 53 | `/agent-*` | [`agent-skills/`](./agent-skills) |
| 🩺 Santé | 16 | `/health-*` | [`health-skills/`](./health-skills) |
| 🧘 Bien-être | 12 | `/psy-*` | [`psy-skills/`](./psy-skills) |
| 🗄️ Bases de données | 9 | `/database-*` | [`database-skills/`](./database-skills) |
| 🔁 DevOps | 9 | `/devops-*` | [`devops-skills/`](./devops-skills) |
| 📊 Data | 8 | `/data-*` | [`data-skills/`](./data-skills) |
| 🔒 Sécurité | 8 | `/security-*` | [`security-skills/`](./security-skills) |
| 🧠 AI / ML | 7 | `/ai-ml-*` | [`ai-ml-skills/`](./ai-ml-skills) |
| ☁️ Cloud | 7 | `/cloud-*` | [`cloud-skills/`](./cloud-skills) |
| 💰 Finance | 6 | `/finance-*` | [`finance-skills/`](./finance-skills) |
| ⏱️ Productivité | 6 | `/productivity-*` | [`productivity-skills/`](./productivity-skills) |
| ✍️ Prompting | 6 | `/prompt-*` | [`prompt-skills/`](./prompt-skills) |
| 🧪 Tests | 6 | `/testing-*` | [`testing-skills/`](./testing-skills) |
| 🖊️ Écriture | 6 | `/writing-*` | [`writing-skills/`](./writing-skills) |
| ⚙️ Automatisation | 5 | `/automation-*` | [`automation-skills/`](./automation-skills) |
| 🎯 Carrière | 5 | `/career-*` | [`career-skills/`](./career-skills) |
| 🎓 Éducation | 5 | `/education-*` | [`education-skills/`](./education-skills) |
| ⚖️ Juridique | 5 | `/legal-*` | [`legal-skills/`](./legal-skills) |
| 🐧 Linux | 5 | `/linux-*` | [`linux-skills/`](./linux-skills) |
| 📋 Management | 5 | `/management-*` | [`management-skills/`](./management-skills) |
| 📣 Marketing | 5 | `/marketing-*` | [`marketing-skills/`](./marketing-skills) |
| 🌐 Réseaux | 5 | `/networking-*` | [`networking-skills/`](./networking-skills) |
| 👨‍👩‍👧 Parentalité | 5 | `/parenting-*` | [`parenting-skills/`](./parenting-skills) |
| 🤝 Relations | 5 | `/social-*` | [`social-skills/`](./social-skills) |
| ✈️ Voyage | 5 | `/travel-*` | [`travel-skills/`](./travel-skills) |
| 🗣️ Communication | 4 | `/communication-*` | [`communication-skills/`](./communication-skills) |
| 🧾 Freelance | 4 | `/freelance-*` | [`freelance-skills/`](./freelance-skills) |
| 📡 IoT | 4 | `/iot-*` | [`iot-skills/`](./iot-skills) |
| 🚪 API Gateway | 3 | `/api-gateway-*` | [`api-gateway-skills/`](./api-gateway-skills) |
| 🌍 Arabe / Maroc | 3 | `/arabic-*` | [`arabic-skills/`](./arabic-skills) |
| 💼 Business | 2 | `/business-*` | [`business-skills/`](./business-skills) |
| 🧩 Méta | 2 | _sans préfixe_ | [`meta-skills/`](./meta-skills) |
| 📄 Documentation | 1 | `/docs-*` | [`docs/`](./docs) |
| **Total** | **348** | | 34 catégories |

<!-- END:CATEGORIES -->

Détail skill par skill, avec déclencheurs : **[docs/SKILL_CATALOG.md](./docs/SKILL_CATALOG.md)**.

---

## ⭐ Top Skills

### 🧭 Orchestrateur
- **[skill-router](./agent-skills/skill-router)** — _"Quel skill utiliser ?"_ → routeur intelligent qui analyse ta demande et te dirige vers le bon skill

### 🤖 Agents IA
- **[crewai-expert](./agent-skills/crewai-expert)** — _"Créer un crew d'agents"_ → système multi-agents complet avec outils et mémoire
- **[langgraph-designer](./agent-skills/langgraph-designer)** — _"Agent workflow stateful"_ → graphes d'agents avec branchements et persistence
- **[mcp-server-builder](./agent-skills/mcp-server-builder)** — _"Connecter Claude à mon API"_ → serveur MCP avec tools, resources et prompts
- **[coding-agent-builder](./agent-skills/coding-agent-builder)** — _"Agent qui code"_ → coding agent autonome type Devin/SWE-agent
- **[agent-security-hardener](./agent-skills/security-hardener)** — _"Sécuriser mon agent"_ → protection contre injection, abus et fuites

### 💻 Développement
- **[security-auditor](./dev-skills/security-auditor)** — _"Audit sécurité"_ → analyse complète 8 axes
- **[microservices-designer](./dev-skills/microservices-designer)** — _"Découper en microservices"_ → DDD + bounded contexts
- **[grpc-service-designer](./dev-skills/grpc-service-designer)** — _"API gRPC"_ → contrats Protobuf, streaming, implémentation C#
- **[outbox-pattern-guide](./dev-skills/outbox-pattern-guide)** — _"Transaction distribuée"_ → Outbox + Saga avec MassTransit
- **[dotnet-aspire-guide](./dev-skills/dotnet-aspire-guide)** — _".NET Aspire"_ → orchestration cloud-native avec dashboard

### 🎯 Prompt Engineering
- **[prompt-optimizer](./prompt-skills/optimizer)** — _"Améliore mon prompt"_ → analyse 7 critères + version optimisée
- **[mega-prompt-builder](./prompt-skills/mega-prompt-builder)** — _"Crée un prompt pour X"_ → mega-prompt structuré complet
- **[system-prompt-architect](./prompt-skills/system-prompt-architect)** — _"System prompt pour mon chatbot"_ → prompt système robuste


---

## 🚀 Autres usages

```bash
# Claude.ai (hors Claude Code) : packager un skill en .skill
git clone https://github.com/khalilbenaz/claude-skills-collection.git
cd claude-skills-collection/skills/agent-crewai-expert
zip ../../crewai-expert.skill SKILL.md
# → Importer le .skill dans Claude.ai (Paramètres → Skills)
```

📖 Guide complet : **[docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)**

---

## 📖 Documentation

| Document | Contenu |
|----------|---------|
| [🚀 Getting Started](./docs/GETTING_STARTED.md) | Installation, utilisation, FAQ |
| [📚 Skill Catalog](./docs/SKILL_CATALOG.md) | Catalogue complet — 348 skills avec déclencheurs et livrables |
| [🛠️ Creating Skills](./docs/CREATING_SKILLS.md) | Guide + template pour créer son propre skill |
| [🧭 Design Principles](./docs/DESIGN_PRINCIPLES.md) | 8 principes de conception |
| [🤝 Contributing](./docs/CONTRIBUTING.md) | Comment contribuer |

---

## 🧭 Principes

- **Structurer, pas diagnostiquer** — organise l'information sans conclure
- **Toujours un livrable** — tableau, document, plan, checklist, code
- **Ton mesuré** — ni alarmiste ni minimisant
- **Sécurité intégrée** — escalade vers aide humaine si crise
- **Sans jugement** — bienveillant et respectueux
- **Autonomie** — l'utilisateur reste décideur
- **Code concret** — exemples fonctionnels, pas de théorie vague

---

## ⚡ Règles de communication — adaptées au domaine

Chaque skill embarque un bloc de règles de communication, **ajouté automatiquement à la génération** selon son domaine :

**Domaines techniques** (dev, cloud, data, sécurité, agents…) → mode **ultra-concis** :

- **Outil d'abord, parler ensuite** — Agir avant d'expliquer
- **Résultat d'abord** — Commencer par le résultat, pas le processus
- **S'arrêter quand c'est fait** — Pas de résumé ni de commentaire superflu
- **Pas de remplissage ni de formules de politesse** — Direct et franc
- **Minimum de mots** — Si un mot suffit, ne pas en utiliser dix

**Domaines humains** (santé, bien-être, relations, parentalité, juridique) → mode **bienveillant** : clair et concis, mais chaleureux, sans jugement, avec rappel de consulter un professionnel qualifié quand la situation l'exige.

---

## 🤝 Contribuer

Les contributions sont bienvenues.

- **Guide complet** : [CONTRIBUTING](./docs/CONTRIBUTING.md) — source de vérité, artefacts générés, règles de validation.
- **Signaler un skill qui se déclenche mal ou dit faux** : [ouvrir une issue](https://github.com/khalilbenaz/claude-skills-collection/issues/new/choose). Le prompt exact que vous avez tapé est la donnée la plus utile.
- **Proposer un skill** : vérifiez d'abord [le catalogue](https://khalilbenaz.github.io/claude-skills-collection/manuals/) — 348 skills existent, le vôtre est peut-être une amélioration d'un skill existant.
- **Sécurité** : [SECURITY.md](./SECURITY.md). Les failles se signalent en advisory privé, pas en issue publique.

Deux règles qui font échouer la CI et qu'on oublie souvent : éditer un artefact généré au lieu de la source, et écrire une description dont les déclencheurs empiètent sur un skill existant (`npm run check:routing`).

---

## 📄 Licence

MIT — Libre d'utilisation, modification et redistribution.

---

## ⚠️ Avertissements

- **Santé** : Ne remplace pas un avis médical.
- **Finance** : Ne constitue pas un conseil financier.
- **Juridique** : Ne constitue pas un conseil juridique.
- **Sécurité** : Les outils de pentest sont à utiliser dans un cadre légal et autorisé.
- **Urgence** : En cas de danger, contactez les urgences locales.

---

<p align="center">
  <strong>348 skills • 34 catégories • 100% open-source</strong><br>
  Fait avec 🤖💻🔒🧠🎨 par <a href="https://github.com/khalilbenaz">@khalilbenaz</a>
</p>
