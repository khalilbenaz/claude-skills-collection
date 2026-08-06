---
name: presentation-builder
description: Création de présentations percutantes avec structure, storytelling, visuels et delivery. Se déclenche avec "présentation", "slides", "PowerPoint", "Keynote", "présenter", "pitch deck". Also triggers on "build a presentation", "slide deck structure", "present my project".
---

# Presentation Builder

## Workflow en 8 étapes

### 1. Cadrage initial
Avant tout, collecter :
- **Message clé** (1 phrase) : ce que l'audience doit retenir après 48h
- **Audience** : technique / direction / client / investisseur / mixte
- **Format** : durée totale, présentiel / visio / enregistré, Q&A inclus ?
- **Action attendue** : décision, approbation budget, achat, adhésion

> Exemple de cadrage : "Convaincre le COMEX d'allouer 200k€ au projet X en 20 min, audience non-technique, décision demandée en séance."

### 2. Structure narrative (Storyline)
Choisir le template selon l'objectif :

| Objectif | Template | Nb slides conseillé |
|---|---|---|
| Convaincre / vendre | Problème → Coût du problème → Solution → Preuve → Call to action | 10–15 |
| Informer / reporting | Contexte → Faits → Analyse → Recommandations | 8–12 |
| Former / expliquer | Pourquoi apprendre → Concept → Demo → Pratique → Recap | 12–20 |
| Lancer un projet | Vision → Plan → Ressources → Risques → Next steps | 8–12 |

Structure minimale universelle :
```
1. Hook (30s) — chiffre choc, question, anecdote
2. Contexte / problème (1–2 slides)
3. Corps du message (3–5 sections)
4. Slide de synthèse
5. Call to action clair + next steps
```

### 3. Plan slide par slide
Pour chaque slide, définir :
- **Titre affirmatif** (pas "Résultats" mais "Les ventes ont augmenté de 40%")
- **1 idée principale** — si 2 idées distinctes, couper en 2 slides
- **Support visuel** : graphique, icône, photo, schéma ou texte seul
- **Durée prévue** : 1–3 min par slide selon la densité

### 4. Rédaction du contenu
Règles de rédaction par type de slide :

**Slide de données :**
```
Titre: "Le marché a doublé en 3 ans"
Visuel: graphique ligne simple (3 courbes max)
Label direct sur les courbes (pas de légende séparée)
Source en bas, petite
```

**Slide de liste :**
- 3 à 5 points maximum
- Commencer par un verbe d'action
- Éviter les sous-listes (si nécessaire → slide séparé)

**Slide de citation / témoignage :**
```
"Texte de la citation entre guillemets, court (< 25 mots)"
— Prénom Nom, Titre, Entreprise
```

### 5. Design et visuels

**Palette :** 1 couleur primaire + 1 secondaire + blanc/gris neutre. Pas plus.

**Typographie :** 1 famille unique, 3 tailles : titre (36–44pt), corps (24–28pt), caption (16–18pt).

**Grille :** marges minimum 5% sur chaque bord. Aligner tous les éléments sur une grille.

**Choix du graphique :**
| Besoin | Type |
|---|---|
| Évolution temporelle | Courbe |
| Comparaison catégories | Barres horizontales |
| Répartition | Camembert (≤ 5 parts) ou barres empilées |
| Corrélation | Scatter plot |
| Part d'un tout | Donut ou barre à 100% |

Simplification obligatoire : supprimer le fond de graphique, les lignes de grille sauf horizontales légères, les décimales inutiles.

### 6. Transitions et rythme

- **Slide de respiration** tous les 4–5 slides : slide visuel fort, peu de texte, pause naturelle
- Pas d'animations sur les objets sauf révélation progressive (build) pour guider l'attention
- Transition entre sections : slide de titre de section sobre (fond couleur + titre uniquement)

### 7. Notes du présentateur

Pour chaque slide :
```
[Slide 3 — Problème coût]
Message oral: "Aujourd'hui, chaque heure d'arrêt coûte X€. L'an dernier, 47 heures perdues."
Transition: "Voici comment on résout ça."
Questions anticipées: "Pourquoi ce chiffre est si élevé ?" → réponse: ...
```

### 8. Répétition et delivery

**Timing guide :**
- 10 min : 6–8 slides, 1 min/slide avec 2 min de buffer
- 20 min : 12–15 slides, 1–1.5 min/slide
- 45 min : 25–30 slides avec Q&A intégré

**Checklist delivery :**
- [ ] Répétition à voix haute chronométrée (pas dans la tête)
- [ ] Première et dernière phrase mémorisées mot pour mot
- [ ] Slide de secours prêt si Q&A déborde
- [ ] Mode présentateur activé (notes + diapo suivante visibles)
- [ ] Fichier exporté en PDF en backup

---

## Anti-patterns — Ne pas faire

| Pattern | Problème | Correction |
|---|---|---|
| Mur de texte | Audience lit, n'écoute pas | Max 6 lignes, titres affirmatifs |
| Bullet-point dumping | Pas de message clair | 1 idée = 1 slide, titre = le message |
| Graphiques à 3D | Déforment les proportions | Toujours en 2D |
| Animations excessives | Distrait du fond | Transitions simples uniquement |
| Slide "agenda" générique | Perd l'attention dès le départ | Remplacer par le hook |
| Trop de slides pour "être complet" | Dilue l'impact | Moins de slides = plus de mémorisation |
| Police < 20pt | Illisible en projection | Minimum 24pt pour le corps |
| Couleurs non-contrastées | Inaccessible (daltonisme) | Contraste WCAG AA minimum (4.5:1) |

---

## Bonnes pratiques 2026

- **Présentation hybride** : toujours prévoir une version lisible sans commentaire oral (le PDF doit se suffire à lui-même si partagé)
- **IA générative** : utiliser pour brouillon initial, mais relire systématiquement — les LLMs sur-utilisent les listes et sous-titres génériques
- **Accessibilité** : ajouter un texte alternatif sur les images clés, s'assurer du contraste suffisant
- **Présentation courte gagne** : une présentation de 10 slides bien préparée bat toujours une présentation de 40 slides exhaustive
- **Template PowerPoint / Keynote** : créer un master avec styles définis une seule fois, ne jamais formater slide par slide

---

## Output livré

1. **Plan structuré** : storyline + liste des slides avec titre affirmatif et type de contenu
2. **Contenu slide par slide** : texte prêt à coller + recommandation visuelle
3. **Notes du présentateur** : message oral + transitions + Q&A anticipées
4. **Guide de delivery** : timing par section + checklist avant J
