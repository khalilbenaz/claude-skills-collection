---
name: writing-proofreader-fr
description: Corrige et améliore un texte en français (grammaire, style, clarté, ton). À utiliser quand l'utilisateur veut relire, corriger ou améliorer un texte français. Se déclenche aussi avec "corrige mon texte", "relecture", "fautes d'orthographe", "améliore le style", "est-ce que c'est bien écrit".
---

# Proofreader FR

## Workflow en 4 étapes

### 1. Diagnostic initial (avant de corriger)

Identifie le contexte avant toute correction :

- **Registre** : formel (rapport, email pro, administratif) / informel (message, blog) / technique (doc, code commentaire) / littéraire
- **Destinataire** : client, collègue, grand public, expert métier
- **Longueur** : < 100 mots → tout corriger en une passe ; > 500 mots → annoter les passages clés + version corrigée complète

Si le contexte n'est pas clair, pose UNE seule question avant de commencer.

---

### 2. Correction en 3 passes

#### Passe 1 — Orthographe & grammaire
Corrections non-négociables :

| Erreur fréquente | Exemple fautif | Correction |
|---|---|---|
| Accord adjectif | "des résultats positif" | "des résultats positifs" |
| Accord participe passé avec avoir | "les fichiers qu'il a envoyé" | "les fichiers qu'il a envoyés" |
| Confusion homophones | "il ce trompe" | "il se trompe" |
| Ponctuation espace | "bonjour , merci" | "bonjour, merci" |
| Tiret vs apostrophe | "aujourd'hui" mal encodé | vérifier les guillemets et apostrophes typographiques |

#### Passe 2 — Syntaxe & style
Critères de décision — intervenir si :

- Phrase > 40 mots sans ponctuation intermédiaire → couper
- Même mot répété dans la même phrase ou paragraphe adjacent → synonyme ou reformulation
- Forme passive systématique quand le sujet est connu → préférer l'actif
- Nominalisation inutile : "faire l'analyse de" → "analyser"
- Faux ami ou calque anglais : "suite" (bureau) au lieu de "logiciel", "implémentation" quand "mise en œuvre" est plus naturel

#### Passe 3 — Clarté & cohérence
- Logique : chaque paragraphe a une idée principale, les transitions sont explicites
- Ton consistent : pas de tutoiement/vouvoiement mélangés, pas de mélange registres
- Acronymes : définis à la première occurrence
- Temps verbaux : cohérence dans l'ensemble du texte

---

### 3. Format de sortie

Utilise ce format systématiquement :

```
### Corrections annotées

[ORTHO] "mot fautif" → "mot corrigé" — raison brève
[STYLE] "phrase lourde" → "phrase allégée" — raison brève
[CLARTÉ] "passage ambigu" → "passage reformulé" — raison brève

---

### Texte corrigé

[Version intégrale propre]

---

### Résumé

- Erreurs récurrentes : [liste courte]
- Point d'amélioration principal : [un conseil actionnable]
```

Pour les textes courts (< 80 mots), les annotations peuvent être inline en gras.

---

### 4. Livraison

- Toujours livrer la **version corrigée intégrale** en dernier — jamais uniquement les annotations.
- Si des choix stylistiques discutables ont été conservés, les signaler en fin de section "Résumé" sous `Choix conservés (style auteur)`.

---

## Critères de décision : corriger vs. signaler vs. laisser

| Situation | Action |
|---|---|
| Faute de grammaire objective | Corriger sans demander |
| Rupture de registre (ex. soudain tutoiement) | Corriger + signaler |
| Répétition que l'auteur semble vouloir (anaphore) | Signaler, ne pas toucher |
| Anglicisme intégré dans l'usage courant (ex. "email", "burnout") | Laisser |
| Anglicisme évitable (ex. "brainstorming" → "remue-méninges" possible) | Proposer l'alternative, ne pas imposer |
| Phrase longue qui reste claire | Laisser |
| Phrase longue + ambiguë | Couper + expliquer |

---

## Anti-patterns / pièges

- **Ne pas tout réécrire** : si le texte est globalement bon, ne pas inventer des reformulations. Corriger = chirurgie, pas remplacement.
- **Ne pas uniformiser le vocabulaire métier** : "wallet" et "portefeuille" peuvent coexister si l'auteur l'a choisi ; signaler, ne pas trancher.
- **Ne pas imposer le style académique** à un texte conversationnel, ni inversement.
- **Guillemets** : en français, guillemets « typographiques » et non "anglais" — corriger silencieusement.
- **Espace insécable** : avant `?`, `!`, `:`, `;`, `»` et après `«` — signaler si absent, ne pas bloquer sur ça si le rendu final est HTML/Markdown (espace ordinaire acceptée).
- **Éviter la sur-annotation** : > 10 annotations pour un court texte = bruit. Regrouper les erreurs du même type.

---

## Bonnes pratiques 2026

- Pour les textes techniques (documentation, README, commentaires de code) : corriger la langue sans toucher aux noms de variables, commandes, chemins ou identifiants entre backticks ou guillemets de code.
- Pour les emails/communications pro : signaler si le ton est trop familier ou trop froid selon le contexte déclaré.
- Pour les textes IA-générés soumis à relecture : indiquer si le texte a des marqueurs typiques (répétitions de structures, transitions mécaniques) et proposer une reformulation naturelle.
- Réforme de l'orthographe 1990 : accepter les deux graphies (ex. "évènement" / "événement") ; ne pas corriger une graphie 1990 comme si c'était une faute.


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
