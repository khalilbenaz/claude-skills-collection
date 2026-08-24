# 🧠 Claude Skills Collection

The largest open-source skill collection for Claude — **348 skills** across **34 domains**: development, security, AI agents, DevOps, data, business, and everyday life.

> A skill turns Claude into a specialised assistant with a structured, step-by-step workflow.

[![Skills](https://img.shields.io/badge/skills-348-blue)]()[![Categories](https://img.shields.io/badge/categories-34-green)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()[![Bundles](https://img.shields.io/badge/bundles-7-purple)]()

🇫🇷 [Version française](./README.md) — the canonical, most detailed document.

---

## ⚠️ Read this first: the skills are written in French

The body of every skill is French. **The trigger phrases are bilingual**: each description ends with
an `Also triggers on "…"` segment listing English phrasings, so an English prompt routes to the right
skill. Claude then answers you in the language you wrote in — the French body is guidance for the
model, not output shown to you.

If you only ever prompt in English, this collection still works. If you want the skills themselves
translated, that's an open contribution — see [Contributing](#-contributing).

---

## 📥 Installation

### 1. A single bundle — recommended

The collection ships as **seven thematic plugins**. Each one installs on its own and loads only its
own skills.

```bash
/plugin marketplace add https://github.com/khalilbenaz/claude-skills-collection
/plugin install claude-skills-security     # 10 skills, ~1,800 tokens of context
```

| Plugin | Domain | Skills | Standing context |
|--------|--------|-------:|-----------------:|
| `claude-skills-dev` | Development & testing | 120 | ~18,600 tok |
| `claude-skills-agents` | AI agents, LLM & prompting | 68 | ~11,600 tok |
| `claude-skills-cloud-ops` | Cloud, DevOps & networking | 40 | ~5,900 tok |
| `claude-skills-data` | Data & databases | 19 | ~2,700 tok |
| `claude-skills-security` | Security | 10 | ~1,800 tok |
| `claude-skills-business` | Business, career & writing | 39 | ~6,200 tok |
| `claude-skills-life` | Health, wellbeing & daily life | 64 | ~11,700 tok |
| `claude-skills-collection` | Everything | 348 | ~56,400 tok |

**Why the context column matters.** The `name` *and* `description` of every installed skill are
injected into **every** session you start, whether the skill fires or not. Installing all 348 costs
roughly 56,000 standing tokens. One bundle costs a tenth of that. Pick the domain you actually work
in. The figures come from `claude plugin details` and are recomputed by `npm run check` at each build.

### 2. The whole collection

```bash
/plugin marketplace add https://github.com/khalilbenaz/claude-skills-collection
/plugin install claude-skills-collection
```

All 348 skills become slash commands (`/dev-docker-composer`, `/agent-spawner`, `/cloud-aws-architect`,
`/security-threat-modeling`…).

### 3. À la carte — one skill, or one category

Lightest option: only the skills you pick are copied into `~/.claude/skills`.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.sh | sh -s -- dev-code-reviewer --launch
curl -fsSL .../install.sh | sh -s -- --category security     # every security skill
curl -fsSL .../install.sh | sh -s -- --search redis          # search before installing
curl -fsSL .../install.sh | sh -s -- --list                  # categories and volumes

# Windows (PowerShell)
iex "& { $(iwr -useb https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.ps1) } dev-code-reviewer -Launch"
```

> 📖 **Online catalogue & manuals**: [khalilbenaz.github.io/claude-skills-collection/manuals](https://khalilbenaz.github.io/claude-skills-collection/manuals/) — one manual per skill, instant search, one-command install.
> 🤖 **Machine-readable index**: [`skills.json`](./skills.json) (name, category, summary, triggers, paths) for your own tooling.

---

## 🎯 How a skill fires

You don't have to type the slash command. Describe what you need and the matching skill activates:

```
"review this PR for security issues"      → /dev-code-reviewer
"my Postgres query takes 8 seconds"       → /database-query-optimizer
"design a multi-agent research system"    → /agent-multi-agent-architect
"write a threat model for this API"       → /security-threat-modeling
```

Not sure which one? `/meta-workflows` reads your request and routes you to the most relevant skills
in the catalogue.

---

## 🏗️ Architecture & build

- **Single source of truth**: the `<category>-skills/`, `docs/` and `meta-skills/` directories (short `kebab-case` names). Edit skills there.
- **Generated artefacts — never hand-edit**: `skills/` (plugin payload), `manuals/` (site), `docs/SKILL_CATALOG.md`, `skills.json`, and `.claude-plugin/marketplace.json`. Every skill in the plugin is **prefixed by its category** (`dev-skills/docker-composer` → `dev-docker-composer`) so slash commands can't collide.
- A domain-appropriate **Communication Rules** block is appended at build time (terse for technical domains; supportive with a disclaimer for human ones).

```bash
npm run check          # strict frontmatter, collisions, lengths, links, counters, context cost
npm run check:routing  # two skills competing for the same trigger words
npm test               # build-script tests
npm run build          # check + routing + skills/ + manuals/ + catalogue + marketplace
```

`npm run check:routing` fails when two skills share two or more quoted trigger phrases, or carry the
same directory name in two categories — a prompt containing those words would be routed arbitrarily.
Legitimate homonyms are declared, with a written reason, in
[`scripts/routing-allowlist.json`](./scripts/routing-allowlist.json).

> ⚠️ `.claude-plugin/plugin.json` must not exist. The `marketplace.json` entries are `strict: false`
> and carry all metadata; the mere presence of a root `plugin.json` breaks loading for **every**
> plugin with "conflicting manifests". The build aborts if the file reappears.

CI ([`validate.yml`](./.github/workflows/validate.yml)) replays check + routing + tests + build and
fails if a committed artefact is stale.

---

## 🤝 Contributing

- **Full guide**: [CONTRIBUTING](./docs/CONTRIBUTING.md) (French).
- **A skill fires wrongly or says something false**: [open an issue](https://github.com/khalilbenaz/claude-skills-collection/issues/new/choose). The exact prompt you typed is the single most useful piece of information.
- **Proposing a skill**: check [the catalogue](https://khalilbenaz.github.io/claude-skills-collection/manuals/) first — with 348 skills, yours may be an improvement to an existing one.
- **Translating skills to English** is welcome. Keep the bilingual trigger convention (`Se déclenche avec "…"` + `Also triggers on "…"`).
- **Security**: [SECURITY.md](./SECURITY.md). Report vulnerabilities as a private advisory, never as a public issue.

Two rules that fail CI and are easy to forget: editing a generated artefact instead of the source,
and writing a description whose triggers overlap an existing skill.

---

## 📄 License

MIT — see [LICENSE](./LICENSE). Use, modify and redistribute freely, including commercially.

---

## ⚠️ Disclaimers

Skills in the health, wellbeing, legal, finance and parenting categories are **support tools, never
professional advice**. They consistently point you back to a qualified professional. Security and
pentest skills carry their own scope rules: written authorisation, defined perimeter, responsible
disclosure. Do not use them outside that frame.
