#!/usr/bin/env node
/**
 * Génère un manuel d'utilisation HTML pour chaque skill (manuals/<name>.html)
 * + un catalogue cherchable (manuals/index.html), à partir des SKILL.md.
 * Aucune dépendance : renderer markdown minimal intégré.
 *
 * Usage : node scripts/build-manuals.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'manuals');
const REPO = 'https://github.com/khalilbenaz/claude-skills-collection';
const RAW = 'https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main';

const CATEGORY_META = {
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

// Apps en ligne associées à certains skills
const LIVE_APPS = {
  'cv-builder': {
    url: 'https://cv-builder-c9z.pages.dev/',
    label: 'CV Builder — Créez votre CV en ligne',
    desc: 'Application web gratuite : plusieurs styles de CV, photo de profil, export PDF. Aucune installation requise.',
  },
};

// Cas d'usage multi-skills — chaque nom est validé contre les skills existants au build
const USE_CASES = [
  { theme: '💻 Développement', cases: [
    { icon: '🚀', title: 'Lancer un MVP SaaS', goal: 'Passer de l\'idée au produit déployé', steps: [
      ['project-kickstart', 'Cadrage du projet'], ['system-design-helper', 'Architecture'], ['rest-api-designer', 'API REST'], ['postgres-expert', 'Base de données'], ['nextjs-guide', 'Frontend'], ['cicd-pipeline-builder', 'CI/CD'] ] },
    { icon: '🐛', title: 'Résoudre un incident en production', goal: 'Du symptôme au post-mortem', steps: [
      ['log-analyzer', 'Analyse des logs'], ['bug-debugger', 'Diagnostic'], ['performance-profiler', 'Profiling'], ['incident-postmortem-guide', 'Post-mortem blameless'] ] },
    { icon: '🔄', title: 'Refactorer un code legacy', goal: 'Moderniser sans tout casser', steps: [
      ['clean-architecture-guide', 'Architecture cible'], ['design-patterns-advisor', 'Patterns'], ['unit-test-generator', 'Filet de sécurité'], ['test-coverage-analyzer', 'Couverture'], ['technical-debt-manager', 'Plan de dette'] ] },
    { icon: '📱', title: 'Créer une app mobile', goal: 'Cross-platform du design au store', steps: [
      ['mobile-app-architect', 'Architecture mobile'], ['flutter-helper', 'Développement Flutter'], ['ui-design-system-builder', 'Design system'], ['integration-test-builder', 'Tests'] ] },
    { icon: '🌐', title: 'Site web rapide et accessible', goal: 'Performance, accessibilité et SEO', steps: [
      ['nextjs-guide', 'Framework'], ['tailwind-expert', 'Styles'], ['web-performance-optimizer', 'Core Web Vitals'], ['accessibility-checker', 'WCAG'], ['seo-optimizer', 'Référencement'] ] },
    { icon: '🔌', title: 'Publier une API publique', goal: 'Contrat, doc, tests et quotas', steps: [
      ['rest-api-designer', 'Design'], ['openapi-contract-first', 'Contrat OpenAPI'], ['api-doc-generator', 'Documentation'], ['api-testing-expert', 'Tests'], ['rate-limiter-designer', 'Quotas'] ] },
  ]},
  { theme: '🤖 Agents IA', cases: [
    { icon: '🧩', title: 'Construire un système multi-agents', goal: 'Orchestration, mémoire, outils et tests', steps: [
      ['agent-task-decomposer', 'Décomposition'], ['multi-agent-orchestrator', 'Architecture'], ['agent-memory-designer', 'Mémoire'], ['mcp-server-builder', 'Tools MCP'], ['agent-testing-framework', 'Tests'] ] },
    { icon: '📚', title: 'Chatbot RAG d\'entreprise', goal: 'Répondre depuis vos documents internes', steps: [
      ['rag-pipeline-designer', 'Pipeline RAG'], ['llm-integration-guide', 'Intégration LLM'], ['prompt-engineering-pro', 'Prompts'], ['agent-evaluation-framework', 'Évaluation'] ] },
    { icon: '🛠️', title: 'Créer un serveur MCP', goal: 'Donner de nouveaux outils à Claude', steps: [
      ['mcp-server-builder', 'Serveur MCP'], ['tool-calling-architect', 'Design des tools'], ['agent-testing-framework', 'Tests'] ] },
    { icon: '🎙️', title: 'Agent vocal de support client', goal: 'Voix, escalade humaine, supervision', steps: [
      ['voice-agent-builder', 'Agent vocal'], ['customer-support-agent', 'Logique support'], ['human-in-the-loop-designer', 'Escalade humaine'], ['agent-observability', 'Supervision'] ] },
  ]},
  { theme: '📊 Data & Bases de données', cases: [
    { icon: '🏭', title: 'Pipeline data analytics', goal: 'De la source au dashboard', steps: [
      ['data-pipeline-builder', 'Pipeline'], ['etl-designer', 'ETL'], ['dbt-guide', 'Transformations'], ['dimensional-modeling', 'Modèle en étoile'], ['power-bi-designer', 'Dashboards'] ] },
    { icon: '🐢', title: 'Accélérer une base lente', goal: 'Requêtes, index et cache', steps: [
      ['database-query-optimizer', 'Plans d\'exécution'], ['sql-server-tuner', 'Tuning serveur'], ['caching-strategy', 'Stratégie de cache'], ['redis-patterns', 'Cache Redis'] ] },
    { icon: '🚚', title: 'Migrer une base sans downtime', goal: 'Schéma, données et cohérence', steps: [
      ['database-design-advisor', 'Schéma cible'], ['database-migration-helper', 'Migrations'], ['outbox-pattern-guide', 'Cohérence'], ['data-quality-checker', 'Validation'] ] },
    { icon: '🧠', title: 'Mettre un modèle ML en production', goal: 'Du dataset au déploiement', steps: [
      ['dataset-builder', 'Dataset'], ['feature-engineering-guide', 'Features'], ['ml-experiment-tracker', 'Expériences'], ['model-optimization-guide', 'Optimisation'], ['ml-model-deployer', 'Déploiement'] ] },
  ]},
  { theme: '☁️ Cloud & DevOps', cases: [
    { icon: '✈️', title: 'Migrer vers le cloud', goal: 'Plan, IaC, sécurité et coûts', steps: [
      ['cloud-migration-planner', 'Stratégie'], ['aws-architect', 'Architecture cible'], ['terraform-guide', 'IaC'], ['cloud-security-guide', 'Sécurité'], ['cloud-cost-optimizer', 'FinOps'] ] },
    { icon: '☸️', title: 'Plateforme Kubernetes complète', goal: 'GitOps, monitoring et résilience', steps: [
      ['kubernetes-helper', 'Cluster'], ['helm-chart-builder', 'Charts'], ['argocd-guide', 'GitOps'], ['prometheus-grafana-setup', 'Monitoring'], ['chaos-engineering-guide', 'Résilience'] ] },
    { icon: '🚢', title: 'Déployer un microservice en prod', goal: 'Du conteneur au monitoring', steps: [
      ['docker-composer', 'Conteneurisation'], ['helm-chart-builder', 'Chart Kubernetes'], ['azure-devops-pipeline-advisor', 'CI/CD'], ['health-check-monitor', 'Probes'], ['prometheus-grafana-setup', 'Monitoring'] ] },
    { icon: '🔁', title: 'CI/CD de A à Z', goal: 'Du commit au déploiement sécurisé', steps: [
      ['git-workflow-helper', 'Workflow Git'], ['github-actions-expert', 'Pipelines'], ['integration-test-builder', 'Tests'], ['secrets-scanner', 'Secrets'] ] },
  ]},
  { theme: '🔒 Sécurité & Conformité', cases: [
    { icon: '🛡️', title: 'Audit de sécurité complet', goal: 'Menaces, vulnérabilités, réponse', steps: [
      ['threat-modeling', 'STRIDE'], ['owasp-checker', 'OWASP Top 10'], ['vulnerability-analyzer', 'CVE'], ['pentest-assistant', 'Tests d\'intrusion'], ['incident-response-plan', 'Plan de réponse'] ] },
    { icon: '💳', title: 'Sécuriser une API de paiement', goal: 'Hardening, auth et conformité', steps: [
      ['api-security-hardener', 'Hardening'], ['oauth2-oidc-advisor', 'Auth JWT/OIDC'], ['rate-limiter-designer', 'Rate limiting'], ['dependency-audit', 'Audit CVE'], ['fintech-compliance-checker', 'PCI-DSS'] ] },
    { icon: '📜', title: 'Mise en conformité RGPD', goal: 'Données personnelles et zéro-trust', steps: [
      ['gdpr-checklist', 'Checklist RGPD'], ['compliance-checker', 'Conformité'], ['zero-trust-architect', 'Zéro-trust'], ['security-audit-automation', 'Audits continus'] ] },
    { icon: '🧪', title: 'Stratégie de tests complète', goal: 'Unitaire, E2E, charge et mocks', steps: [
      ['test-strategy-planner', 'Stratégie'], ['unit-test-generator', 'Tests unitaires'], ['cypress-e2e-guide', 'E2E'], ['load-test-planner', 'Charge'], ['mock-designer', 'Mocks'] ] },
  ]},
  { theme: '🔧 Infra, Réseaux & IoT', cases: [
    { icon: '📡', title: 'Projet IoT de bout en bout', goal: 'Du capteur au cloud', steps: [
      ['arduino-project-guide', 'Prototype'], ['mqtt-architect', 'Messaging MQTT'], ['edge-computing-designer', 'Edge'], ['raspberry-pi-setup', 'Passerelle'] ] },
    { icon: '🌐', title: 'Diagnostiquer un problème réseau', goal: 'De la capture au firewall', steps: [
      ['tcp-ip-troubleshooter', 'Diagnostic TCP/IP'], ['dns-expert', 'DNS'], ['wireshark-analyst', 'Analyse de trames'], ['firewall-configurator', 'Firewall'] ] },
    { icon: '🐧', title: 'Durcir un serveur Linux', goal: 'Admin, sécurité et automatisation', steps: [
      ['linux-admin-guide', 'Administration'], ['linux-security-hardener', 'Hardening'], ['systemd-manager', 'Services'], ['bash-scripting-expert', 'Automatisation'] ] },
    { icon: '🚪', title: 'Gateway API d\'entreprise', goal: 'Routage, sécurité et quotas', steps: [
      ['yarp-gateway-designer', 'Gateway YARP'], ['kong-api-gateway', 'Kong'], ['rate-limiter-designer', 'Quotas'], ['api-security-hardener', 'Sécurité'] ] },
    { icon: '⚙️', title: 'Automatiser les process métier', goal: 'No-code et scripts sur mesure', steps: [
      ['n8n-workflow-designer', 'n8n'], ['zapier-workflow-builder', 'Zapier'], ['power-automate-designer', 'Power Automate'], ['script-automation-expert', 'Scripts'] ] },
  ]},
  { theme: '💼 Carrière & Business', cases: [
    { icon: '🎯', title: 'Décrocher un nouveau job', goal: 'CV, LinkedIn, entretien, salaire', steps: [
      ['cv-builder', 'CV percutant'], ['linkedin-optimizer', 'Profil LinkedIn'], ['interview-prep', 'Entretiens'], ['salary-negotiation', 'Négociation'] ] },
    { icon: '🧭', title: 'Réussir sa reconversion', goal: 'Du bilan au portfolio', steps: [
      ['career-transition-planner', 'Plan de transition'], ['learning-roadmap', 'Roadmap'], ['study-planner', 'Planning d\'étude'], ['portfolio-builder', 'Portfolio'] ] },
    { icon: '🧾', title: 'Lancer son activité freelance', goal: 'Tarifs, contrats et facturation', steps: [
      ['freelance-pricing', 'Tarification'], ['client-contract-builder', 'Contrats'], ['invoice-generator', 'Factures'], ['portfolio-builder', 'Portfolio'] ] },
    { icon: '🏆', title: 'Gagner un appel d\'offres', goal: 'De l\'estimation au pitch', steps: [
      ['it-commercial-proposal', 'Proposition'], ['project-estimation-helper', 'Estimation'], ['pitch-deck-designer', 'Pitch deck'], ['presentation-builder', 'Présentation'] ] },
    { icon: '🎤', title: 'Pitcher devant des investisseurs', goal: 'Story, slides et prise de parole', steps: [
      ['storytelling-expert', 'Narratif'], ['pitch-deck-designer', 'Slides'], ['public-speaking-coach', 'Prise de parole'] ] },
    { icon: '📋', title: 'Piloter une équipe agile', goal: 'Sprints, vélocité et rétros', steps: [
      ['sprint-planner', 'Sprints'], ['team-velocity-tracker', 'Vélocité'], ['retro-facilitator', 'Rétrospectives'], ['stakeholder-communicator', 'Communication'] ] },
  ]},
  { theme: '📣 Contenu & Marketing', cases: [
    { icon: '✍️', title: 'Stratégie de contenu', goal: 'Du blog aux réseaux sociaux', steps: [
      ['blog-post-writer', 'Articles'], ['seo-optimizer', 'SEO'], ['content-repurposer', 'Repurposing'], ['social-media-strategist', 'Réseaux sociaux'], ['email-marketing-designer', 'Newsletters'] ] },
    { icon: '🪄', title: 'Maîtriser le prompting', goal: 'Des prompts robustes et optimisés', steps: [
      ['prompt-optimizer', 'Optimisation'], ['mega-prompt-builder', 'Mega-prompts'], ['system-prompt-architect', 'System prompts'], ['chain-of-thought-designer', 'Raisonnement'], ['prompt-debugger', 'Debug'] ] },
    { icon: '🌍', title: 'Contenu pour le marché marocain', goal: 'Arabe, darija et démarches locales', steps: [
      ['arabic-content-writer', 'Contenu arabe'], ['darija-translator', 'Darija'], ['morocco-admin-guide', 'Démarches'] ] },
    { icon: '📄', title: 'Documentation projet professionnelle', goal: 'ADR, API docs et onboarding', steps: [
      ['adr-writer', 'Décisions (ADR)'], ['api-doc-generator', 'Docs API'], ['technical-writing-guide', 'Rédaction'], ['developer-onboarding-builder', 'Onboarding'], ['changelog-writer', 'Changelogs'] ] },
  ]},
  { theme: '🌱 Vie quotidienne', cases: [
    { icon: '💰', title: 'Reprendre ses finances en main', goal: 'Budget, dépenses et épargne', steps: [
      ['budget-tracker', 'Budget'], ['expense-analyzer', 'Analyse'], ['savings-goal-planner', 'Épargne'], ['tax-prep-checklist', 'Impôts'] ] },
    { icon: '🩺', title: 'Préparer une consultation médicale', goal: 'Arriver préparé chez le médecin', steps: [
      ['symptom-tracker', 'Symptômes'], ['medical-history-summary', 'Historique'], ['health-question-builder', 'Questions'], ['doctor-visit-prep', 'Préparation'], ['lab-explainer', 'Analyses'] ] },
    { icon: '🧘', title: 'Prévenir le burnout', goal: 'Évaluer, comprendre, agir', steps: [
      ['burnout-assessment', 'Évaluation'], ['emotional-checkin', 'Check-in'], ['cbt-thought-record', 'TCC'], ['breathing-exercise-guide', 'Respiration'] ] },
    { icon: '🎓', title: 'Préparer un examen', goal: 'Plan, fiches et révisions', steps: [
      ['learning-roadmap', 'Roadmap'], ['study-planner', 'Planning'], ['flashcard-generator', 'Flashcards'], ['exam-prep', 'Révisions'], ['concept-explainer', 'Concepts difficiles'] ] },
    { icon: '✈️', title: 'Organiser un voyage', goal: 'Du visa à la valise', steps: [
      ['trip-planner', 'Itinéraire'], ['visa-checker', 'Visa'], ['travel-budget', 'Budget'], ['packing-checklist', 'Valise'], ['local-phrase-book', 'Phrases locales'] ] },
    { icon: '👨‍👩‍👧', title: 'Organiser la vie de famille', goal: 'Routines et suivi des enfants', steps: [
      ['child-milestone-tracker', 'Développement'], ['screen-time-planner', 'Écrans'], ['bedtime-routine-builder', 'Coucher'], ['homework-helper', 'Devoirs'] ] },
    { icon: '⚖️', title: 'Gérer un litige locatif', goal: 'Droits, courriers et recours', steps: [
      ['tenant-rights-guide', 'Droits'], ['contract-reader', 'Lecture du bail'], ['complaint-letter-writer', 'Courriers'], ['small-claims-prep', 'Recours'] ] },
    { icon: '🤝', title: 'Préparer une conversation difficile', goal: 'Cadre, feedback et résolution', steps: [
      ['difficult-conversation-prep', 'Préparation'], ['feedback-giver', 'Feedback'], ['conflict-resolver', 'Résolution'], ['boundary-setter', 'Limites'] ] },
  ]},
];

// ---------- markdown minimal ----------
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return out;
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const html = [];
  let i = 0;
  let listStack = []; // {type:'ul'|'ol', indent}

  const closeLists = (toIndent = -1) => {
    while (listStack.length && listStack[listStack.length - 1].indent >= toIndent + 1) {
      html.push(`</${listStack.pop().type}>`);
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // code fence
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      closeLists();
      const lang = fence[1];
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      html.push(`<pre><code${lang ? ` class="lang-${lang}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      closeLists();
      const lvl = h[1].length;
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // hr
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { closeLists(); html.push('<hr>'); i++; continue; }

    // table
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      closeLists();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      html.push('<table><thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      closeLists();
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`);
      continue;
    }

    // list item
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)/);
    if (li) {
      const indent = Math.floor(li[1].length / 2);
      const type = /[-*+]/.test(li[2]) ? 'ul' : 'ol';
      while (listStack.length && listStack[listStack.length - 1].indent > indent) html.push(`</${listStack.pop().type}>`);
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent || top.type !== type) {
        if (top && top.indent === indent && top.type !== type) html.push(`</${listStack.pop().type}>`);
        listStack.push({ type, indent });
        html.push(`<${type}>`);
      }
      html.push(`<li>${inline(li[3])}</li>`);
      i++;
      continue;
    }

    // blank
    if (/^\s*$/.test(line)) { closeLists(); i++; continue; }

    // paragraph
    closeLists();
    const buf = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|\s*([-*+]|\d+[.)])\s|\s*>|\s*\|)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    html.push(`<p>${buf.map(inline).join(' ')}</p>`);
  }
  closeLists();
  return html.join('\n');
}

// ---------- frontmatter ----------
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  let current = null;
  for (const l of m[1].split(/\r?\n/)) {
    const kv = l.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) { current = kv[1]; meta[current] = kv[2].replace(/^["']|["']$/g, ''); }
    else if (current && /^\s+/.test(l)) meta[current] += ' ' + l.trim();
  }
  return { meta, body: m[2] };
}

// Extrait les déclencheurs cités ("...") de la description
function extractTriggers(desc) {
  const triggers = [...desc.matchAll(/[«"“]([^»"”]{2,60})[»"”]/g)].map((m) => m[1].trim());
  return [...new Set(triggers)].slice(0, 12);
}

// Coupe la description en résumé (avant "À utiliser" / "Se déclenche")
function summary(desc) {
  const cut = desc.split(/\s+(?:À utiliser|A utiliser|Se déclenche|Use when|Trigger)/i)[0];
  return cut.replace(/\s*[—–-]\s*$/, '').trim();
}

// ---------- collect ----------
const categories = readdirSync(ROOT).filter((d) => d.endsWith('-skills') && statSync(join(ROOT, d)).isDirectory());
categories.push('docs'); // docs/adr-writer est aussi un skill
const skills = [];
for (const cat of categories.sort()) {
  for (const dir of readdirSync(join(ROOT, cat)).sort()) {
    const skillPath = join(ROOT, cat, dir, 'SKILL.md');
    if (!existsSync(skillPath)) continue;
    const raw = readFileSync(skillPath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const name = meta.name || dir;
    const desc = meta.description || '';
    skills.push({ name, dir, cat, desc, body, triggers: extractTriggers(desc), summary: summary(desc) });
  }
}

// ---------- templates ----------
const CSS = `
:root{--bg:#0a0a0f;--bg-card:#12121a;--border:#1e1e30;--text:#e4e4ed;--text-muted:#8888a0;--text-dim:#555570;--accent:#7c5cfc;--accent-light:#9b7fff;--green:#34d399;--cyan:#22d3ee}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.7}
a{color:var(--accent-light)}
nav{position:sticky;top:0;z-index:50;padding:1rem 2rem;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem}
.nav-brand{font-weight:800;color:var(--text);text-decoration:none}.nav-brand span{color:var(--accent-light)}
.nav-links{display:flex;gap:1.5rem;list-style:none;flex-wrap:wrap}
.nav-links a{color:var(--text-muted);text-decoration:none;font-size:.875rem;font-weight:500}.nav-links a:hover{color:var(--text)}
main{max-width:880px;margin:0 auto;padding:2.5rem 1.5rem 5rem}
.badge{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:600;padding:.25rem .7rem;border-radius:999px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted)}
h1.skill-title{font-size:2.2rem;font-weight:800;margin:.8rem 0 .4rem;font-family:'JetBrains Mono',monospace}
.lead{color:var(--text-muted);font-size:1.05rem;margin-bottom:1.5rem}
.panel{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.4rem 1.6rem;margin:1.2rem 0}
.panel h2{font-size:1.05rem;margin-bottom:.8rem;color:var(--accent-light)}
.triggers{display:flex;flex-wrap:wrap;gap:.5rem}
.trigger{font-family:'JetBrains Mono',monospace;font-size:.78rem;padding:.3rem .65rem;border-radius:8px;background:rgba(124,92,252,.12);border:1px solid rgba(124,92,252,.3);color:var(--accent-light)}
.invoke{font-family:'JetBrains Mono',monospace;background:#0d0d14;border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;color:var(--green);font-size:.9rem;overflow-x:auto}
article.manual{margin-top:2.5rem}
article.manual h1{font-size:1.7rem;margin:2rem 0 1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
article.manual h2{font-size:1.35rem;margin:2rem 0 .8rem;color:var(--accent-light)}
article.manual h3{font-size:1.1rem;margin:1.5rem 0 .6rem}
article.manual p{margin:.8rem 0;color:var(--text)}
article.manual ul,article.manual ol{margin:.8rem 0 .8rem 1.5rem}
article.manual li{margin:.3rem 0}
article.manual code{font-family:'JetBrains Mono',monospace;font-size:.85em;background:rgba(124,92,252,.12);padding:.15em .4em;border-radius:5px;color:var(--accent-light)}
article.manual pre{background:#0d0d14;border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.3rem;overflow-x:auto;margin:1rem 0}
article.manual pre code{background:none;padding:0;color:#c8c8d8;font-size:.83rem;line-height:1.6}
article.manual table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.9rem}
article.manual th,article.manual td{border:1px solid var(--border);padding:.5rem .8rem;text-align:left}
article.manual th{background:var(--bg-card);color:var(--accent-light)}
article.manual blockquote{border-left:3px solid var(--accent);padding:.4rem 1rem;margin:1rem 0;color:var(--text-muted);background:var(--bg-card);border-radius:0 10px 10px 0}
article.manual hr{border:none;border-top:1px solid var(--border);margin:2rem 0}
footer{border-top:1px solid var(--border);padding:2rem;text-align:center;color:var(--text-dim);font-size:.85rem}
/* catalogue */
.search{width:100%;padding:.9rem 1.2rem;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:1rem;margin:1.5rem 0;outline:none}
.search:focus{border-color:var(--accent)}
.cat-section{margin:2.2rem 0}
.cat-title{font-size:1.2rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem}
.cat-count{font-size:.78rem;color:var(--text-dim);font-weight:500}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.8rem}
.card{display:block;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem;text-decoration:none;transition:all .15s}
.card:hover{border-color:var(--accent);transform:translateY(-2px)}
.card .name{font-family:'JetBrains Mono',monospace;font-size:.88rem;font-weight:600;color:var(--text);margin-bottom:.3rem}
.card .desc{font-size:.8rem;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hidden{display:none}
/* copy blocks */
.cmd-block{position:relative;margin:.6rem 0}
.cmd-block .invoke{padding-right:5.2rem;white-space:pre-wrap;word-break:break-all}
.cmd-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-dim);margin-bottom:.3rem}
.copy-btn{position:absolute;top:.5rem;right:.5rem;background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);font-size:.72rem;font-weight:600;padding:.3rem .7rem;border-radius:7px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s}
.copy-btn:hover{border-color:var(--accent);color:var(--text)}
.copy-btn.ok{border-color:var(--green);color:var(--green)}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;

const navHtml = (depth) => {
  const p = depth === 0 ? '.' : '..';
  return `<nav><a class="nav-brand" href="${p}/index.html">Claude <span>Skills</span></a><ul class="nav-links"><li><a href="./index.html">Manuels</a></li><li><a href="./usecases.html">Cas d'usage</a></li><li><a href="${p}/index.html">Accueil</a></li><li><a href="${REPO}" target="_blank">GitHub</a></li></ul></nav>`;
};

function skillPage(s) {
  const cat = CATEGORY_META[s.cat] || { label: s.cat, icon: '📦', color: '#8888a0' };
  const app = LIVE_APPS[s.name];
  const appHtml = app
    ? `<div class="panel" style="border-color:rgba(52,211,153,.4);background:linear-gradient(135deg,rgba(52,211,153,.08),var(--bg-card))"><h2 style="color:var(--green)">✨ Essayez en ligne</h2><p style="color:var(--text-muted);font-size:.92rem;margin-bottom:1rem">${escapeHtml(app.desc)}</p><a href="${app.url}" target="_blank" rel="noopener" style="display:inline-block;background:var(--green);color:#0a0a0f;font-weight:700;padding:.7rem 1.4rem;border-radius:10px;text-decoration:none;font-size:.95rem">🚀 ${escapeHtml(app.label)}</a></div>`
    : '';
  const triggersHtml = s.triggers.length
    ? `<div class="panel"><h2>🔑 Déclencheurs automatiques</h2><p style="color:var(--text-muted);font-size:.9rem;margin-bottom:.8rem">Le skill s'active automatiquement quand votre demande contient :</p><div class="triggers">${s.triggers.map((t) => `<span class="trigger">${escapeHtml(t)}</span>`).join('')}</div></div>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(s.name)} — Manuel d'utilisation | Claude Skills Collection</title>
<meta name="description" content="${escapeHtml(s.summary)}">
${FONTS}
<style>${CSS}</style>
</head>
<body>
${navHtml(1)}
<main>
<span class="badge">${cat.icon} ${cat.label}</span>
<h1 class="skill-title">${escapeHtml(s.name)}</h1>
<p class="lead">${escapeHtml(s.summary)}</p>

${appHtml}

<div class="panel">
<h2>⚡ Installation &amp; lancement en 1 commande</h2>
<p style="color:var(--text-muted);font-size:.9rem;margin-bottom:.8rem">Copiez-collez dans votre terminal : le skill s'installe dans <code style="font-family:'JetBrains Mono',monospace;font-size:.82em">~/.claude/skills</code> et Claude Code se lance directement dessus.</p>
<div class="cmd-label">macOS / Linux</div>
<div class="cmd-block"><div class="invoke">${escapeHtml(`curl -fsSL ${RAW}/install.sh | sh -s -- ${s.name} --launch`)}</div><button class="copy-btn">Copier</button></div>
<div class="cmd-label" style="margin-top:.8rem">Windows (PowerShell)</div>
<div class="cmd-block"><div class="invoke">${escapeHtml(`iex "& { $(iwr -useb ${RAW}/install.ps1) } ${s.name} -Launch"`)}</div><button class="copy-btn">Copier</button></div>
</div>

<div class="panel">
<h2>🚀 Déjà installé ?</h2>
<div class="cmd-block"><div class="invoke">${escapeHtml(`claude "/${s.name}"`)}</div><button class="copy-btn">Copier</button></div>
<p style="margin-top:.8rem;color:var(--text-muted);font-size:.9rem">Ou tapez <code style="font-family:'JetBrains Mono',monospace;font-size:.82em">/${escapeHtml(s.name)}</code> dans une session Claude Code, ou décrivez simplement votre besoin — le skill se déclenche automatiquement via le <a href="${REPO}/tree/main/agent-skills/skill-router">skill-router</a>.</p>
</div>

${triggersHtml}

<div class="panel">
<h2>📦 Installation manuelle</h2>
<div class="cmd-block"><div class="invoke">${escapeHtml(`git clone ${REPO}.git\ncp -r claude-skills-collection/${s.cat}/${s.dir} ~/.claude/skills/`)}</div><button class="copy-btn">Copier</button></div>
<p style="margin-top:.8rem;color:var(--text-muted);font-size:.9rem">Source : <a href="${REPO}/tree/main/${s.cat}/${s.dir}" target="_blank">${s.cat}/${s.dir}</a></p>
</div>

<article class="manual">
<h1 style="margin-top:2.5rem">📖 Manuel</h1>
${mdToHtml(s.body)}
</article>
</main>
<footer>Fait par <a href="https://github.com/khalilbenaz" target="_blank">@khalilbenaz</a> — MIT License</footer>
<script>
document.querySelectorAll('.copy-btn').forEach(b=>b.addEventListener('click',()=>{
  navigator.clipboard.writeText(b.previousElementSibling.textContent).then(()=>{
    b.textContent='Copié ✓';b.classList.add('ok');
    setTimeout(()=>{b.textContent='Copier';b.classList.remove('ok')},1800);
  });
}));
</script>
</body>
</html>`;
}

function catalogPage() {
  const byCat = {};
  for (const s of skills) (byCat[s.cat] ||= []).push(s);
  const sections = Object.keys(byCat).sort().map((cat) => {
    const m = CATEGORY_META[cat] || { label: cat, icon: '📦' };
    const cards = byCat[cat].map((s) =>
      `<a class="card" data-search="${escapeHtml((s.name + ' ' + s.desc).toLowerCase())}" href="./${s.name}.html"><div class="name">${escapeHtml(s.name)}</div><div class="desc">${escapeHtml(s.summary)}</div></a>`
    ).join('\n');
    return `<section class="cat-section" data-cat><div class="cat-title">${m.icon} ${m.label} <span class="cat-count">${byCat[cat].length} skills</span></div><div class="grid">${cards}</div></section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Manuels d'utilisation — ${skills.length} skills | Claude Skills Collection</title>
<meta name="description" content="Manuel d'utilisation détaillé pour chacun des ${skills.length} skills de la collection.">
${FONTS}
<style>${CSS}</style>
</head>
<body>
${navHtml(1)}
<main style="max-width:1100px">
<h1 class="skill-title" style="font-family:'Inter',sans-serif">📚 Manuels d'utilisation</h1>
<p class="lead">Un manuel détaillé pour chacun des ${skills.length} skills : invocation, déclencheurs, installation et documentation complète.</p>
<input class="search" id="q" type="search" placeholder="Rechercher un skill… (ex : terraform, oauth, cv)" autofocus>
${sections}
</main>
<footer>Fait par <a href="https://github.com/khalilbenaz" target="_blank">@khalilbenaz</a> — MIT License</footer>
<script>
const q=document.getElementById('q');
q.addEventListener('input',()=>{
  const v=q.value.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('hidden',v&&!c.dataset.search.includes(v)));
  document.querySelectorAll('[data-cat]').forEach(s=>s.classList.toggle('hidden',!s.querySelector('.card:not(.hidden)')));
});
</script>
</body>
</html>`;
}

function usecasesPage() {
  // Validation : chaque skill référencé doit exister
  const known = new Set(skills.map((s) => s.name));
  const unknown = USE_CASES.flatMap((t) => t.cases.flatMap((c) => c.steps.map(([n]) => n))).filter((n) => !known.has(n));
  if (unknown.length) throw new Error(`Skills inconnus dans USE_CASES : ${[...new Set(unknown)].join(', ')}`);

  const nbCases = USE_CASES.reduce((a, t) => a + t.cases.length, 0);
  const sections = USE_CASES.map((t) => {
    const cards = t.cases.map((c) => {
      const steps = c.steps.map(([n, role], i) =>
        `<li><span class="step-num">${i + 1}</span><a href="./${n}.html">${n}</a><span class="step-role">${escapeHtml(role)}</span></li>`
      ).join('\n');
      const routerPrompt = `claude "Objectif : ${c.goal}. Utilise la séquence ${c.steps.map(([n]) => '/' + n).join(' puis ')}."`;
      return `<div class="uc-card" data-search="${escapeHtml((c.title + ' ' + c.goal + ' ' + c.steps.map(([n]) => n).join(' ')).toLowerCase())}">
<div class="uc-title">${c.icon} ${escapeHtml(c.title)}</div>
<div class="uc-goal">${escapeHtml(c.goal)}</div>
<ol class="uc-steps">${steps}</ol>
<div class="cmd-block"><div class="invoke">${escapeHtml(routerPrompt)}</div><button class="copy-btn">Copier</button></div>
</div>`;
    }).join('\n');
    return `<section class="cat-section" data-cat><div class="cat-title">${t.theme} <span class="cat-count">${t.cases.length} cas d'usage</span></div><div class="uc-grid">${cards}</div></section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${nbCases} cas d'usage — Claude Skills Collection</title>
<meta name="description" content="${nbCases} séquences de skills prêtes à l'emploi pour les vrais projets : dev, cloud, sécurité, data, business et vie quotidienne.">
${FONTS}
<style>${CSS}
.uc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:1rem}
.uc-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.3rem 1.4rem;display:flex;flex-direction:column}
.uc-card:hover{border-color:var(--accent)}
.uc-title{font-weight:700;font-size:1.02rem;margin-bottom:.2rem}
.uc-goal{color:var(--text-muted);font-size:.85rem;margin-bottom:.9rem}
.uc-steps{list-style:none;margin:0 0 1rem;flex:1}
.uc-steps li{display:flex;align-items:center;gap:.55rem;padding:.28rem 0;font-size:.85rem}
.step-num{flex:none;width:1.3rem;height:1.3rem;border-radius:50%;background:rgba(124,92,252,.15);color:var(--accent-light);font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center}
.uc-steps a{font-family:'JetBrains Mono',monospace;font-size:.8rem;color:var(--cyan);text-decoration:none}
.uc-steps a:hover{text-decoration:underline}
.step-role{color:var(--text-dim);font-size:.76rem;margin-left:auto;text-align:right}
.uc-card .invoke{font-size:.72rem;color:var(--text-muted);line-height:1.5}
</style>
</head>
<body>
${navHtml(1)}
<main style="max-width:1200px">
<h1 class="skill-title" style="font-family:'Inter',sans-serif">🧭 Cas d'usage</h1>
<p class="lead">${nbCases} séquences de skills prêtes à l'emploi, du dev à la vie quotidienne. Chaque étape pointe vers son manuel — et la commande copiable lance toute la séquence dans Claude Code via le skill-router.</p>
<input class="search" id="q" type="search" placeholder="Rechercher un cas d'usage… (ex : burnout, kubernetes, freelance)">
${sections}
</main>
<footer>Fait par <a href="https://github.com/khalilbenaz" target="_blank">@khalilbenaz</a> — MIT License</footer>
<script>
const q=document.getElementById('q');
q.addEventListener('input',()=>{
  const v=q.value.trim().toLowerCase();
  document.querySelectorAll('.uc-card').forEach(c=>c.classList.toggle('hidden',v&&!c.dataset.search.includes(v)));
  document.querySelectorAll('[data-cat]').forEach(s=>s.classList.toggle('hidden',!s.querySelector('.uc-card:not(.hidden)')));
});
document.querySelectorAll('.copy-btn').forEach(b=>b.addEventListener('click',()=>{
  navigator.clipboard.writeText(b.previousElementSibling.textContent).then(()=>{
    b.textContent='Copié ✓';b.classList.add('ok');
    setTimeout(()=>{b.textContent='Copier';b.classList.remove('ok')},1800);
  });
}));
</script>
</body>
</html>`;
}

// ---------- write ----------
mkdirSync(OUT, { recursive: true });
for (const s of skills) writeFileSync(join(OUT, `${s.name}.html`), skillPage(s));
writeFileSync(join(OUT, 'index.html'), catalogPage());
writeFileSync(join(OUT, 'usecases.html'), usecasesPage());
// Index machine-lisible consommé par install.sh / install.ps1
writeFileSync(join(OUT, 'skills.index'), skills.map((s) => `${s.name} ${s.cat}/${s.dir}`).join('\n') + '\n');
console.log(`✓ ${skills.length} manuels générés dans manuals/ (+ index.html, skills.index)`);
