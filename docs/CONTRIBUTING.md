# 🤝 Contribuer

Merci de vouloir contribuer ! Voici comment faire.

## Ajouter un nouveau skill

1. **Fork** ce repo
2. **Créez** un dossier dans la bonne catégorie :
   ```
   categorie-skills/nom-du-skill/SKILL.md
   ```
3. **Respectez** le format standard (voir [CREATING_SKILLS.md](./CREATING_SKILLS.md))
4. **Testez** le skill avec au moins 5 phrases de déclenchement
5. **Mettez à jour** le catalogue dans `docs/SKILL_CATALOG.md`
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
| Catégorie | Contenu |
|-----------|---------|
| health-skills | Santé physique |
| psy-skills | Santé mentale |
| dev-skills | Développement |
| productivity-skills | Productivité |
| finance-skills | Finance personnelle |
| education-skills | Apprentissage |
| writing-skills | Rédaction |
| career-skills | Carrière |

Pour une **nouvelle catégorie**, ouvrez d'abord une issue pour en discuter.

## Code de conduite

- Bienveillance et respect
- Pas de contenu médical dangereux
- Pas de contenu discriminatoire
- Les skills santé doivent **toujours** rappeler de consulter un professionnel
