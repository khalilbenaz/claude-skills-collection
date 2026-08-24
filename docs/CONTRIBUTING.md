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
  | `.claude-plugin/marketplace.json`, blocs `BUNDLES` du `README` et de `index.html` | les 7 bundles + le plugin complet | `build-marketplace.mjs` |

> `.claude-plugin/plugin.json` **ne doit pas exister**. Les entrées de `marketplace.json` sont en `strict: false` : elles portent toutes les métadonnées. La simple présence d'un `plugin.json` à la racine fait échouer le chargement de **tous** les plugins avec « conflicting manifests » (le scan implicite de `skills/` compte comme composant déclaré). `build-marketplace.mjs` échoue si le fichier réapparaît.

Le chargement des skills source est mutualisé dans [`scripts/lib/skills.mjs`](../scripts/lib/skills.mjs) : un seul parsing pour la validation, les builds et les catalogues.

Après toute modification d'un skill source, régénérez et committez les artefacts :

```bash
npm run check          # validation stricte des sources
npm run check:routing  # collisions de déclencheurs entre skills
npm test               # tests des scripts de build
npm run build          # check + routing + skills/ + manuals/ + catalogues + marketplace
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

Les avertissements (description peu descriptive, aucun déclencheur cité, corps très court, CRLF, espaces en fin de ligne) ne bloquent pas la CI mais doivent être traités. La collection est actuellement à **zéro avertissement** : gardons-la comme ça.

Un seul skill est exempté du seuil de corps court, via `SHORT_BODY_OK` dans `check-skills.mjs` : `meta-skills/ultra-concise-mode`, dont le sujet *est* la concision. Toute nouvelle exemption doit porter sa justification en commentaire — par défaut, on étoffe le skill.

### Ce que `npm run check:routing` refuse

Deux skills qui se disputent les mêmes mots ne se déclenchent pas de façon fiable : le modèle en choisit un au hasard. Ce lint rend la collision visible avant le merge.

| Règle | Effet |
|-------|-------|
| Deux skills partagent **≥ 2 déclencheurs** cités identiques (accents et casse normalisés) | erreur |
| Deux skills portent le **même nom de dossier** dans deux catégories | erreur |
| Deux résumés très proches (Jaccard ≥ 0,6 sur les mots) | avertissement |
| Déclencheur trop générique (`performance`, `service`, `architecture`…) | avertissement |

Deux façons de corriger une erreur :

1. **Réécrire les descriptions** pour que chaque skill possède sa propre surface de déclenchement, en renvoyant explicitement vers l'autre (« pour X, voir `autre-skill` »). C'est presque toujours la bonne réponse.
2. **Déclarer la paire** dans [`scripts/routing-allowlist.json`](../scripts/routing-allowlist.json) avec une justification écrite — réservé aux cas où les deux skills sont légitimement homonymes mais couvrent des mondes disjoints. Une entrée devenue inutile est signalée en avertissement.

### Coût contexte

`npm run check` affiche le coût de contexte **permanent** de chaque bundle. Le `name` et la `description` de chaque skill installé sont injectés dans **toutes** les sessions de l'utilisateur, que le skill serve ou non — la collection complète coûte ~56 000 tokens. Une description de 300 caractères coûte donc ~110 tokens permanents à chaque personne qui installe le bundle. Écrivez-la dense : chaque mot doit soit décrire la tâche, soit servir de déclencheur.

## Ajouter un nouveau skill

1. **Fork** ce repo
2. **Créez** un dossier dans la bonne catégorie source :
   ```
   categorie-skills/nom-du-skill/SKILL.md
   ```
3. **Respectez** le format standard (voir [CREATING_SKILLS.md](./CREATING_SKILLS.md))
4. **Testez** le skill avec au moins 5 phrases de déclenchement
5. **Lancez** `npm run build` pour régénérer les artefacts (et committez-les) — il inclut `check:routing`, qui refusera le skill si ses déclencheurs empiètent sur un skill existant
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
- La description du frontmatter doit inclure des phrases de déclenchement **en français ET en anglais** (segment `Also triggers on "…"`) : sans cela, un prompt en anglais ne déclenche pas le skill. `npm run check` le signale.

### Catégories existantes

La liste à jour (34 catégories, avec volumes et préfixes) est dans le [README](../README.md#-catégories) et le [catalogue](./SKILL_CATALOG.md).

Chaque catégorie appartient à **exactement un bundle** (partition définie par `BUNDLES` dans [`scripts/lib/skills.mjs`](../scripts/lib/skills.mjs)). `npm run check` échoue si une catégorie n'est rattachée à aucun bundle ou à plusieurs — une nouvelle catégorie doit donc aussi être rattachée.

Pour une **nouvelle catégorie** : ouvrez d'abord une issue. Côté code, il faut créer le dossier `<nom>-skills/` **et** ajouter son entrée (libellé, icône, couleur) dans `CATEGORY_META` de [`scripts/lib/skills.mjs`](../scripts/lib/skills.mjs) — `npm test` échoue tant que la catégorie n'a pas de libellé dédié.

## Code de conduite

- Bienveillance et respect
- Pas de contenu médical dangereux
- Pas de contenu discriminatoire
- Les skills santé doivent **toujours** rappeler de consulter un professionnel
