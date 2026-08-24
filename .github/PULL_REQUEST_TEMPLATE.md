## Ce que change cette PR

<!-- Une ou deux phrases. Si c'est un nouveau skill, dites quelle tâche il couvre. -->

## Checklist

- [ ] J'ai édité la **source** (`<catégorie>-skills/`, `docs/`, `meta-skills/`), pas les artefacts générés (`skills/`, `manuals/`, `docs/SKILL_CATALOG.md`, `skills.json`, `.claude-plugin/marketplace.json`).
- [ ] `npm run build` passe et les artefacts régénérés sont committés.
- [ ] `npm test` passe.
- [ ] `npm run check:routing` passe — les déclencheurs de mon skill n'entrent pas en collision avec un skill existant.
- [ ] Les déclencheurs sont bilingues (`Se déclenche avec …` + `Also triggers on …`).

<!--
Rappel : le nom et la description de chaque skill sont chargés dans le contexte de TOUTES
les sessions de ceux qui installent la collection. Une description de 300 caractères coûte
~110 tokens permanents à chaque utilisateur. Écrivez-la dense.
-->
