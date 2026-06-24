---
name: education-learning-roadmap
description: Crée une feuille de route d'apprentissage pour maîtriser un sujet ou une compétence. À utiliser quand l'utilisateur veut apprendre quelque chose de nouveau. Se déclenche aussi avec "je veux apprendre", "roadmap", "par où commencer pour", "parcours d'apprentissage", "comment devenir", "plan d'apprentissage".
---

# Learning Roadmap

## Étape 1 — Cadrage initial (obligatoire avant de produire la roadmap)

Collecte ces 4 données avant tout :

| Question | Pourquoi |
|----------|----------|
| Objectif final précis | "Dev web" ≠ "déployer une API REST en prod sous 3 mois" |
| Niveau actuel | Évite de reformuler des bases déjà connues |
| Disponibilité (h/semaine) | Calibre la durée et la densité de chaque phase |
| Contrainte de format | Préférence vidéo / texte / projets / certifications |

Si ces infos sont absentes, pose les questions en une seule fois. Ne génère pas la roadmap à l'aveugle.

---

## Étape 2 — Critères de découpage en phases

Utilise **3 phases maximum** par défaut :

- **Phase 1 — Fondamentaux** : concepts et outils incontournables, temps de mise en place de l'environnement.
- **Phase 2 — Pratique guidée** : projets structurés, tutoriels actifs, premières contributions / déploiements réels.
- **Phase 3 — Autonomie** : projets personnels, debugging sans aide, benchmarks et optimisation.

Critères de passage de phase :
- Ne pas basculer tant que les checkpoints de la phase courante ne sont pas validés.
- Chaque checkpoint = livrable concret (commande qui tourne, fichier produit, PR mergée, score de quiz, etc.).

---

## Étape 3 — Structure d'une phase (template)

```
### Phase N — <Nom> (semaines W1 à W2)

**Concepts clés**
- Concept A
- Concept B

**Ressources (priorité gratuit)**
- [Titre](URL) — format, durée estimée
- Docs officielles : <lien>

**Projet de validation**
> Exemple copiable : "Crée une CLI en Python qui lit un fichier CSV et génère un rapport JSON."

**Checkpoint — critère de passage**
- [ ] Tu peux expliquer X sans regarder tes notes.
- [ ] Le projet tourne sans erreur sur une machine tierce.
```

---

## Étape 4 — Calibrage de la timeline

Formule de base :

```
durée_totale (semaines) = charge_totale (heures) / disponibilité (h/semaine)
```

Barèmes indicatifs (tech, full débutant) :

| Domaine | Charge estimée jusqu'au premier emploi / projet prod |
|---------|------------------------------------------------------|
| Python scripting | 80–120 h |
| Dev web frontend | 150–250 h |
| Backend API REST | 200–350 h |
| Data / ML (bases) | 200–300 h |
| DevOps / Cloud | 250–400 h |
| Cybersécurité | 300–500 h |

Ajuste selon le niveau de départ et le critère de succès (personnel, professionnel, certif).

---

## Étape 5 — Ressources : règles de sélection

Priorité décroissante :
1. Docs officielles (toujours à jour, référence de vérité)
2. Ressources gratuites reconnues : MDN, freeCodeCamp, Exercism, roadmap.sh, The Odin Project, CS50, Fast.ai
3. Plateformes payantes si le ROI est justifié (Udemy <15 €, Pluralsight, O'Reilly)
4. Livres : préfère les éditions < 3 ans pour les sujets évoluant vite

Ne propose jamais plus de 2–3 ressources par phase — trop de choix paralyse.

---

## Étape 6 — Exemples concrets par domaine

### Exemple : apprendre Python de zéro, 10 h/semaine, objectif scripting

```
Phase 1 — Fondamentaux (semaines 1–4, ~40 h)
Concepts : types, fonctions, boucles, modules, fichiers
Ressource : https://docs.python.org/3/tutorial/ + Exercism Python track
Projet : script CLI qui parse un CSV et sort des stats (min/max/moyenne par colonne)
Checkpoint : script tourne avec pytest sans erreur, explique la différence list/tuple/dict

Phase 2 — Pratique (semaines 5–10, ~60 h)
Concepts : requests, pathlib, argparse, logging, venv, pyproject.toml
Ressource : Real Python (realpython.com) articles ciblés
Projet : outil CLI packagé installable via pip install -e .
Checkpoint : le tool est publié sur TestPyPI et documenté dans un README

Phase 3 — Autonomie (semaines 11–14, ~40 h)
Concepts : typing, tests unitaires (pytest), CI GitHub Actions
Projet : automatise une tâche réelle du quotidien de l'utilisateur
Checkpoint : pipeline CI verte, coverage > 80 %
```

---

## Anti-patterns / pièges à éviter

- **Tutorial hell** : enchaîner les tutos sans jamais produire un projet personnel. Règle : max 1 tuto actif, toujours avec un projet parallèle.
- **Phases trop longues** : au-delà de 6–8 semaines sans livrable, la motivation s'effondre. Découpe davantage.
- **Ressources obsolètes** : vérifier la date de publication pour tout ce qui touche cloud, frameworks JS, LLMs, Kubernetes. Seuil d'alerte : > 2 ans.
- **Overengineering précoce** : ne pas enseigner les design patterns ou l'architecture avant que l'utilisateur ait un premier projet fonctionnel.
- **Roadmap générique** : une roadmap sans nom de projet concret n'est pas actionnable. Chaque phase doit avoir un livrable unique nommé.
- **Ignorer le backtracking** : si un checkpoint échoue après 2 essais, prévoir un retour en phase précédente plutôt qu'une progression forcée.

---

## Bonnes pratiques 2026

- Intègre **roadmap.sh** comme référence visuelle pour les domaines couverts (dev, devops, AI, etc.).
- Pour les sujets IA/ML : recommande fast.ai v2 + Hugging Face course comme socle gratuit et à jour.
- Pour le cloud : oriente vers les sandbox gratuits (AWS Free Tier, GCP 90-day, Azure for Students) dès la phase 2.
- Mentionne **Anki** ou équivalent pour les sujets à mémorisation dense (certifications, algorithmique).
- Propose un **planning hebdomadaire type** si la disponibilité est < 8 h/semaine (sessions courtes = risque de fragmentation).


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
