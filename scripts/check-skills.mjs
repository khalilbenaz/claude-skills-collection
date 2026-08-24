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
 *   - description courte (< 80 c.), sans terme déclencheur cité, ou sans déclencheur anglophone ;
 *   - corps très court (< 40 lignes), sauf exemption justifiée dans SHORT_BODY_OK ;
 *   - CRLF ou espaces en fin de ligne.
 *
 * Usage : node scripts/check-skills.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSkills, countsByCategory, categoryMeta, skillDir, BUNDLES, CORE_CATS, bundleOf, skillsByBundle, estTokens } from './lib/skills.mjs';

const ALLOWED_KEYS = new Set(['name', 'description', 'allowed-tools', 'allowed_tools', 'license', 'model']);
const MAX_NAME = 64;
const MAX_DESC = 1024;
const MIN_DESC = 40;
const SHORT_DESC = 80;
const MAX_BODY_LINES = 500;
const SHORT_BODY_LINES = 40;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Un déclencheur est considéré « anglophone » s'il ne contient ni accent ni mot
// grammatical français : la collection est en français, mais les prompts arrivent
// souvent en anglais — chaque skill doit être atteignable dans les deux langues.
const FR_WORDS = /\b(?:de|des|du|le|la|les|un|une|mon|ma|mes|pour|avec|dans|sur|par|au|aux|est|et|ou|que|qui|quoi|quel|quelle|comment|pourquoi|je|j'ai|ai|c'est|ça|cette|ce|mes|nos|votre|vos|faire|fait|dois|veux)\b/i;
const isEnglishish = (t) => !/[àâäçéèêëîïôöùûüœæ]/i.test(t) && !FR_WORDS.test(t);

/**
 * Skills dont la brièveté est délibérée, pas un oubli.
 *
 * Le seuil de `SHORT_BODY_LINES` sert à repérer les skills laissés à l'état
 * d'ébauche. Un skill dont le sujet EST la concision ne peut pas y satisfaire
 * sans se contredire : chaque ligne ajoutée pour passer le seuil serait
 * exactement le remplissage que le skill interdit.
 *
 * Toute entrée ajoutée ici doit porter sa raison. Par défaut, on étoffe le
 * skill plutôt que de l'exempter.
 */
const SHORT_BODY_OK = new Set([
  // 34 lignes : 8 règles + 3 exemples avant/après. Un skill « ultra concise »
  // de 200 lignes serait une démonstration de l'inverse de ce qu'il enseigne.
  'meta-skills/ultra-concise-mode',
]);

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
    } else if (!s.triggers.some(isEnglishish)) {
      warnings.push(`${where}: aucun déclencheur en anglais — un prompt en anglais ne matchera pas (cf. "Also triggers on …")`);
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
  } else if (bodyLines < SHORT_BODY_LINES && !SHORT_BODY_OK.has(where)) {
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

// ---- partition en bundles
// Chaque catégorie doit appartenir à exactement un bundle : une catégorie
// oubliée serait installable uniquement via le plugin complet (348 skills),
// ce qui vide le découpage de son intérêt.
{
  const cats = [...new Set(skills.map((s) => s.cat))];
  for (const cat of cats) {
    if (CORE_CATS.includes(cat)) continue;
    const hits = BUNDLES.filter((b) => b.cats.includes(cat));
    if (hits.length === 0) {
      errors.push(`catégorie "${cat}" absente de tous les bundles — ajoutez-la à BUNDLES dans scripts/lib/skills.mjs`);
    } else if (hits.length > 1) {
      errors.push(`catégorie "${cat}" présente dans plusieurs bundles : ${hits.map((b) => b.id).join(', ')}`);
    }
  }
  for (const b of BUNDLES) {
    const unknown = b.cats.filter((c) => !cats.includes(c));
    if (unknown.length) errors.push(`bundle "${b.id}" référence une catégorie inexistante : ${unknown.join(', ')}`);
  }
}

// ---- compteurs codés en dur
const perCat = countsByCategory(skills);
const total = skills.length;
const nbCats = Object.keys(perCat).length;
const declared = [
  ['package.json', /"description":\s*"(\d+) professional skills/],
  ['.claude-plugin/marketplace.json', /"description":\s*"(\d+) professional skills/],
  ['README.md', /\*\*(\d+) skills\*\*/],
  ['README.en.md', /\*\*(\d+) skills\*\*/],
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

// ---- coût contexte (estimation, voir estTokens dans lib/skills.mjs)
const byBundle = skillsByBundle(skills);
console.log(`\nCoût contexte permanent (estimation, nom + description) :`);
console.log(`  ${'claude-skills-collection'.padEnd(26)} ${String(skills.length).padStart(3)} skills  ~${estTokens(skills).toLocaleString('fr-FR')} tok`);
for (const b of BUNDLES) {
  console.log(`  ${`claude-skills-${b.id}`.padEnd(26)} ${String(byBundle[b.id].length).padStart(3)} skills  ~${estTokens(byBundle[b.id]).toLocaleString('fr-FR')} tok`);
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
