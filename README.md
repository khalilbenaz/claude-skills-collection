# 🧠 Claude Skills Collection

La plus grande collection open-source de skills pour Claude — **348 skills** couvrant **34 domaines** du développement, de la sécurité, des agents IA, du DevOps, de la data, et de la vie quotidienne.

> Un skill transforme Claude en assistant spécialisé avec un workflow structuré étape par étape.

[![Skills](https://img.shields.io/badge/skills-348-blue)]()[![Categories](https://img.shields.io/badge/catégories-34-green)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()
[![Language](https://img.shields.io/badge/langue-Français%20%2B%20déclencheurs%20EN-red)]()

---

## 📥 Installation

### 1. Toute la collection, en plugin Claude Code

```bash
/plugin marketplace add https://github.com/khalilbenaz/claude-skills-collection
/plugin install claude-skills-collection
```

Les 348 skills deviennent des slash commands (`/dev-docker-composer`, `/agent-spawner`, `/cloud-aws-architect`, `/security-threat-modeling`…).

### 2. À la carte — un skill, ou une catégorie

Plus léger : seuls les skills choisis sont copiés dans `~/.claude/skills`.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.sh | sh -s -- dev-code-reviewer --launch
curl -fsSL .../install.sh | sh -s -- --category security     # les 8 skills sécurité
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
- **Artefacts générés — ne jamais les éditer à la main** : `skills/` (payload du plugin), `manuals/` (site), `docs/SKILL_CATALOG.md` et `skills.json`. Chaque skill du plugin est **préfixé par sa catégorie** (`dev-skills/docker-composer` → `dev-docker-composer`) pour éviter les collisions de slash-commands.
- Un bloc **Communication Rules** adapté au domaine est ajouté à la génération (concis pour le technique, bienveillant + disclaimer pour les domaines humains).

```bash
npm run check          # frontmatter strict, collisions, longueurs, liens, compteurs
npm test               # tests des scripts de build (parsing, nommage, artefacts)
npm run build          # check + skills/ + manuals/ + catalogue + skills.json
```

`npm run check` échoue notamment sur : clé de frontmatter non supportée par Claude Code, `description` > 1024 c., corps > 500 lignes, deux skills à description identique, collision de nom public, compteur de skills désynchronisé entre `README`, `index.html`, `package.json` et les manifestes du plugin.

La CI ([`validate.yml`](./.github/workflows/validate.yml)) rejoue check + tests + build et échoue si un artefact committé n'est pas à jour. Détails : [CONTRIBUTING](./docs/CONTRIBUTING.md).

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

Les contributions sont bienvenues ! Voir le [guide de contribution](./docs/CONTRIBUTING.md).

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
