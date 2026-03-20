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
- Reste sous 500 lignes dans le SKILL.md

---

## Template vierge

```markdown
---
name: nom-du-skill
description: [Ce que le skill fait]. À utiliser quand [contexte]. Se déclenche aussi avec "[phrase 1]", "[phrase 2]", "[phrase 3]", ou [description large].
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

## Packager son skill

### Option 1 — Manuellement
```bash
cd mon-skill/
zip ../mon-skill.skill SKILL.md
```

### Option 2 — Avec le script de packaging
```bash
python -m scripts.package_skill ./mon-skill
```

Le fichier `.skill` est simplement un `.zip` contenant le `SKILL.md`.

---

## Tester son skill

1. Installez le skill dans Claude
2. Essayez 5-10 phrases de déclenchement différentes
3. Vérifiez que le workflow est suivi correctement
4. Ajustez la description si le skill ne se déclenche pas assez
5. Ajustez le workflow si les réponses ne sont pas satisfaisantes
