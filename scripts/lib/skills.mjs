/**
 * Chargeur commun des skills SOURCE — utilisé par check-skills, build-skills,
 * build-manuals et build-catalog pour éviter quatre parsings divergents.
 *
 * Source de vérité : `<cat>-skills/`, `docs/`, `meta-skills/`.
 * Le nom public est préfixé par la catégorie (sauf `meta-skills/`, global).
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');

export const REPO = 'https://github.com/khalilbenaz/claude-skills-collection';
export const RAW = 'https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main';
export const PAGES = 'https://khalilbenaz.github.io/claude-skills-collection';

export const CATEGORY_META = {
  'agent-skills':         { label: 'Agents IA',        icon: '🤖', color: '#7c5cfc' },
  'ai-ml-skills':         { label: 'AI / ML',          icon: '🧠', color: '#9b7fff' },
  'api-gateway-skills':   { label: 'API Gateway',      icon: '🚪', color: '#60a5fa' },
  'arabic-skills':        { label: 'Arabe / Maroc',    icon: '🌍', color: '#34d399' },
  'automation-skills':    { label: 'Automatisation',   icon: '⚙️', color: '#fb923c' },
  'business-skills':      { label: 'Business',         icon: '💼', color: '#fbbf24' },
  'career-skills':        { label: 'Carrière',         icon: '🎯', color: '#f472b6' },
  'cloud-skills':         { label: 'Cloud',            icon: '☁️', color: '#22d3ee' },
  'communication-skills': { label: 'Communication',    icon: '🗣️', color: '#f87171' },
  'data-skills':          { label: 'Data',             icon: '📊', color: '#34d399' },
  'database-skills':      { label: 'Bases de données', icon: '🗄️', color: '#60a5fa' },
  'dev-skills':           { label: 'Développement',    icon: '💻', color: '#7c5cfc' },
  'devops-skills':        { label: 'DevOps',           icon: '🔁', color: '#fb923c' },
  'docs-skills':          { label: 'Documentation',    icon: '📄', color: '#8888a0' },
  'docs':                 { label: 'Documentation',    icon: '📄', color: '#8888a0' },
  'education-skills':     { label: 'Éducation',        icon: '🎓', color: '#fbbf24' },
  'finance-skills':       { label: 'Finance',          icon: '💰', color: '#34d399' },
  'freelance-skills':     { label: 'Freelance',        icon: '🧾', color: '#f472b6' },
  'health-skills':        { label: 'Santé',            icon: '🩺', color: '#f87171' },
  'iot-skills':           { label: 'IoT',              icon: '📡', color: '#22d3ee' },
  'legal-skills':         { label: 'Juridique',        icon: '⚖️', color: '#8888a0' },
  'linux-skills':         { label: 'Linux',            icon: '🐧', color: '#fbbf24' },
  'management-skills':    { label: 'Management',       icon: '📋', color: '#60a5fa' },
  'marketing-skills':     { label: 'Marketing',        icon: '📣', color: '#f472b6' },
  'meta-skills':          { label: 'Méta',             icon: '🧩', color: '#9b7fff' },
  'networking-skills':    { label: 'Réseaux',          icon: '🌐', color: '#22d3ee' },
  'parenting-skills':     { label: 'Parentalité',      icon: '👨‍👩‍👧', color: '#fb923c' },
  'productivity-skills':  { label: 'Productivité',     icon: '⏱️', color: '#34d399' },
  'prompt-skills':        { label: 'Prompting',        icon: '✍️', color: '#9b7fff' },
  'psy-skills':           { label: 'Bien-être',        icon: '🧘', color: '#f472b6' },
  'security-skills':      { label: 'Sécurité',         icon: '🔒', color: '#f87171' },
  'social-skills':        { label: 'Relations',        icon: '🤝', color: '#fbbf24' },
  'testing-skills':       { label: 'Tests',            icon: '🧪', color: '#34d399' },
  'travel-skills':        { label: 'Voyage',           icon: '✈️', color: '#22d3ee' },
  'writing-skills':       { label: 'Écriture',         icon: '🖊️', color: '#9b7fff' },
};

export const categoryMeta = (cat) => CATEGORY_META[cat] || { label: cat, icon: '📦', color: '#8888a0' };

/** Préfixe appliqué aux noms publics ; `meta-skills/` reste global (pas de préfixe). */
export const prefixOf = (cat) => (cat === 'docs' ? 'docs' : cat === 'meta-skills' ? '' : cat.replace(/-skills$/, ''));

/** Dossiers de catégories présents à la racine, triés. */
export function categoryDirs() {
  return readdirSync(ROOT)
    .filter((d) => (d.endsWith('-skills') || d === 'docs') && statSync(join(ROOT, d)).isDirectory())
    .sort();
}

/** Parse un SKILL.md : frontmatter brut, paires clé/valeur de premier niveau, corps. */
export function parseSkillFile(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const frontmatter = m[1];
  const body = m[2].replace(/^[\r\n]+/, '').replace(/[\s﻿]+$/, '');
  const keys = [];
  const meta = {};
  let current = null;
  for (const line of frontmatter.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) {
      current = kv[1];
      keys.push(current);
      meta[current] = kv[2].trim().replace(/^["']|["']$/g, '');
    } else if (current && /^\s+\S/.test(line)) {
      meta[current] = `${meta[current]} ${line.trim()}`.trim();
    }
  }
  return { frontmatter, body, meta, keys };
}

/**
 * Termes déclencheurs cités entre guillemets dans la description.
 *
 * Le contenu capturé doit comporter au moins une lettre ou un chiffre : sans ça,
 * la séparation `"terme a", "terme b"` produit un faux déclencheur `, ` (le
 * guillemet fermant du premier et l'ouvrant du second forment une paire valide).
 */
export function extractTriggers(desc) {
  const found = [...desc.matchAll(/[«"“]([^»"”]{2,60})[»"”]/g)]
    .map((m) => m[1].trim())
    .filter((t) => /[\p{L}\p{N}]/u.test(t));
  return [...new Set(found)];
}

/** Forme normalisée d'un déclencheur, pour comparer deux skills entre eux. */
export const normalizeTrigger = (t) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

/** Résumé = description tronquée avant la liste de déclencheurs. */
export function summaryOf(desc) {
  const cut = desc.split(/\s+(?:À utiliser|A utiliser|Se déclenche|Use when|Trigger)/i)[0];
  return cut.replace(/\s*[—–-]\s*$/, '').trim();
}

/**
 * Charge tous les skills source.
 * @returns {Array<{cat,dir,name,prefix,path,relPath,raw,frontmatter,body,meta,keys,description,summary,triggers,parsed}>}
 */
export function loadSkills() {
  const skills = [];
  for (const cat of categoryDirs()) {
    for (const dir of readdirSync(join(ROOT, cat)).sort()) {
      const path = join(ROOT, cat, dir, 'SKILL.md');
      if (!existsSync(path)) continue;
      const raw = readFileSync(path, 'utf8');
      const parsed = parseSkillFile(raw);
      const prefix = prefixOf(cat);
      const dirName = dir;
      const description = parsed?.meta.description ?? '';
      skills.push({
        cat,
        dir: dirName,
        prefix,
        name: prefix ? `${prefix}-${dirName}` : dirName,
        path,
        relPath: `${cat}/${dirName}`,
        raw,
        parsed,
        frontmatter: parsed?.frontmatter ?? '',
        body: parsed?.body ?? '',
        meta: parsed?.meta ?? {},
        keys: parsed?.keys ?? [],
        description,
        summary: summaryOf(description),
        triggers: extractTriggers(description),
      });
    }
  }
  return skills;
}

/** { cat: nombre de skills }, ordre alphabétique de catégorie. */
export function countsByCategory(skills) {
  const out = {};
  for (const s of skills) out[s.cat] = (out[s.cat] || 0) + 1;
  return out;
}

/** Résout un dossier local depuis un skill (pour la validation des liens relatifs). */
export const skillDir = (s) => dirname(s.path);

/* ------------------------------------------------------------------ *
 * Bundles — plugins thématiques publiés par la même marketplace.
 *
 * Installer les 348 skills d'un coup impose au contexte de Claude Code
 * un index de 348 entrées, dont l'essentiel est hors-sujet pour un
 * utilisateur donné. Chaque bundle est une entrée `plugins[]` distincte
 * de `.claude-plugin/marketplace.json`, avec `source: "./"` et la liste
 * explicite des dossiers de `skills/` qui le composent — le pattern
 * documenté pour plusieurs plugins partageant un même `skills/` à la
 * racine de la marketplace.
 *
 * `cats` partitionne les catégories : chaque catégorie appartient à
 * exactement un bundle (garanti par check-skills). `meta-skills/` est la
 * seule exception : ces skills (skill-router, workflows) sont ajoutés à
 * tous les bundles.
 * ------------------------------------------------------------------ */

/** Catégories ajoutées à chaque bundle (skills transverses). */
export const CORE_CATS = ['meta-skills'];

export const BUNDLES = [
  {
    id: 'dev',
    icon: '💻',
    label: 'Développement & tests',
    tags: ['development', 'testing', 'architecture', 'frontend', 'backend'],
    cats: ['dev-skills', 'testing-skills', 'docs'],
    description:
      'Skills de développement : langages et frameworks, architecture, API, tests, performance, debug, documentation.',
  },
  {
    id: 'agents',
    icon: '🤖',
    label: 'Agents IA, LLM & prompting',
    tags: ['ai', 'agents', 'llm', 'prompting', 'mcp'],
    cats: ['agent-skills', 'ai-ml-skills', 'prompt-skills'],
    description:
      'Conception d’agents et de systèmes multi-agents, serveurs MCP, orchestration LLM, RAG, fine-tuning, ingénierie de prompts.',
  },
  {
    id: 'cloud-ops',
    icon: '☁️',
    label: 'Cloud, DevOps & réseaux',
    tags: ['cloud', 'devops', 'kubernetes', 'linux', 'networking'],
    cats: [
      'cloud-skills',
      'devops-skills',
      'linux-skills',
      'networking-skills',
      'iot-skills',
      'api-gateway-skills',
      'automation-skills',
    ],
    description:
      'AWS/Azure/GCP, Kubernetes, Terraform, CI/CD, administration Linux, réseaux, API gateways, automatisation et IoT.',
  },
  {
    id: 'data',
    icon: '📊',
    label: 'Data & bases de données',
    tags: ['data', 'database', 'sql', 'analytics', 'etl'],
    cats: ['data-skills', 'database-skills'],
    description:
      'Modélisation et optimisation de bases (Postgres, SQL Server, MongoDB, Redis…), pipelines ETL, dbt, Kafka, BI et qualité de données.',
  },
  {
    id: 'security',
    icon: '🔒',
    label: 'Sécurité',
    tags: ['security', 'appsec', 'compliance', 'threat-modeling'],
    cats: ['security-skills'],
    description:
      'Threat modeling, durcissement d’API, audit de dépendances, réponse à incident, conformité et architecture zero-trust.',
  },
  {
    id: 'business',
    icon: '💼',
    label: 'Business, carrière & écriture',
    tags: ['business', 'career', 'marketing', 'management', 'writing'],
    cats: [
      'business-skills',
      'career-skills',
      'freelance-skills',
      'marketing-skills',
      'management-skills',
      'communication-skills',
      'writing-skills',
      'productivity-skills',
    ],
    description:
      'Propositions commerciales, CV et entretiens, freelancing, marketing et SEO, management d’équipe, rédaction et productivité.',
  },
  {
    id: 'life',
    icon: '🌱',
    label: 'Santé, bien-être & vie quotidienne',
    tags: ['health', 'wellbeing', 'personal', 'education', 'finance'],
    cats: [
      'health-skills',
      'psy-skills',
      'parenting-skills',
      'social-skills',
      'education-skills',
      'legal-skills',
      'finance-skills',
      'travel-skills',
      'arabic-skills',
    ],
    description:
      'Suivi de santé, bien-être psychologique, parentalité, relations, apprentissage, budget personnel, démarches juridiques et voyage. Accompagnement, jamais un avis professionnel.',
  },
];

/** id du bundle contenant une catégorie donnée, ou null (meta = tous). */
export function bundleOf(cat) {
  if (CORE_CATS.includes(cat)) return null;
  return BUNDLES.find((b) => b.cats.includes(cat))?.id ?? null;
}

/** { bundleId: Skill[] } — les skills `meta` sont ajoutés à chaque bundle. */
export function skillsByBundle(skills) {
  const core = skills.filter((s) => CORE_CATS.includes(s.cat));
  const out = {};
  for (const b of BUNDLES) {
    out[b.id] = [...skills.filter((s) => b.cats.includes(s.cat)), ...core].sort((a, z) =>
      a.name.localeCompare(z.name),
    );
  }
  return out;
}

/**
 * Coût contexte permanent d'un lot de skills, en tokens.
 *
 * Le nom + la description de CHAQUE skill installé sont injectés dans le
 * contexte de toutes les sessions, que le skill serve ou non. CALIB est calé
 * sur les mesures réelles de `claude plugin details` (Claude Code 2.1.241) :
 * 1 784 tok pour le bundle security, 18 283 pour dev, 55 795 pour la collection
 * complète — soit un facteur stable de ~1,5 sur l'estimation caractères/4
 * (surcoût de mise en forme du bloc injecté).
 */
export const CALIB = 1.5;
export const estTokens = (list) =>
  Math.round(CALIB * list.reduce((n, s) => n + (s.name.length + s.description.length) / 4 + 12, 0));
