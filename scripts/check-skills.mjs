#!/usr/bin/env node
/**
 * Valide les skills SOURCE (<cat>-skills/, docs/, meta-skills/) avant build :
 *   - frontmatter présent, `name` + `description` non vides ;
 *   - `name` du frontmatter == nom du dossier (cohérence) ;
 *   - description suffisamment descriptive (>= 40 caractères) ;
 *   - aucune collision de nom préfixé entre catégories ;
 *   - corps non vide.
 *
 * Sort en code 1 si au moins une erreur. Usage : node scripts/check-skills.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const prefixOf = (cat) => (cat === 'docs' ? 'docs' : cat === 'meta-skills' ? '' : cat.replace(/-skills$/, ''));

const cats = readdirSync(ROOT).filter(
  (d) => (d.endsWith('-skills') || d === 'docs') && statSync(join(ROOT, d)).isDirectory()
);

const errors = [];
const warnings = [];
const seen = new Map();
let count = 0;
const perCat = {};

for (const cat of cats.sort()) {
  for (const dir of readdirSync(join(ROOT, cat)).sort()) {
    const p = join(ROOT, cat, dir, 'SKILL.md');
    if (!existsSync(p)) continue;
    count++;
    perCat[cat] = (perCat[cat] || 0) + 1;
    const where = `${cat}/${dir}`;
    const raw = readFileSync(p, 'utf8');

    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) { errors.push(`${where}: frontmatter absent`); continue; }
    const fm = m[1];
    const body = m[2].trim();

    const nameM = fm.match(/^\s*name\s*:\s*(.+)$/im);
    const descM = fm.match(/^\s*description\s*:\s*([\s\S]*?)(?=^\s*\w[\w-]*\s*:|$)/im);
    const name = nameM ? nameM[1].trim().replace(/^["']|["']$/g, '') : '';
    const desc = descM ? descM[1].replace(/\s+/g, ' ').trim().replace(/^["'>|-]+\s*/, '').replace(/["']$/, '') : '';

    if (!name) errors.push(`${where}: clé "name" absente/vide`);
    else if (name !== dir) warnings.push(`${where}: name="${name}" ≠ dossier "${dir}"`);
    if (!desc) errors.push(`${where}: clé "description" absente/vide`);
    else if (desc.length < 40) warnings.push(`${where}: description courte (${desc.length} c.)`);
    if (!body) errors.push(`${where}: corps vide`);

    const prefix = prefixOf(cat);
    const full = prefix ? `${prefix}-${dir}` : dir;
    if (seen.has(full)) errors.push(`Collision de nom préfixé "${full}": ${seen.get(full)} & ${where}`);
    else seen.set(full, where);
  }
}

console.log(`Skills source : ${count} dans ${Object.keys(perCat).length} catégories`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} avertissement(s) :`);
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.error(`\n✗ ${errors.length} erreur(s) :`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✓ Tous les skills sont valides.');
