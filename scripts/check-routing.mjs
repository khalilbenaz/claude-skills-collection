#!/usr/bin/env node
/**
 * Lint de ROUTAGE : détecte les skills que Claude ne peut pas départager.
 *
 * `check-skills.mjs` valide la forme d'un skill pris isolément. Ce script valide
 * la propriété qui compte vraiment dans une collection de plusieurs centaines de
 * skills : pour un prompt donné, un seul skill doit être le candidat évident.
 * Le nom et la description de chaque skill installé sont les seules informations
 * dont dispose le modèle au moment de choisir — deux skills qui se ressemblent
 * là-dessus se font concurrence à chaque session.
 *
 * ERREURS (bloquantes) :
 *   - deux skills partagent ≥ MAX_SHARED_TRIGGERS déclencheurs cités ;
 *   - deux skills ont le même nom de dossier dans deux catégories différentes.
 *
 * AVERTISSEMENTS :
 *   - résumés (description hors déclencheurs) très proches ;
 *   - déclencheur si générique qu'il capte tout ("code", "API", "data"…).
 *
 * Les paires légitimes se déclarent dans scripts/routing-allowlist.json, avec
 * une justification écrite : l'exception est explicite, pas silencieuse.
 *
 * Usage : node scripts/check-routing.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSkills, normalizeTrigger } from './lib/skills.mjs';

const ALLOWLIST_PATH = join(ROOT, 'scripts', 'routing-allowlist.json');
const MAX_SHARED_TRIGGERS = 2; // à partir de 2, l'ambiguïté n'est plus un hasard
const SUMMARY_SIMILARITY = 0.6;

// Termes trop génériques pour discriminer : ils matchent la moitié des prompts
// techniques et tirent le skill vers des sujets qu'il ne traite pas.
const TOO_GENERIC = new Set([
  'code', 'api', 'data', 'test', 'tests', 'app', 'application', 'projet', 'project',
  'web', 'base de donnees', 'database', 'script', 'service', 'server', 'serveur',
  'design', 'architecture', 'performance', 'securite', 'security', 'debug',
]);

const STOP = new Set([
  'de', 'des', 'du', 'le', 'la', 'les', 'un', 'une', 'et', 'ou', 'avec', 'pour', 'dans',
  'sur', 'par', 'au', 'aux', 'en', 'a', 'the', 'and', 'or', 'for', 'with', 'to', 'of',
  'un', 'sa', 'son', 'ses', 'ce', 'cet', 'cette', 'plus', 'tout', 'tous', 'toute',
]);

const words = (text) =>
  new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter);
};

const allowlist = existsSync(ALLOWLIST_PATH)
  ? JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
  : { pairs: [] };
const pairKey = (a, b) => [a, b].sort().join(' <-> ');
const allowed = new Map((allowlist.pairs ?? []).map((p) => [pairKey(p.a, p.b), p.reason]));
const usedAllowances = new Set();

const errors = [];
const warnings = [];
const skills = loadSkills();

// ---- collision de nom de dossier entre catégories
const byDir = new Map();
for (const s of skills) {
  if (!byDir.has(s.dir)) byDir.set(s.dir, []);
  byDir.get(s.dir).push(s);
}
for (const [dir, group] of byDir) {
  if (group.length < 2) continue;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const key = pairKey(group[i].name, group[j].name);
      if (allowed.has(key)) {
        usedAllowances.add(key);
        continue;
      }
      errors.push(
        `nom de dossier "${dir}" partagé par ${group[i].relPath} et ${group[j].relPath} — ` +
          `seul le préfixe de catégorie les distingue. Renommez, ou déclarez la paire dans routing-allowlist.json.`,
      );
    }
  }
}

// ---- déclencheurs partagés & résumés proches
const prepared = skills.map((s) => ({
  s,
  triggers: new Set(s.triggers.map(normalizeTrigger)),
  summaryWords: words(s.summary || s.description),
}));

for (let i = 0; i < prepared.length; i++) {
  for (let j = i + 1; j < prepared.length; j++) {
    const A = prepared[i];
    const B = prepared[j];
    const key = pairKey(A.s.name, B.s.name);
    const shared = [...A.triggers].filter((t) => B.triggers.has(t));

    if (shared.length >= MAX_SHARED_TRIGGERS) {
      if (allowed.has(key)) {
        usedAllowances.add(key);
      } else {
        errors.push(
          `${A.s.name} et ${B.s.name} partagent ${shared.length} déclencheurs : ` +
            `${shared.map((t) => `"${t}"`).join(', ')} — un prompt les contenant est ambigu.`,
        );
      }
      continue;
    }

    const sim = jaccard(A.summaryWords, B.summaryWords);
    if (sim >= SUMMARY_SIMILARITY && !allowed.has(key)) {
      warnings.push(`${A.s.name} et ${B.s.name} : résumés proches (${sim.toFixed(2)}) — vérifiez qu'ils ne se recouvrent pas.`);
    } else if (sim >= SUMMARY_SIMILARITY) {
      usedAllowances.add(key);
    }
  }
}

// ---- déclencheurs trop génériques
for (const { s, triggers } of prepared) {
  const generic = [...triggers].filter((t) => TOO_GENERIC.has(t));
  if (generic.length) {
    warnings.push(`${s.name}: déclencheur(s) trop génériques ${generic.map((t) => `"${t}"`).join(', ')} — précisez.`);
  }
}

// ---- allowlist obsolète
for (const [key, reason] of allowed) {
  if (!usedAllowances.has(key)) {
    warnings.push(`routing-allowlist.json : la paire "${key}" n'est plus ambiguë (« ${reason} ») — retirez l'entrée.`);
  }
}

console.log(`Routage : ${skills.length} skills, ${allowed.size} paire(s) autorisée(s) explicitement.`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} avertissement(s) :`);
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.error(`\n✗ ${errors.length} ambiguïté(s) de routage :`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✓ Aucune ambiguïté de routage bloquante.');
