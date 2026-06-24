---
name: cv-builder
description: Aide à créer ou améliorer un CV structuré, percutant et adapté au poste visé. À utiliser quand l'utilisateur veut rédiger, refaire ou optimiser son CV. Se déclenche aussi avec "mon CV", "refaire mon CV", "curriculum vitae", "résumé professionnel", "comment présenter mon parcours".
---

# CV Builder

## Étape 1 — Cadrage (avant de rédiger)

Poser ces 4 questions avant tout :

1. **Poste cible** : titre exact du poste, secteur, entreprise si connue.
2. **Niveau** : junior (0-3 ans) / confirmé (3-8 ans) / senior (8+ ans) / manager ?
3. **Pays/culture** : FR/Maghreb (photo souvent attendue, format Word/PDF), Europe Nord (photo rare, concis), US/Canada (resume 1 page, pas de photo, pas d'âge).
4. **Contraintes** : passage ATS (Applicant Tracking System) obligatoire ? Candidature directe RH ?

Critère clé : un CV ≠ un historique. C'est un **argument de vente ciblé**.

---

## Étape 2 — Inventaire des matériaux

Collecter brut, sans filtre :

- Toutes les expériences pro (entreprise, dates, titre, missions principales, outils utilisés)
- Formations (diplômes, certifications, MOOCs pertinents)
- Projets notables (perso, open-source, freelance)
- Compétences techniques (stack, langages, frameworks, outils)
- Soft skills avec preuve concrète (ex : "management de 5 devs" pas juste "leadership")
- Langues + niveau CECRL (A1→C2) ou certification (TOEIC, DELF…)
- Résultats chiffrés : %, volumes, délais, budgets, taille d'équipe

---

## Étape 3 — Structure standard

```
[EN-TÊTE]
Prénom NOM | Titre pro ciblé
Email • Téléphone • LinkedIn • GitHub/Portfolio
Ville (pas d'adresse complète)

[RÉSUMÉ PROFESSIONNEL] — 2-4 lignes
"Développeur backend Java 6 ans, spécialisé microservices Spring Boot.
Expérience en fintech (systèmes de paiement, haute dispo). Cherche
un rôle Senior dans une scale-up B2B."

[EXPÉRIENCES] — ordre antichronologique
Titre | Entreprise | Ville | MM/AAAA – MM/AAAA
• Action forte + contexte + résultat chiffré
• …

[FORMATION]
Diplôme | École | Année
Certifications pertinentes (AWS, Azure, PMP…)

[COMPÉTENCES TECHNIQUES]
Langages : Java, Python, TypeScript
Frameworks : Spring Boot, FastAPI, React
Infra/DevOps : Docker, Kubernetes, GitHub Actions
BDD : PostgreSQL, Redis, MongoDB

[LANGUES]
Arabe (natif) • Français (C1) • Anglais (B2 – TOEIC 850)
```

---

## Étape 4 — Rédaction des bullet points (format CAR)

Formule : **Contexte → Action → Résultat**

| ❌ Faible | ✅ Fort |
|---|---|
| "Responsable du backend" | "Conçu et déployé une API REST Spring Boot servant 2 M req/jour avec 99,9 % uptime" |
| "Participation au projet migration" | "Migré 3 bases Oracle vers PostgreSQL, réduisant les coûts infra de 40 % en 6 mois" |
| "Travail en équipe agile" | "Tech lead d'une squad de 4 devs, delivery de 3 sprints consécutifs sans dette critique" |

Verbes d'action à privilégier :
`Conçu · Développé · Optimisé · Réduit · Automatisé · Déployé · Migré · Encadré · Livré · Augmenté`

---

## Étape 5 — Optimisation ATS

Pour passer les filtres automatiques :

- Reprendre les **mots-clés exacts** de l'offre (titre du poste, technologies nommées).
- Éviter les tableaux, colonnes, headers/footers, zones de texte — les ATS ne les lisent pas.
- Format fichier : **PDF** pour candidature directe, **DOCX** si l'offre le demande ou si ATS connu (Workday, Taleo).
- Pas d'image, pas de logo dans le corps du document.
- Tester avec un outil gratuit : [resume.io checker](https://resume.io) ou Jobscan.

---

## Étape 6 — Formats livrables

| Format | Quand |
|---|---|
| **1 page** | Moins de 5 ans d'expérience OU marché US/CA |
| **2 pages** | Profil senior, multiple stacks, certifications nombreuses |
| **Version longue** | Consulting, académique (CV académique ≠ resume) |

Toujours produire **2 versions** : complète + condensée 1 page.

---

## Pièges courants — Anti-patterns

| Piège | Correction |
|---|---|
| Résumé générique ("passionné, rigoureux, dynamique") | Spécifier le secteur, la stack, l'ambition concrète |
| Dates en texte ("depuis 2 ans") | Toujours MM/AAAA – MM/AAAA |
| Compétences sans niveau ni preuve | Ajouter contexte ou projet associé |
| Email non-pro (pseudo gamer, surnom) | Prénom.Nom@gmail.com |
| Photo de mauvaise qualité (selfie, fond coloré) | Photo pro fond neutre, ou pas de photo (marché anglo) |
| Un CV générique envoyé partout | Adapter le titre pro et résumé à chaque offre |
| Mentionner des technos non maîtrisées | Jamais — le premier entretien le révèle |
| Trous non justifiés | Mentionner brièvement (formation, projet perso, famille) |

---

## Bonnes pratiques 2026

- **LinkedIn cohérent** : titre et expériences alignés avec le CV — les recruteurs croisent les deux.
- **GitHub/Portfolio** : lien dans l'en-tête si profil tech actif (projets épinglés, README propres).
- **Certifications cloud** (AWS, Azure, GCP) : très valorisées, à mettre en avant dès que présentes.
- **IA déclarée** : si vous avez utilisé des outils IA dans vos projets (Copilot, Claude, LangChain), le mentionner est un plus en 2026 dans les postes tech.
- **Mise à jour tous les 6 mois** même sans recherche active.

---

## Garde-fous

- Ne jamais inventer une expérience, une date, un résultat ou une certification.
- Ne pas inclure : numéro de sécu, situation familiale, salaire actuel (sauf si demandé explicitement dans l'offre — rare en France).
- Ne pas dépasser 2 pages sauf profil académique ou consulting senior.
- Adapter systématiquement : un CV générique = taux de réponse proche de zéro.
