#!/usr/bin/env node
/**
 * Valide les skills SOURCE (`<cat>-skills/`, `docs/`, `meta-skills/`) avant build.
 *
 * ERREURS (bloquantes, exit 1) :
 *   - frontmatter absent ou illisible ;
 *   - clé `name` ou `description` absente/vide ;
 *   - clé de frontmatter inconnue (Claude Code ignore silencieusement le reste) ;
 *   - `name` ≠ nom du dossier ;
 *   - nom non kebab-case, ou nom public préfixé > 64 caractères ;
 *   - description > 1024 caractères (limite Claude Code) ou sur plusieurs lignes ;
 *   - corps vide, ou > MAX_BODY_LINES lignes (budget de contexte) ;
 *   - deux skills avec la même description ;
 *   - collision de nom public entre catégories ;
 *   - lien relatif vers un fichier inexistant ;
 *   - compteur codé en dur (README, index.html, package.json, plugin.json) désynchronisé.
 *
 * AVERTISSEMENTS (non bloquants) :
 *   - description courte (< 80 c.) ou sans terme déclencheur cité ;
 *   - corps très court (< 40 lignes) ;
 *   - CRLF ou espaces en fin de ligne.
 *
 * Usage : node scripts/check-skills.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSkills, countsByCategory, categoryMeta, skillDir } from './lib/skills.mjs';

const ALLOWED_KEYS = new Set(['name', 'description', 'allowed-tools', 'allowed_tools', 'license', 'model']);
const MAX_NAME = 64;
const MAX_DESC = 1024;
const MIN_DESC = 40;
const SHORT_DESC = 80;
const MAX_BODY_LINES = 500;
const SHORT_BODY_LINES = 40;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];
const warnings = [];

const skills = loadSkills();
const byName = new Map();
const byDescription = new Map();

for (const s of skills) {
  const where = s.relPath;

  if (!s.parsed) {
    errors.push(`${where}: frontmatter absent ou illisible`);
    continue;
  }

  // ---- frontmatter
  const unknown = s.keys.filter((k) => !ALLOWED_KEYS.has(k));
  if (unknown.length) {
    errors.push(`${where}: clé(s) de frontmatter non supportée(s) : ${unknown.join(', ')} — Claude Code les ignore, fusionnez l'info dans "description"`);
  }
  for (const k of ['name', 'description']) {
    if (!s.meta[k]) errors.push(`${where}: clé "${k}" absente ou vide`);
  }
  const dupKeys = s.keys.filter((k, i) => s.keys.indexOf(k) !== i);
  if (dupKeys.length) errors.push(`${where}: clé(s) dupliquée(s) dans le frontmatter : ${[...new Set(dupKeys)].join(', ')}`);

  // ---- name
  if (s.meta.name && s.meta.name !== s.dir) {
    errors.push(`${where}: name="${s.meta.name}" ≠ nom du dossier "${s.dir}"`);
  }
  if (!KEBAB.test(s.dir)) {
    errors.push(`${where}: nom de dossier non kebab-case ([a-z0-9] séparés par "-")`);
  }
  if (s.name.length > MAX_NAME) {
    errors.push(`${where}: nom public "${s.name}" trop long (${s.name.length} > ${MAX_NAME} c.)`);
  }
  if (byName.has(s.name)) errors.push(`Collision de nom public "${s.name}" : ${byName.get(s.name)} & ${where}`);
  else byName.set(s.name, where);

  // ---- description
  const desc = s.description;
  if (desc) {
    if (desc.length > MAX_DESC) errors.push(`${where}: description trop longue (${desc.length} > ${MAX_DESC} c.)`);
    else if (desc.length < MIN_DESC) errors.push(`${where}: description trop courte (${desc.length} c., minimum ${MIN_DESC})`);
    else if (desc.length < SHORT_DESC) warnings.push(`${where}: description peu descriptive (${desc.length} c.)`);

    if (/^[>|]/.test(s.meta.description ?? '')) {
      warnings.push(`${where}: description en bloc YAML (> ou |) — préférez une seule ligne`);
    }
    if (!s.triggers.length) {
      warnings.push(`${where}: aucun terme déclencheur cité entre guillemets dans la description`);
    }
    const prev = byDescription.get(desc);
    if (prev) errors.push(`Description identique entre ${prev} et ${where}`);
    else byDescription.set(desc, where);
  }

  // ---- body
  const bodyLines = s.body ? s.body.split(/\r?\n/).length : 0;
  if (!s.body) errors.push(`${where}: corps vide`);
  else if (bodyLines > MAX_BODY_LINES) {
    errors.push(`${where}: corps trop long (${bodyLines} > ${MAX_BODY_LINES} lignes) — découpez ou condensez`);
  } else if (bodyLines < SHORT_BODY_LINES) {
    warnings.push(`${where}: corps très court (${bodyLines} lignes)`);
  }

  if (!/^#\s+\S/m.test(s.body)) warnings.push(`${where}: aucun titre de niveau 1 (# ...) dans le corps`);
  if (s.raw.includes('\r\n')) warnings.push(`${where}: fins de ligne CRLF`);
  if (/[ \t]+$/m.test(s.raw)) warnings.push(`${where}: espaces en fin de ligne`);

  // ---- liens relatifs vers les ressources embarquées du skill
  // (references/, assets/, scripts/, templates/ — les autres chemins relatifs
  //  sont des exemples de documentation dans le corps, pas des liens réels).
  const dir = skillDir(s);
  for (const m of s.body.matchAll(/\]\((\.\/(?:references|assets|scripts|templates)\/[^)\s#]+)/g)) {
    const target = m[1];
    if (!existsSync(join(dir, target))) errors.push(`${where}: ressource embarquée introuvable → ${target}`);
  }
}

// ---- compteurs codés en dur
const perCat = countsByCategory(skills);
const total = skills.length;
const nbCats = Object.keys(perCat).length;
const declared = [
  ['package.json', /"description":\s*"(\d+) professional skills/],
  ['.claude-plugin/plugin.json', /"description":\s*"(\d+) professional skills/],
  ['.claude-plugin/marketplace.json', /"description":\s*"(\d+) professional skills/],
  ['README.md', /\*\*(\d+) skills\*\*/],
  ['index.html', /<title>[^<]*?(\d+)\s+Skills/i],
];
for (const [file, re] of declared) {
  const p = join(ROOT, file);
  if (!existsSync(p)) continue;
  const m = readFileSync(p, 'utf8').match(re);
  if (!m) {
    warnings.push(`${file}: compteur de skills introuvable (motif ${re}) — guard de désynchronisation inactif`);
  } else if (Number(m[1]) !== total) {
    errors.push(`${file}: annonce ${m[1]} skills, la source en contient ${total}`);
  }
}

// ---- rapport
console.log(`Skills source : ${total} dans ${nbCats} catégories`);
const width = Math.max(...Object.keys(perCat).map((c) => c.length));
for (const [cat, n] of Object.entries(perCat).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  console.log(`  ${categoryMeta(cat).icon} ${cat.padEnd(width)}  ${String(n).padStart(3)}`);
}

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
