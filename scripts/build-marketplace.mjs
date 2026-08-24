#!/usr/bin/env node
/**
 * Génère `.claude-plugin/marketplace.json` à partir de la source.
 *
 * La marketplace publie N+1 plugins qui partagent le même dossier `skills/` :
 *
 *   - `claude-skills-collection` : la collection entière (rétrocompatible —
 *     c'est le nom historique, les installations existantes ne cassent pas).
 *     Aucun champ `skills` : le scan par défaut de `skills/` s'applique.
 *
 *   - `claude-skills-<bundle>`   : un plugin par domaine, avec `source: "./"`
 *     et la liste explicite de ses dossiers. Documenté ainsi : « When several
 *     plugin entries share one skills/ folder at the marketplace root
 *     (source: "./"), list specific subdirectories instead so each entry loads
 *     only its own skills ». Déclarer des sous-dossiers REMPLACE le scan par
 *     défaut — le bundle ne charge donc que ses skills, pas les 348.
 *     `strict: false` : l'entrée de marketplace est la définition complète.
 *     C'est pourquoi `.claude-plugin/plugin.json` ne doit déclarer AUCUN
 *     composant (pas de clé `skills`), sinon le chargement échoue en conflit.
 *
 * Artefact : ne jamais éditer à la main. Source : scripts/lib/skills.mjs (BUNDLES).
 *
 * Usage : node scripts/build-marketplace.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, REPO, PAGES, loadSkills, BUNDLES, skillsByBundle, estTokens } from './lib/skills.mjs';

const OUT = join(ROOT, '.claude-plugin', 'marketplace.json');
const PLUGIN_JSON = join(ROOT, '.claude-plugin', 'plugin.json');

const AUTHOR = { name: 'Khalil BENAZZOU' };
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

function build() {
  const skills = loadSkills();
  const byBundle = skillsByBundle(skills);
  const total = skills.length;

  const entries = [
    {
      name: 'claude-skills-collection',
      description: `The complete collection: ${total} professional skills across ${BUNDLES.length} bundles — development, agents, cloud, data, security, business, and personal life. Install a single bundle instead if you only need one domain.`,
      version: VERSION,
      author: AUTHOR,
      source: './',
      strict: false,
      category: 'productivity',
      homepage: REPO,
      repository: REPO,
      license: 'MIT',
      keywords: ['skills', 'collection', 'all'],
      skills: ['./skills/'],
    },
    ...BUNDLES.map((b) => ({
      name: `claude-skills-${b.id}`,
      displayName: b.label,
      description: `${b.description} (${byBundle[b.id].length} skills)`,
      version: VERSION,
      author: AUTHOR,
      source: './',
      strict: false,
      category: 'productivity',
      homepage: `${PAGES}/#${b.id}`,
      repository: REPO,
      license: 'MIT',
      keywords: b.tags,
      skills: byBundle[b.id].map((s) => `./skills/${s.name}`),
    })),
  ];

  const marketplace = {
    $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
    name: 'claude-skills-collection',
    description: `${total} professional skills for Claude Code, published as ${BUNDLES.length} thematic bundles plus one all-in-one plugin.`,
    owner: { name: AUTHOR.name, url: REPO },
    metadata: { version: VERSION },
    plugins: entries,
  };

  writeFileSync(OUT, JSON.stringify(marketplace, null, 2) + '\n');

  // Garde-fou : avec `strict: false`, l'entrée de marketplace EST la définition
  // complète. Un `.claude-plugin/plugin.json` à la racine entre en conflit dès
  // qu'il existe (le scan implicite de `skills/` compte comme composant déclaré)
  // et TOUS les plugins échouent au chargement. Vérifié sur Claude Code 2.1.241.
  if (existsSync(PLUGIN_JSON)) {
    throw new Error(
      '.claude-plugin/plugin.json ne doit pas exister : les entrées `strict: false` de ' +
        'marketplace.json portent toutes les métadonnées. Sa présence fait échouer le ' +
        'chargement avec « conflicting manifests ».',
    );
  }

  injectBundleTable(skills, byBundle);
  injectBundleCards(byBundle);

  console.log(
    `✓ marketplace.json : 1 plugin complet (${total} skills) + ${BUNDLES.length} bundles ` +
      `[${BUNDLES.map((b) => `${b.id}:${byBundle[b.id].length}`).join(', ')}]`,
  );
}

/**
 * Réécrit le tableau des bundles du README entre les marqueurs BEGIN/END:BUNDLES.
 * Les volumes et le coût contexte restent ainsi alignés sur la source.
 */
function injectBundleTable(skills, byBundle) {
  const BEGIN = '<!-- BEGIN:BUNDLES';
  const END = '<!-- END:BUNDLES -->';
  const path = join(ROOT, 'README.md');
  const md = readFileSync(path, 'utf8');
  const iBegin = md.indexOf(BEGIN);
  const iEnd = md.indexOf(END);
  if (iBegin === -1 || iEnd === -1) {
    console.error(`✗ marqueurs ${BEGIN} … ${END} absents de README.md — tableau des bundles non injecté`);
    process.exit(1);
  }
  const fmt = (n) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
  const rows = BUNDLES.map(
    (b) =>
      `| \`claude-skills-${b.id}\` | ${b.label} | ${byBundle[b.id].length} | ~${fmt(estTokens(byBundle[b.id]))} tok | ${b.description} |`,
  );
  const table = [
    '| Plugin | Domaine | Skills | Contexte permanent | Contenu |',
    '|--------|---------|-------:|-------------------:|---------|',
    ...rows,
    `| \`claude-skills-collection\` | Tout | ${skills.length} | ~${fmt(estTokens(skills))} tok | Les ${BUNDLES.length} bundles réunis |`,
  ].join('\n');
  const marker = md.slice(iBegin, md.indexOf('-->', iBegin) + 3);
  writeFileSync(path, `${md.slice(0, iBegin)}${marker}\n\n${table}\n\n${md.slice(iEnd)}`);
}

/** Remplace un bloc délimité par des marqueurs HTML dans un fichier. */
function injectBlock(file, beginTag, endTag, body) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const iBegin = src.indexOf(beginTag);
  const iEnd = src.indexOf(endTag);
  if (iBegin === -1 || iEnd === -1) {
    console.error(`✗ marqueurs ${beginTag} … ${endTag} absents de ${file} — bloc non injecté`);
    process.exit(1);
  }
  const marker = src.slice(iBegin, src.indexOf('-->', iBegin) + 3);
  writeFileSync(path, `${src.slice(0, iBegin)}${marker}\n${body}\n        ${src.slice(iEnd)}`);
}

/** Grille des bundles de la landing page (index.html). */
function injectBundleCards(byBundle) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cards = BUNDLES.map((b) => {
    const n = byBundle[b.id].length;
    const tok = estTokens(byBundle[b.id]).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
    return [
      '        <div class="cat-card fade-in">',
      '            <div class="cat-header">',
      `                <div class="cat-icon">${b.icon}</div>`,
      `                <div class="cat-count">${n} skills</div>`,
      '            </div>',
      `            <div class="cat-name">${esc(b.label)}</div>`,
      `            <div class="cat-desc">${esc(b.description)}</div>`,
      `            <div class="cat-desc" style="margin-top:0.75rem;font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--accent-light);">/plugin install claude-skills-${b.id}</div>`,
      `            <div class="cat-desc" style="margin-top:0.35rem;font-size:0.75rem;">~${tok} tokens de contexte</div>`,
      '        </div>',
    ].join('\n');
  }).join('\n');
  injectBlock('index.html', '<!-- BEGIN:BUNDLES', '<!-- END:BUNDLES -->', cards);
}

build()
