# 🚀 Guide de démarrage

## Qu'est-ce qu'un Skill Claude ?

Un skill est un fichier d'instructions (`SKILL.md`) qui donne à Claude un workflow spécialisé pour une tâche précise. Au lieu de répondre de manière générale, Claude suit un processus structuré étape par étape.

**Exemple** : au lieu de demander "aide-moi avec mon CV", le skill `cv-builder` guide Claude à travers un processus complet : profil → structure → optimisation → checklist qualité.

---

## Installation

### Méthode 1 — Plugin Claude Code (toute la collection)

```bash
/plugin marketplace add https://github.com/khalilbenaz/claude-skills-collection
/plugin install claude-skills-collection
```

Les 348 skills deviennent des slash commands, **préfixées par leur catégorie** : `/dev-code-reviewer`, `/health-symptom-tracker`, `/career-interview-prep`…

### Méthode 2 — À la carte (un skill ou une catégorie)

Plus léger : seuls les skills choisis sont copiés dans `~/.claude/skills`.

```bash
BASE=https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main

# un skill, et on l'ouvre tout de suite
curl -fsSL $BASE/install.sh | sh -s -- dev-code-reviewer --launch

# une catégorie entière
curl -fsSL $BASE/install.sh | sh -s -- --category security

# explorer avant d'installer
curl -fsSL $BASE/install.sh | sh -s -- --list
curl -fsSL $BASE/install.sh | sh -s -- --search redis
```

Windows (PowerShell) :

```powershell
iex "& { $(iwr -useb https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.ps1) } dev-code-reviewer -Launch"
```

### Méthode 3 — Claude.ai (hors Claude Code)

1. Clonez le repo : `git clone https://github.com/khalilbenaz/claude-skills-collection.git`
2. Zippez le `SKILL.md` du skill voulu depuis le payload généré : `cd skills/dev-code-reviewer && zip ../../code-reviewer.skill SKILL.md`
3. Dans Claude.ai : **Paramètres → Skills → Ajouter un skill**, puis sélectionnez le `.skill`

À défaut, copiez le contenu du `SKILL.md` dans les instructions personnalisées d'un projet.

---

## Trouver le bon skill

- **Catalogue en ligne** avec recherche instantanée : <https://khalilbenaz.github.io/claude-skills-collection/manuals/>
- **Catalogue Markdown** : [SKILL_CATALOG.md](./SKILL_CATALOG.md) — 348 skills, leurs déclencheurs, par catégorie
- **Index machine-lisible** : [`skills.json`](../skills.json)
- **En session** : décrivez simplement votre besoin — ou lancez `/agent-skill-router` pour vous faire orienter

---

## Utilisation

Une fois installé, le skill se déclenche **automatiquement** quand votre demande correspond à sa description ; vous pouvez aussi l'invoquer explicitement par sa slash command.

| Vous écrivez… | Skill déclenché |
|-----------------|----------------|
| "J'ai mal au ventre depuis 3 jours" | `/health-symptom-tracker` |
| "Review ce code Python" | `/dev-code-reviewer` |
| "Je veux économiser 5000 DH" | `/finance-savings-goal-planner` |
| "Je suis épuisé par le travail" | `/psy-burnout-assessment` |
| "Prépare mon entretien chez Google" | `/career-interview-prep` |

---

## Désinstallation

- **Plugin** : `/plugin uninstall claude-skills-collection`
- **Installation à la carte** : supprimez le dossier `~/.claude/skills/<nom-du-skill>`
- **Claude.ai** : Paramètres → Skills → cliquez sur le skill → **Supprimer**

---

## FAQ

**Q : Puis-je installer plusieurs skills en même temps ?**
R : Oui — plusieurs noms à la suite, ou `--category <préfixe>` pour une catégorie entière. Chaque skill se déclenche indépendamment selon le contexte.

**Q : Plugin complet ou installation à la carte ?**
R : Le plugin expose les 348 skills d'un coup (pratique, mais toutes les descriptions sont chargées en contexte à chaque session). L'installation à la carte garde le contexte léger — recommandée si vous n'utilisez qu'une poignée de domaines.

**Q : Les skills fonctionnent-ils en anglais ?**
R : Ils sont conçus en français mais Claude s'adaptera si vous écrivez en anglais.

**Q : Un skill peut-il se tromper ?**
R : Les skills guident la structure de la réponse, mais Claude peut toujours faire des erreurs. Vérifiez toujours les informations importantes.

**Q : Comment créer mon propre skill ?**
R : Consultez le guide [CREATING_SKILLS.md](./CREATING_SKILLS.md).
