#!/usr/bin/env node
/**
 * Tests des scripts de build (sans dépendance externe) : node scripts/test.mjs
 * Couvre le parsing du frontmatter, l'extraction des déclencheurs, les règles de
 * nommage public, et la cohérence des artefacts générés avec la source.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, loadSkills, parseSkillFile, extractTriggers, summaryOf, prefixOf, countsByCategory, categoryMeta, categoryDirs,
} from './lib/skills.mjs';

let passed = 0;
const failures = [];
const t = (label, fn) => {
  try { fn(); passed++; } catch (e) { failures.push(`${label} → ${e.message}`); }
};
const eq = (a, b, msg = '') => {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg} attendu ${sb}, obtenu ${sa}`);
};
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---------- parseSkillFile ----------
t('parseSkillFile : frontmatter + corps', () => {
  const r = parseSkillFile('---\nname: foo\ndescription: bar\n---\n\n# Titre\n\ncorps\n');
  eq(r.meta.name, 'foo');
  eq(r.meta.description, 'bar');
  eq(r.keys, ['name', 'description']);
  eq(r.body, '# Titre\n\ncorps');
});

t('parseSkillFile : description multi-lignes replliée', () => {
  const r = parseSkillFile('---\nname: foo\ndescription: début\n  suite\n---\ncorps\n');
  eq(r.meta.description, 'début suite');
});

t('parseSkillFile : guillemets retirés', () => {
  const r = parseSkillFile('---\nname: foo\ndescription: "avec guillemets"\n---\ncorps\n');
  eq(r.meta.description, 'avec guillemets');
});

t('parseSkillFile : frontmatter absent → null', () => {
  eq(parseSkillFile('# pas de frontmatter\n'), null);
});

t('parseSkillFile : clés dupliquées visibles dans keys', () => {
  const r = parseSkillFile('---\nname: a\nname: b\ndescription: d\n---\nx\n');
  eq(r.keys, ['name', 'name', 'description']);
});

// ---------- déclencheurs / résumé ----------
t('extractTriggers : guillemets droits et typographiques, dédupliqués', () => {
  eq(extractTriggers('X. Se déclenche avec "rate limit", «throttling», “rate limit”.'), ['rate limit', 'throttling']);
});

t('summaryOf : coupe avant la liste de déclencheurs', () => {
  eq(summaryOf('Rôle du skill — détails. Se déclenche avec "x".'), 'Rôle du skill — détails.');
  eq(summaryOf('Sans déclencheur.'), 'Sans déclencheur.');
});

// ---------- nommage ----------
t('prefixOf : docs, meta-skills, catégories', () => {
  eq(prefixOf('dev-skills'), 'dev');
  eq(prefixOf('docs'), 'docs');
  eq(prefixOf('meta-skills'), '');
});

// ---------- source ----------
const skills = loadSkills();

t('loadSkills : au moins 300 skills chargés', () => {
  ok(skills.length >= 300, `seulement ${skills.length} skills chargés`);
});

t('loadSkills : noms publics uniques', () => {
  const dup = skills.map((s) => s.name).filter((n, i, a) => a.indexOf(n) !== i);
  eq(dup, [], 'noms publics dupliqués :');
});

t('loadSkills : nom public = préfixe + dossier', () => {
  for (const s of skills) {
    eq(s.name, s.prefix ? `${s.prefix}-${s.dir}` : s.dir, `${s.relPath} :`);
  }
});

t('categoryMeta : chaque catégorie source a un libellé dédié', () => {
  const missing = categoryDirs().filter((c) => categoryMeta(c).icon === '📦');
  eq(missing, [], 'catégories sans métadonnées :');
});

// ---------- artefacts ----------
t('skills/ : un payload par skill source', () => {
  const missing = skills.filter((s) => !existsSync(join(ROOT, 'skills', s.name, 'SKILL.md'))).map((s) => s.name);
  eq(missing, [], 'payloads manquants (lancez npm run build) :');
});

t('skills/ : le frontmatter du payload porte le nom public', () => {
  for (const s of skills.slice(0, 25)) {
    const p = parseSkillFile(readFileSync(join(ROOT, 'skills', s.name, 'SKILL.md'), 'utf8'));
    eq(p.meta.name, s.name, `${s.name} :`);
  }
});

t('manuals/skills.index : 3 colonnes, une ligne par skill', () => {
  const lines = readFileSync(join(ROOT, 'manuals', 'skills.index'), 'utf8').trim().split('\n');
  eq(lines.length, skills.length, 'nombre de lignes :');
  for (const l of lines) ok(l.split(/\s+/).length === 3, `ligne mal formée : ${l}`);
});

t('skills.json : total et catégories cohérents avec la source', () => {
  const idx = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
  eq(idx.total, skills.length, 'total :');
  eq(idx.skills.length, skills.length, 'entrées :');
  eq(idx.categories.length, Object.keys(countsByCategory(skills)).length, 'catégories :');
});

t('docs/SKILL_CATALOG.md : annonce le bon total', () => {
  const md = readFileSync(join(ROOT, 'docs', 'SKILL_CATALOG.md'), 'utf8');
  const m = md.match(/\*\*(\d+) skills\*\*/);
  ok(m, 'total introuvable dans le catalogue');
  eq(Number(m[1]), skills.length, 'total du catalogue :');
});

// ---------- rapport ----------
if (failures.length) {
  console.error(`✗ ${failures.length} test(s) en échec sur ${passed + failures.length} :`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`✓ ${passed} tests OK`);
