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

/** Termes déclencheurs cités entre guillemets dans la description. */
export function extractTriggers(desc) {
  const found = [...desc.matchAll(/[«"“]([^»"”]{2,60})[»"”]/g)].map((m) => m[1].trim());
  return [...new Set(found)];
}

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
