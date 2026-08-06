# 🛠️ Créer son propre skill

## Anatomie d'un skill

Un skill est un dossier contenant au minimum un fichier `SKILL.md` :

```
mon-skill/
└── SKILL.md
```

Le fichier `SKILL.md` contient deux parties :

### 1. Frontmatter YAML (obligatoire)

```yaml
---
name: mon-skill
description: Description claire de ce que fait le skill et quand il doit se déclencher. Plus la description est précise, mieux Claude saura quand l'utiliser.
---
```

Contraintes vérifiées par `npm run check` :

| Clé | Règle |
|-----|-------|
| `name` | **obligatoire**, `kebab-case`, identique au nom du dossier |
| `description` | **obligatoire**, une seule ligne logique, 40 à 1024 caractères |
| autres clés | seules `allowed-tools`, `license`, `model` sont acceptées — toute autre clé (`triggers:`, `tags:`…) est **ignorée par Claude Code** et rejetée par le validateur : mettez ces informations dans `description` |

### 2. Corps Markdown (le workflow)

Le corps contient les instructions que Claude suivra. C'est le cœur du skill.

---

## Bonnes pratiques

### Description (frontmatter)

La description est le **mécanisme de déclenchement principal**. Claude décide d'utiliser un skill en se basant sur cette description.

**À faire :**
- Décrire ce que le skill fait ET quand l'utiliser
- Inclure des phrases de déclenchement concrètes ("Se déclenche aussi avec...")
- Être spécifique et "pushy" (mieux vaut trop déclencher que pas assez)

**Déclencheurs bilingues — obligatoire :** la collection est rédigée en français, mais les prompts arrivent souvent en anglais. Chaque description liste ses déclencheurs français, puis une phrase `Also triggers on "…", "…"` avec les formulations anglaises correspondantes. `npm run check` avertit si aucun déclencheur anglophone n'est détecté.

```yaml
description: Revue de code structurée… Se déclenche aussi avec "revois mon code", "améliore ce code". Also triggers on "review my code", "check this PR", "is this code good".
```

**À éviter :**
- Descriptions vagues ("Aide avec des trucs de santé")
- Descriptions trop courtes (manque de contexte de déclenchement)

### Workflow (corps)

**Structure recommandée :**

```markdown
# Nom du Skill

## Étape 1 — [Nom de l'étape]
Instructions claires pour cette étape.

## Étape 2 — [Nom de l'étape]
Instructions claires pour cette étape.

## Règles
- Ce que le skill ne doit JAMAIS faire
- Limites et garde-fous

## Rappel obligatoire
> Message de fin systématique
```

**Conseils :**
- Chaque étape doit être actionnable
- Utilise des tableaux pour structurer les sorties
- Inclus des exemples quand possible
- Ajoute des garde-fous (règles, rappels)
- Reste sous 500 lignes dans le SKILL.md (limite appliquée par `npm run check`)
- Ressources annexes optionnelles : `references/`, `assets/`, `scripts/`, `templates/` dans le dossier du skill — les liens relatifs vers ces dossiers sont vérifiés au build

---

## Template vierge

```markdown
---
name: nom-du-skill
description: [Ce que le skill fait]. À utiliser quand [contexte]. Se déclenche aussi avec "[phrase FR 1]", "[phrase FR 2]", "[phrase FR 3]". Also triggers on "[EN phrase 1]", "[EN phrase 2]", "[EN phrase 3]".
---

# Nom du Skill

## Étape 1 — Comprendre le contexte
[Instructions pour collecter les informations nécessaires]

## Étape 2 — Traiter l'information
[Instructions pour l'analyse ou le traitement]

## Étape 3 — Produire le résultat
[Instructions pour le livrable final — tableau, document, liste...]

## Règles
- [Garde-fou 1]
- [Garde-fou 2]

## Rappel obligatoire
> ⚠️ [Message de fin systématique]
```

---

## Intégrer son skill à la collection

1. Créez le dossier dans la bonne catégorie source : `<categorie>-skills/mon-skill/SKILL.md`
2. Validez et régénérez les artefacts :

```bash
npm run check      # frontmatter, longueurs, collisions, compteurs
npm test           # tests des scripts de build
npm run build      # skills/, manuals/, catalogues
```

Le skill devient la slash command `/<categorie>-mon-skill` (préfixe ajouté à la génération).

## Packager un skill pour Claude.ai

```bash
cd skills/categorie-mon-skill/     # payload généré (avec les Communication Rules)
zip ../../mon-skill.skill SKILL.md
```

Le fichier `.skill` est simplement un `.zip` contenant le `SKILL.md`.

---

## Tester son skill

1. Installez le skill dans Claude (`sh install.sh <nom-du-skill>` ou copie dans `~/.claude/skills`)
2. Essayez 5-10 phrases de déclenchement différentes
3. Vérifiez que le workflow est suivi correctement
4. Ajustez la description si le skill ne se déclenche pas assez
5. Ajustez le workflow si les réponses ne sont pas satisfaisantes
