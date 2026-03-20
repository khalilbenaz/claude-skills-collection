# 🧠 Claude Skills Collection

Une collection open-source de **59 skills** pour Claude, couvrant la santé, le développement, la productivité, la finance, l'éducation, la rédaction et la carrière.

> Un skill est un fichier d'instructions qui transforme Claude en assistant spécialisé pour une tâche précise, avec un workflow structuré étape par étape.

[![Skills](https://img.shields.io/badge/skills-59-blue)]()
[![Categories](https://img.shields.io/badge/catégories-8-green)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()
[![Language](https://img.shields.io/badge/langue-Français-red)]()

---

## 📦 Catégories

| Catégorie | Skills | Description |
|-----------|--------|-------------|
| 🏥 [Health Skills](./health-skills) | 16 | Suivi de santé physique, analyses, consultations |
| 🧠 [Psy Skills](./psy-skills) | 12 | Santé mentale, émotions, thérapie, crise |
| 💻 [Dev Skills](./dev-skills) | 6 | Code review, debug, API, Git, SQL, regex |
| ⚡ [Productivity Skills](./productivity-skills) | 5 | Planning, réunions, décisions, habitudes, projets |
| 💰 [Finance Skills](./finance-skills) | 5 | Budget, dépenses, épargne, investissement, impôts |
| 📚 [Education Skills](./education-skills) | 5 | Révisions, flashcards, examens, apprentissage |
| ✍️ [Writing Skills](./writing-skills) | 5 | Blog, emails, copywriting, relecture, contenu |
| 🎯 [Career Skills](./career-skills) | 5 | CV, entretiens, salaire, LinkedIn, reconversion |

---

## ⭐ Skills les plus utiles

### 🏥 Santé
- **[symptom-tracker](./health-skills/symptom-tracker)** — _"J'ai mal au ventre depuis 3 jours"_ → tableau de suivi complet
- **[red-flag-checker](./health-skills/red-flag-checker)** — _"C'est grave docteur ?"_ → classification urgence en 3 niveaux
- **[doctor-visit-prep](./health-skills/doctor-visit-prep)** — _"Je vois le médecin demain"_ → document prêt à emporter

### 🧠 Santé mentale
- **[emotional-checkin](./psy-skills/emotional-checkin)** — _"Je me sens mal"_ → point émotionnel structuré
- **[anxiety-debrief](./psy-skills/anxiety-debrief)** — _"J'ai eu une crise d'angoisse"_ → débriefing complet
- **[crisis-escalation](./psy-skills/crisis-escalation)** — _"Je ne vois pas d'issue"_ → orientation aide immédiate

### 💻 Développement
- **[code-reviewer](./dev-skills/code-reviewer)** — _"Review ce code"_ → analyse 5 axes + code corrigé
- **[bug-debugger](./dev-skills/bug-debugger)** — _"Ça marche pas"_ → hypothèses + diagnostic + fix

### ⚡ Productivité
- **[weekly-planner](./productivity-skills/weekly-planner)** — _"Organise ma semaine"_ → planning Eisenhower
- **[decision-matrix](./productivity-skills/decision-matrix)** — _"Je ne sais pas quoi choisir"_ → matrice pondérée

### 🎯 Carrière
- **[cv-builder](./career-skills/cv-builder)** — _"Aide-moi avec mon CV"_ → CV optimisé poste par poste
- **[interview-prep](./career-skills/interview-prep)** — _"J'ai un entretien"_ → préparation STAR complète

---

## 🚀 Installation rapide

```bash
# Cloner le repo
git clone https://github.com/khalilbenaz/claude-skills-collection.git

# Packager un skill
cd claude-skills-collection/dev-skills/code-reviewer
zip ../../code-reviewer.skill SKILL.md

# → Importer le fichier .skill dans Claude.ai
```

Ou téléchargez les fichiers `.skill` pré-packagés depuis les **[Releases](../../releases)**.

📖 Guide complet : [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)

---

## 📖 Documentation

| Document | Contenu |
|----------|---------|
| [🚀 Getting Started](./docs/GETTING_STARTED.md) | Installation, utilisation, FAQ |
| [📚 Skill Catalog](./docs/SKILL_CATALOG.md) | Catalogue complet avec déclencheurs et livrables |
| [🛠️ Creating Skills](./docs/CREATING_SKILLS.md) | Guide pour créer son propre skill |
| [🧭 Design Principles](./docs/DESIGN_PRINCIPLES.md) | Principes de conception |
| [🤝 Contributing](./docs/CONTRIBUTING.md) | Comment contribuer |

---

## 🧭 Principes

- **Structurer, pas diagnostiquer** — organise l'information sans conclure
- **Toujours un livrable** — tableau, document, plan, checklist
- **Ton mesuré** — ni alarmiste ni minimisant, bienveillant
- **Sécurité intégrée** — escalade vers aide humaine en cas de crise
- **Autonomie** — l'utilisateur reste maître de ses décisions

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez le [guide de contribution](./docs/CONTRIBUTING.md).

```bash
# Fork → Branche → Skill → Test → PR
```

---

## 📄 Licence

MIT — Libre d'utilisation, modification et redistribution.

---

## ⚠️ Avertissements

- **Santé** : Ces skills ne remplacent pas un avis médical. Consultez un professionnel.
- **Finance** : Ces skills ne sont pas des conseils financiers. Consultez un conseiller.
- **Juridique** : Ces skills ne sont pas des conseils juridiques. Consultez un avocat.
- **Urgence** : En cas de danger immédiat, contactez les services d'urgence locaux.

---

<p align="center">
  Fait avec 🩺 💻 🧠 par <a href="https://github.com/khalilbenaz">@khalilbenaz</a>
</p>
