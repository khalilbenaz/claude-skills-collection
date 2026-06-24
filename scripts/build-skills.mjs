#!/usr/bin/env node
/**
 * Génère le dossier `skills/` (payload du plugin Claude Code) à partir de la
 * SOURCE DE VÉRITÉ UNIQUE : les dossiers `<catégorie>-skills/` + `docs/` + `meta-skills/`.
 *
 * Pour chaque skill source :
 *   - le nom est préfixé par sa catégorie  (ex. dev-skills/docker-composer -> dev-docker-composer)
 *     afin d'éviter les collisions de slash-commands entre catégories ;
 *   - un bloc « Communication Rules » est ajouté en pied, adapté au domaine
 *     (ton concis pour le technique, ton bienveillant + disclaimer pour les domaines humains).
 *
 * `skills/` est entièrement régénéré : ne jamais l'éditer à la main.
 *
 * Usage : node scripts/build-skills.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'skills');

// catégorie source -> préfixe appliqué aux noms de skills
const prefixOf = (cat) => {
  if (cat === 'docs') return 'docs';
  if (cat === 'meta-skills') return ''; // skills globaux : pas de préfixe
  return cat.replace(/-skills$/, '');
};

// Domaines « humains » : ton bienveillant + disclaimer au lieu du ton concis/direct.
const HUMAN = new Set(['psy', 'health', 'social', 'parenting', 'legal']);
// Domaines méta : aucun bloc ajouté (le skill est auto-suffisant).
const META = new Set(['meta-skills']);

const TECH_RULES = [
  '## Communication Rules — MANDATORY',
  '',
  '- Ultra-concise. No filler, no preamble, no pleasantries.',
  '- Never say "happy to help", "sure!", "great question", "let me", or similar.',
  '- Tool first, talk second. Act before explaining.',
  '- Result first. Lead with outcome, not process.',
  '- Stop when done. No summary, no recap, no trailing commentary.',
  '- No politeness wrappers. Direct and blunt.',
  '- Minimum words. If one word works, do not use ten.',
  '- No unsolicited explanations.',
  '- No emoji unless asked.',
];

const HUMAN_RULES = [
  '## Communication Rules',
  '',
  '- Clear and concise; skip filler, but never at the cost of warmth.',
  '- Warm, respectful, non-judgmental tone — meet the person where they are.',
  '- Lead with what matters to the user; avoid unnecessary preamble.',
  '- Plain language; explain only what genuinely helps.',
  '- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.',
  '- No emoji unless the user uses them first.',
];

function rulesFor(cat) {
  if (META.has(cat)) return null;
  return HUMAN.has(prefixOf(cat)) ? HUMAN_RULES : TECH_RULES;
}

// Réécrit (ou insère) la clé `name` dans le frontmatter, en normalisant la casse.
function setName(frontmatter, name) {
  if (/^\s*name\s*:/im.test(frontmatter)) {
    return frontmatter.replace(/^(\s*)name\s*:\s*.*$/im, `name: ${name}`);
  }
  return `name: ${name}\n${frontmatter}`;
}

function build() {
  const cats = readdirSync(ROOT).filter(
    (d) => (d.endsWith('-skills') || d === 'docs') && statSync(join(ROOT, d)).isDirectory()
  );

  // skills/ est un artefact : on le régénère intégralement.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const generated = [];
  const seen = new Map(); // nom préfixé -> source (détection de collision)

  for (const cat of cats.sort()) {
    for (const dir of readdirSync(join(ROOT, cat)).sort()) {
      const srcPath = join(ROOT, cat, dir, 'SKILL.md');
      if (!existsSync(srcPath)) continue;

      const raw = readFileSync(srcPath, 'utf8');
      const eol = raw.includes('\r\n') ? '\r\n' : '\n';
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!m) {
        console.warn(`⚠ frontmatter manquant, ignoré : ${cat}/${dir}`);
        continue;
      }

      const prefix = prefixOf(cat);
      const name = prefix ? `${prefix}-${dir}` : dir;

      if (seen.has(name)) {
        throw new Error(`Collision de nom « ${name} » : ${seen.get(name)} et ${cat}/${dir}`);
      }
      seen.set(name, `${cat}/${dir}`);

      const frontmatter = setName(m[1], name);
      let body = m[2].replace(/^[\r\n]+/, '').replace(/[\s﻿]+$/, ''); // trim début/fin

      const rules = rulesFor(cat);
      const rulesBlock = rules ? `${eol}${eol}${eol}${rules.join(eol)}` : '';

      const content =
        `---${eol}${frontmatter.split(/\r?\n/).join(eol)}${eol}---${eol}${eol}` +
        body.split(/\r?\n/).join(eol) +
        rulesBlock +
        eol;

      const destDir = join(OUT, name);
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'SKILL.md'), content);
      generated.push(name);
    }
  }

  console.log(`✓ ${generated.length} skills générés dans skills/ (source unique : <cat>-skills/, docs/, meta-skills/)`);
  return generated;
}

build();
