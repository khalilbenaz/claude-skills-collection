---
name: debugger
description: Diagnostique pourquoi un prompt produit des résultats indésirables et propose des corrections ciblées. À utiliser quand le LLM hallucine, ignore des instructions, donne un mauvais format ou un résultat incohérent. Se déclenche aussi avec "mon prompt hallucine", "le LLM ignore mes instructions", "résultat incorrect", "format non respecté", ou tout problème avec un prompt.
---

# Prompt Debugger

## Étape 1 — Collecte du contexte

Demander (ou inférer depuis la conversation) :

1. **Prompt actuel** — coller le texte complet, pas un résumé.
2. **Résultat obtenu** — extrait représentatif de la mauvaise sortie.
3. **Résultat attendu** — description précise ou exemple concret.
4. **Modèle ciblé** — GPT-4o, Claude Sonnet 3.7, Gemini 1.5 Pro… (certains bugs sont modèle-spécifiques).
5. **Température / paramètres** — température > 0.8 → instabilité de format quasi-systématique.
6. **Contexte d'appel** — API directe, playground, outil tiers, RAG, agent ?

> Si l'utilisateur n'a que le symptôme, aller directement au tableau de diagnostic (Étape 2) et poser une question ciblée.

---

## Étape 2 — Diagnostic par symptôme

| Symptôme observé | Causes probables (par ordre de fréquence) | Correction prioritaire |
|---|---|---|
| **Hallucinations factuelles** | Question ouverte sans ancrage ; données hors knowledge cutoff | Fournir les faits en contexte ; ajouter `"Réponds uniquement à partir du texte fourni."` |
| **Format ignoré** (JSON, Markdown, liste…) | Format décrit en prose, non montré | Inclure un exemple de sortie verbatim dans le prompt |
| **Instructions sautées** | Instruction noyée au milieu ; trop d'instructions simultanées | Mettre l'instruction critique en **première ou dernière ligne** ; réduire à 3 contraintes max |
| **Réponse trop courte** | Pas de contrainte de longueur ; modèle en mode "assistant concis" | `"Développe en minimum 300 mots."` ou `"Fournis 5 points détaillés."` |
| **Réponse trop longue / rembourrage** | Pas de plafond ; modèle optimiste sur la verbosité | `"Réponse en 3 phrases max."` + `"N'explique pas ce que tu vas faire."` |
| **Ton/style inadapté** | Aucune directive de ton ; rôle absent | Définir persona + donner 1 exemple de phrase cible |
| **Résultat hors sujet** | Ambiguïté lexicale ; contrainte négative absente | Reformuler + `"Ne parle PAS de X."` ; décomposer en sous-tâches |
| **Incohérences entre paragraphes** | Contradictions internes au prompt ; fenêtre context saturée | Supprimer les contradictions ; résumer le contexte avant de le passer |
| **Refus non justifié** | Trigger de safety sur un terme ambigu | Reformuler le terme sensible ; ajouter un contexte professionnel |
| **Résultat non-déterministe** | Température > 0.7 + formulation ouverte | Baisser `temperature` à 0–0.3 pour les tâches structurées |

---

## Étape 3 — Analyse Avant / Après

Pour chaque problème identifié, produire un bloc :

```
PROBLÈME : [symptôme précis]
CAUSE     : [mécanique sous-jacente]
AVANT     : <extrait du prompt fautif>
APRÈS     : <correctif minimal>
POURQUOI  : [explication d'une ligne]
```

**Exemple concret :**

```
PROBLÈME : Le modèle répond en anglais malgré la demande en français.
CAUSE     : La directive de langue arrive après 400 tokens d'instructions en anglais.
AVANT     : "... [long prompt anglais] ... Réponds en français."
APRÈS     : "LANGUE DE RÉPONSE : FRANÇAIS UNIQUEMENT.\n\n[reste du prompt]"
POURQUOI  : Les modèles pondèrent davantage les instructions en début de prompt
            (primacy bias) ; les instructions tardives sont souvent ignorées.
```

---

## Étape 4 — Prompt corrigé complet

Fournir la version corrigée **prête à copier-coller**, avec :

- Structure : Rôle → Contexte → Tâche → Contraintes → Format de sortie
- Format montré par l'exemple, pas seulement décrit
- Contraintes négatives explicites si pertinent

**Template de structure recommandé :**

```
# RÔLE
Tu es [persona précis].

# CONTEXTE
[Informations factuelles nécessaires, données brutes, extraits de documents]

# TÂCHE
[Action unique et claire — un seul verbe principal]

# CONTRAINTES
- [Contrainte 1]
- [Contrainte 2]
- (3 max pour éviter la surcharge)

# FORMAT DE SORTIE
[Exemple verbatim de la sortie attendue — pas une description]
```

---

## Étape 5 — Pièges courants et anti-patterns

### ❌ Anti-patterns à bannir

| Anti-pattern | Pourquoi ça échoue | Alternative |
|---|---|---|
| `"Fais de ton mieux"` | Objectif non défini → variance maximale | Critères de succès explicites |
| Instructions en prose continue | Le modèle perd le fil entre règles | Listes à puces ou sections titrées |
| Répéter la même contrainte 3 fois | N'améliore pas l'obéissance, augmente la confusion | 1 fois, bien formulée, bien placée |
| Prompt > 2 000 tokens sans structure | Dégradation de l'attention au milieu (lost-in-the-middle) | Diviser en appels chaînés |
| Mélanger langue du prompt et langue attendue | Ambiguïté sur la langue de sortie | Déclarer la langue en ligne 1 |
| Température haute + format strict (JSON) | Parsing failures fréquents | `temperature: 0` pour la génération structurée |
| Négliger le system prompt | Instructions utilisateur plus faibles que system en poids | Mettre les règles invariantes dans le system prompt |

### ⚠️ Pièges spécifiques aux modèles (2026)

- **Claude** : respecte mieux les instructions en system prompt qu'en human turn ; sensible aux XML tags (`<instructions>`, `<context>`).
- **GPT-4o** : le format JSON est plus fiable via `response_format: { type: "json_object" }` qu'en prompt seul.
- **Gemini** : décrochage de format plus fréquent sur les longs contextes ; préférer des exemples courts et multiples (few-shot).
- **Modèles fine-tunés** : les instructions contraires au fine-tuning sont souvent ignorées silencieusement.

---

## Étape 6 — Validation

Tester le prompt corrigé sur **au moins 3 inputs représentatifs** couvrant :

1. Cas nominal (happy path)
2. Cas limite (input vide, très court, ou ambigu)
3. Cas adversarial (input qui pourrait déclencher le bug initial)

Checklist de validation rapide :

- [ ] Objectif lisible en 5 secondes (première ligne)
- [ ] Format montré par l'exemple, pas seulement décrit
- [ ] Contraintes ≤ 5, non-contradictoires
- [ ] Langue de sortie déclarée explicitement si multilingue
- [ ] Testé sur 3 inputs différents
- [ ] `temperature` ≤ 0.3 pour les sorties structurées
- [ ] Pas d'instruction critique enfouie au milieu du prompt
