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
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSkills, prefixOf } from './lib/skills.mjs';

const OUT = join(ROOT, 'skills');

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
  // skills/ est un artefact : on le régénère intégralement.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const generated = [];
  const seen = new Map(); // nom public -> source (détection de collision)

  for (const s of loadSkills()) {
    if (!s.parsed) {
      console.warn(`⚠ frontmatter manquant, ignoré : ${s.relPath}`);
      continue;
    }
    if (seen.has(s.name)) {
      throw new Error(`Collision de nom « ${s.name} » : ${seen.get(s.name)} et ${s.relPath}`);
    }
    seen.set(s.name, s.relPath);

    const eol = s.raw.includes('\r\n') ? '\r\n' : '\n';
    const frontmatter = setName(s.frontmatter, s.name);
    const rules = rulesFor(s.cat);
    const rulesBlock = rules ? `${eol}${eol}${eol}${rules.join(eol)}` : '';

    const content =
      `---${eol}${frontmatter.split(/\r?\n/).join(eol)}${eol}---${eol}${eol}` +
      s.body.split(/\r?\n/).join(eol) +
      rulesBlock +
      eol;

    const destDir = join(OUT, s.name);
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'SKILL.md'), content);
    generated.push(s.name);
  }

  console.log(`✓ ${generated.length} skills générés dans skills/ (source unique : <cat>-skills/, docs/, meta-skills/)`);
  return generated;
}

build();
