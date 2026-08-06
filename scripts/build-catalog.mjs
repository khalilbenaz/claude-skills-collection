#!/usr/bin/env node
/**
 * Génère les deux index dérivés de la source de vérité :
 *   - `docs/SKILL_CATALOG.md` : catalogue lisible (par catégorie, avec déclencheurs) ;
 *   - `skills.json`           : index machine-lisible (installeurs, site, outils tiers).
 *
 * Aucune date/horodatage n'est écrit : les artefacts doivent être stables pour que
 * la CI puisse détecter une désynchronisation (`git diff --quiet`).
 *
 * Usage : node scripts/build-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, REPO, PAGES, loadSkills, countsByCategory, categoryMeta } from './lib/skills.mjs';

const skills = loadSkills();
const perCat = countsByCategory(skills);
const cats = Object.keys(perCat).sort((a, b) => perCat[b] - perCat[a] || a.localeCompare(b));
// Ancre GitHub : minuscules, suppression de tout ce qui n'est pas lettre/chiffre/espace/-,
// puis espaces → tirets (l'emoji retiré laisse un tiret de tête, comme sur GitHub).
const anchor = (cat) => {
  const m = categoryMeta(cat);
  return `${m.icon} ${m.label}`.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
};

// ---------- docs/SKILL_CATALOG.md ----------
const md = [];
md.push('# 📚 Catalogue complet des skills');
md.push('');
md.push(`> Fichier **généré** par \`npm run build:catalog\` — ne pas éditer à la main.`);
md.push(`> Source de vérité : les dossiers \`<catégorie>-skills/\`, \`docs/\`, \`meta-skills/\`.`);
md.push('');
md.push(`**${skills.length} skills** répartis dans **${cats.length} catégories**.`);
md.push('');
md.push('## Vue d\'ensemble');
md.push('');
md.push('| Catégorie | Skills | Préfixe des commandes |');
md.push('|-----------|-------:|-----------------------|');
for (const cat of cats) {
  const m = categoryMeta(cat);
  const prefix = skills.find((s) => s.cat === cat).prefix;
  md.push(`| ${m.icon} [${m.label}](#${anchor(cat)}) | ${perCat[cat]} | ${prefix ? `\`/${prefix}-*\`` : '_(aucun — skills globaux)_'} |`);
}
md.push(`| **Total** | **${skills.length}** | |`);
md.push('');
md.push('---');
md.push('');

for (const cat of cats) {
  const m = categoryMeta(cat);
  md.push(`## ${m.icon} ${m.label}`);
  md.push('');
  md.push(`\`${cat}/\` — ${perCat[cat]} skill${perCat[cat] > 1 ? 's' : ''}`);
  md.push('');
  md.push('| Commande | Rôle | Déclencheurs |');
  md.push('|----------|------|--------------|');
  for (const s of skills.filter((x) => x.cat === cat)) {
    const cell = (t) => t.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    const triggers = s.triggers.slice(0, 5).map((t) => `\`${cell(t)}\``).join(', ') || '—';
    md.push(`| [\`/${s.name}\`](${PAGES}/manuals/${s.name}.html) | ${cell(s.summary)} | ${triggers} |`);
  }
  md.push('');
}

md.push('---');
md.push('');
md.push('## Installation');
md.push('');
md.push('```bash');
md.push('# un skill');
md.push('curl -fsSL https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.sh | sh -s -- dev-code-reviewer');
md.push('');
md.push('# toute une catégorie');
md.push('curl -fsSL https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.sh | sh -s -- --category security');
md.push('');
md.push('# la collection complète, en plugin');
md.push('claude  # puis : /plugin marketplace add khalilbenaz/claude-skills-collection');
md.push('```');
md.push('');
md.push(`Manuels en ligne : ${PAGES}/manuals/ · dépôt : ${REPO}`);
md.push('');

writeFileSync(join(ROOT, 'docs', 'SKILL_CATALOG.md'), md.join('\n'));

// ---------- skills.json ----------
const index = {
  repository: REPO,
  total: skills.length,
  categories: cats.map((cat) => {
    const m = categoryMeta(cat);
    const prefix = skills.find((s) => s.cat === cat).prefix;
    return { key: cat, label: m.label, icon: m.icon, prefix, count: perCat[cat] };
  }),
  skills: skills.map((s) => ({
    name: s.name,
    dir: s.dir,
    category: s.cat,
    prefix: s.prefix,
    summary: s.summary,
    description: s.description,
    triggers: s.triggers,
    source: `${s.cat}/${s.dir}/SKILL.md`,
    payload: `skills/${s.name}/SKILL.md`,
    manual: `${PAGES}/manuals/${s.name}.html`,
  })),
};
writeFileSync(join(ROOT, 'skills.json'), JSON.stringify(index, null, 2) + '\n');

// ---------- bloc catégories du README (entre marqueurs) ----------
const BEGIN = '<!-- BEGIN:CATEGORIES';
const END = '<!-- END:CATEGORIES -->';
const readmePath = join(ROOT, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const iBegin = readme.indexOf(BEGIN);
const iEnd = readme.indexOf(END);
if (iBegin === -1 || iEnd === -1) {
  console.error(`✗ marqueurs ${BEGIN} … ${END} absents de README.md — bloc catégories non injecté`);
  process.exit(1);
}
const table = [
  '| Catégorie | Skills | Commandes | Source |',
  '|-----------|-------:|-----------|--------|',
  ...cats.map((cat) => {
    const m = categoryMeta(cat);
    const prefix = skills.find((s) => s.cat === cat).prefix;
    return `| ${m.icon} ${m.label} | ${perCat[cat]} | ${prefix ? `\`/${prefix}-*\`` : '_sans préfixe_'} | [\`${cat}/\`](./${cat}) |`;
  }),
  `| **Total** | **${skills.length}** | | ${cats.length} catégories |`,
].join('\n');
const marker = readme.slice(iBegin, readme.indexOf('-->', iBegin) + 3);
writeFileSync(readmePath, `${readme.slice(0, iBegin)}${marker}\n\n${table}\n\n${readme.slice(iEnd)}`);

console.log(`✓ docs/SKILL_CATALOG.md + skills.json générés (${skills.length} skills, ${cats.length} catégories)`);
