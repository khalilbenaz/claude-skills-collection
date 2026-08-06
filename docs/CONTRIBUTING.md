# 🤝 Contribuer

Merci de vouloir contribuer ! Voici comment faire.

## Source de vérité & artefacts générés

> ⚠️ **N'éditez jamais un artefact généré à la main** : il serait écrasé au prochain build.

- **Source éditable** : les dossiers `categorie-skills/`, `docs/` et `meta-skills/` (noms courts, `kebab-case`).
- **Généré** :
  | Artefact | Rôle | Script |
  |----------|------|--------|
  | `skills/` | payload du plugin (nom **préfixé** par la catégorie : `dev-skills/docker-composer` → `dev-docker-composer`, pour éviter les collisions de slash-commands) | `build-skills.mjs` |
  | `manuals/` | site de documentation + `skills.index` consommé par les installeurs | `build-manuals.mjs` |
  | `docs/SKILL_CATALOG.md`, `skills.json`, bloc `CATEGORIES` du `README` | catalogues lisible et machine-lisible | `build-catalog.mjs` |

Le chargement des skills source est mutualisé dans [`scripts/lib/skills.mjs`](../scripts/lib/skills.mjs) : un seul parsing pour la validation, les builds et les catalogues.

Après toute modification d'un skill source, régénérez et committez les artefacts :

```bash
npm run check      # validation stricte des sources
npm test           # tests des scripts de build
npm run build      # check + skills/ + manuals/ + catalogues
```

La CI (`.github/workflows/validate.yml`) rejoue check + tests + build et **échoue si un artefact committé n'est pas à jour**.

### Ce que `npm run check` refuse

| Règle | Seuil |
|-------|-------|
| Clé de frontmatter non supportée par Claude Code (seuls `name`, `description`, `allowed-tools`, `license`, `model`) | erreur |
| `name` ≠ nom du dossier, ou dossier non `kebab-case` | erreur |
| Nom public (préfixe + dossier) trop long | > 64 caractères |
| `description` hors bornes | < 40 ou > 1024 caractères |
| Corps vide, ou trop long pour le budget de contexte | > 500 lignes |
| Deux skills avec la **même** description, ou collision de nom public | erreur |
| Ressource embarquée (`./references/…`, `./assets/…`) introuvable | erreur |
| Compteur de skills désynchronisé (`README`, `index.html`, `package.json`, manifestes du plugin) | erreur |

Les avertissements (description peu descriptive, aucun déclencheur cité, corps très court, CRLF, espaces en fin de ligne) ne bloquent pas la CI mais doivent être traités.

## Ajouter un nouveau skill

1. **Fork** ce repo
2. **Créez** un dossier dans la bonne catégorie source :
   ```
   categorie-skills/nom-du-skill/SKILL.md
   ```
3. **Respectez** le format standard (voir [CREATING_SKILLS.md](./CREATING_SKILLS.md))
4. **Testez** le skill avec au moins 5 phrases de déclenchement
5. **Lancez** `npm run build` pour régénérer les artefacts (et committez-les)
6. **Ouvrez** une Pull Request avec :
   - Description du skill
   - Exemples de déclenchement
   - Captures d'écran ou exemples de sortie si possible

## Améliorer un skill existant

1. **Ouvrez une issue** décrivant le problème ou l'amélioration
2. **Fork + branche** (`improve/nom-du-skill`)
3. **Modifiez** le SKILL.md
4. **Testez** que le skill se déclenche toujours correctement
5. **PR** avec avant/après

## Conventions

### Nommage
- Dossiers : `kebab-case` (ex: `code-reviewer`)
- Un seul `SKILL.md` par dossier (pour l'instant)

### Langue
- Skills en **français** par défaut
- Les termes techniques peuvent rester en anglais (API, SQL, CSS…)
- La description du frontmatter doit inclure des phrases de déclenchement

### Catégories existantes

La liste à jour (34 catégories, avec volumes et préfixes) est dans le [README](../README.md#-catégories) et le [catalogue](./SKILL_CATALOG.md).

Pour une **nouvelle catégorie** : ouvrez d'abord une issue. Côté code, il faut créer le dossier `<nom>-skills/` **et** ajouter son entrée (libellé, icône, couleur) dans `CATEGORY_META` de [`scripts/lib/skills.mjs`](../scripts/lib/skills.mjs) — `npm test` échoue tant que la catégorie n'a pas de libellé dédié.

## Code de conduite

- Bienveillance et respect
- Pas de contenu médical dangereux
- Pas de contenu discriminatoire
- Les skills santé doivent **toujours** rappeler de consulter un professionnel
