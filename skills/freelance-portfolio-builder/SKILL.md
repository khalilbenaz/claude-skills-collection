---
name: freelance-portfolio-builder
description: Aide à construire un portfolio professionnel impactant avec une structure efficace, du storytelling et une optimisation SEO. Se déclenche avec "portfolio", "site personnel", "montrer mes projets", "portfolio développeur", "personal branding". Also triggers on "build a portfolio", "showcase my work", "case study for portfolio".
---

# Portfolio Builder

## Étape 1 — Clarifier l'objectif avant tout

Poser ces trois questions en priorité :

| Objectif                    | Conséquence concrète                                           |
|-----------------------------|----------------------------------------------------------------|
| Missions freelance courtes  | CTA "Disponible dès X" visible en fold, taux journalier lisible |
| CDI / poste salarié         | Mettre en avant stack d'entreprise, collaboration en équipe    |
| Expertise niche (ex. IA, fintech) | Landing page mono-sujet, projets triés par domaine       |
| Marque personnelle long terme | Blog/newsletter, profil cohérent LinkedIn + GitHub + site    |

Un portfolio qui veut tout dire ne dit rien. Choisir **un** objectif principal.

---

## Étape 2 — Sélectionner 4 à 6 projets (critères de décision)

Retenir un projet si **3 critères sur 4** sont vrais :

1. Aligné avec la cible (ex. SaaS B2B si c'est le marché visé)
2. Résultat mesurable disponible (perf, chiffre, délai)
3. Code/design montrable sans NDA ou avec accord client
4. Pas vieux de plus de 3 ans (sauf projet fondateur ou award)

Éliminer les side-projects sans impact réel. Mieux vaut 4 projets forts qu'un catalogue.

---

## Étape 3 — Structurer chaque fiche projet (template)

```markdown
## [Nom du projet] — [tagline en 10 mots max]

**Client / Contexte** : secteur, taille équipe, date
**Problème** : ce qui bloquait avant votre intervention
**Solution** : décisions techniques clés + pourquoi ce choix
**Défis & résolutions** : 1 ou 2 obstacles concrets + comment résolus
**Résultats** : métriques avant/après (ex. "temps de chargement : 4.2s → 1.1s")
**Stack** : Next.js 14 · PostgreSQL · Vercel · GitHub Actions
**Liens** : [Demo live] [Repo public] [Case study PDF]
```

Le champ "Résultats" est obligatoire. Si aucune métrique n'existe, estimer : "~30% de réduction du support client selon le retour client".

---

## Étape 4 — Choisir la plateforme (arbre de décision)

```
Développeur web / fullstack ?
  ├── Oui → GitHub Pages + Astro ou Next.js (contrôle total, SEO natif)
  └── Non → Designer / no-code ?
        ├── Visuels importants (UX/UI, motion) → Framer ou Webflow
        ├── Rapidité de mise en ligne → Notion + Super.so ou Read.cv
        └── Communauté créative → Behance (design) / Dribbble (UI)
```

**Recommandation 2026 pour dev** : Astro + Vercel. Build statique, Markdown pour les case studies, 100 Lighthouse score atteignable sans effort.

```bash
# Scaffold rapide Astro
npm create astro@latest mon-portfolio -- --template minimal
cd mon-portfolio && npm install
npm run dev
```

---

## Étape 5 — Page d'accueil : anatomie du fold

La première fenêtre visible sans scroll doit contenir :

1. **Headline** : qui vous êtes + valeur principale (ex. "Développeur fullstack TypeScript · je livre des MVPs en 6 semaines")
2. **Preuve sociale immédiate** : 2-3 logos clients ou "X projets livrés"
3. **CTA unique** : "Voir mes projets" ou "Me contacter" — pas les deux
4. **Signal de disponibilité** : badge vert "Dispo Q3 2026" ou rouge "Complet"

Éviter : photo hero pleine page sans texte, animations lourdes, slider de projets en autoplay.

---

## Étape 6 — SEO et performance (checklist technique)

```html
<!-- Balises meta minimales -->
<title>Prénom Nom — Développeur TypeScript · React · Node.js</title>
<meta name="description" content="Freelance fullstack basé à Paris. Spécialiste SaaS B2B, 50+ projets livrés depuis 2018." />

<!-- Open Graph (partage LinkedIn/Twitter) -->
<meta property="og:title" content="..." />
<meta property="og:image" content="/og-cover.png" /> <!-- 1200×630px -->
```

Checklist performance :

- [ ] Score Lighthouse Performance ≥ 90 (tester via `npx lighthouse https://mon-site.fr`)
- [ ] Images au format WebP ou AVIF, lazy-loaded
- [ ] Font system (`font-family: system-ui`) ou 1 seule Google Font max
- [ ] Sitemap XML généré automatiquement (`/sitemap.xml`)
- [ ] Analytics léger : Plausible (RGPD-friendly, 0 cookie banner) ou Umami auto-hébergé

---

## Étape 7 — Page Contact : convertir le visiteur

```markdown
# Travaillons ensemble

📅 Prochain slot disponible : **septembre 2026**
💶 Tarif journalier : sur demande (fourchette visible sur demande)

[Réserver un appel 30 min →] (lien Calendly ou Cal.com)
[m@email.com]
```

Ne pas mettre un formulaire complexe. Un lien vers un agenda + un email suffisent. Cal.com (open-source) remplace Calendly gratuitement.

---

## Étape 8 — Maintenance trimestrielle (routine)

Rappel agenda tous les 3 mois :

- Ajouter le dernier projet livré (ou l'archiver si NDA)
- Mettre à jour le badge disponibilité
- Vérifier que tous les liens demo fonctionnent
- Relire les métriques : sont-elles encore valides ?
- Purger les projets de plus de 4 ans si non fondateurs

---

## Anti-patterns à éviter

| Anti-pattern                              | Problème                                        | Correction                                      |
|-------------------------------------------|-------------------------------------------------|-------------------------------------------------|
| "Je suis passionné par la tech"           | Vague, non différenciant                        | "Je réduis le time-to-market des SaaS B2B"      |
| Liste de 20 technologies sans contexte   | Aucune preuve de maîtrise réelle                | 3-4 techs avec un projet de référence chacune   |
| Portfolio en PDF ou Notion public         | Non indexable, expérience mobile médiocre       | Site web avec URL propre                         |
| Cacher le tarif ou la disponibilité       | Perd du temps des deux côtés                    | Afficher au moins la fourchette                  |
| Projets confidentiels sans permission     | Risque légal + perte de confiance               | Flouter les données sensibles, obtenir accord    |
| Dark mode uniquement                      | Contraste souvent insuffisant (WCAG AA)         | Respecter le prefers-color-scheme du système     |
| Animations GSAP lourdes en homepage      | LCP dégradé, distraction du message             | Micro-animations CSS légères uniquement          |

---

## Règles non négociables

- Qualité > quantité : 5 projets avec résultats valent 20 projets sans.
- Chaque projet cite un résultat mesurable, même estimé.
- Jamais de code ou données client sans autorisation écrite.
- Mobile-first : tester sur iPhone SE (375px) avant tout.
- URL canonique propre (pas de `/index.html`, HTTPS obligatoire).


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
