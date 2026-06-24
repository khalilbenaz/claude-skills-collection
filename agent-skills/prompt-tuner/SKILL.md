---
name: prompt-tuner
description: Optimisation systématique des prompts d'agents pour améliorer performance et fiabilité. Se déclenche avec "optimiser prompt agent", "agent prompt", "améliorer mon agent", "prompt tuning", "agent accuracy", "agent qui se trompe", "calibrer agent", "affiner prompt".
---

# Agent Prompt Tuner

## Quand utiliser ce skill

- Agent produit des sorties incorrectes, incohérentes ou mal formatées
- Taux d'erreur en production dépasse un seuil acceptable
- Migration vers un nouveau modèle LLM (recalibration nécessaire)
- Création d'un nouvel agent : structurer les instructions dès le départ
- Coût ou latence trop élevés sans gain de qualité

## Workflow

### 1. Constituer la baseline

Avant toute modification, mesurer les métriques actuelles :

```
taux_succes   = nb_sorties_correctes / nb_total  (par catégorie de tâche)
hallucination = nb_faits_inventés / nb_total
tool_error    = nb_mauvais_appels_outils / nb_appels
latence_p95   = percentile 95 du temps de réponse
coût/req      = tokens_in * prix_in + tokens_out * prix_out
```

Constituer un dataset d'évaluation de **50 à 200 cas** représentatifs avant d'écrire la première ligne révisée. Sans baseline, toute modification est une intuition.

### 2. Classifier les erreurs

Trier les échecs dans ces catégories (quantifier chacune) :

| Catégorie | Symptôme typique | Priorité si fréquent |
|-----------|-----------------|----------------------|
| Formatage | JSON invalide, champs manquants | Haute |
| Raisonnement | Logique fausse, mauvaise inférence | Haute |
| Hallucination | Faits inventés, sources inexistantes | Critique |
| Mauvais outil | Mauvais tool appelé, mauvais args | Haute |
| Hors-domaine | Refus inapproprié, réponse off-topic | Moyenne |
| Verbosité | Réponse trop longue ou trop courte | Basse |

### 3. Restructurer le system prompt

Ordre optimal des sections (ne pas mélanger) :

```
1. Rôle / persona (1-2 phrases max)
2. Capacités disponibles (liste des outils, contexte)
3. Contraintes et interdictions EXPLICITES
4. Format de sortie attendu + exemple inline
5. Comportement sur erreur / cas ambigus
```

Exemple concret (agent de support) :

```
Tu es un agent de support bancaire. Tu traites UNIQUEMENT les demandes
liées aux comptes, virements et cartes.

Outils disponibles : get_account_balance, list_transactions, open_ticket.

INTERDIT : donner des conseils d'investissement ou des informations
sur des tiers non liés au compte du client.

Format de réponse :
{"status": "ok|error|escalate", "message": "...", "ticket_id": null|"XXX"}

Si la demande est ambiguë : réponds avec status="escalate" et explique
pourquoi dans "message". Ne devine jamais.
```

### 4. Few-shot examples

- Tâches simples : 1-3 exemples
- Tâches complexes ou multi-étapes : 3-8 exemples
- Couvrir : cas nominal, cas limites, cas d'erreur/refus

Structure recommandée par exemple :

```
<example>
<input>Quel est le solde de mon compte 123456 ?</input>
<thinking>L'utilisateur demande un solde. J'appelle get_account_balance.</thinking>
<output>{"status":"ok","message":"Votre solde est de 1 240,50 €.","ticket_id":null}</output>
</example>
```

### 5. Chain-of-thought : quand l'imposer

| Imposer `<thinking>` | Réponse directe |
|----------------------|-----------------|
| Raisonnement multi-étapes | Classification binaire |
| Sélection d'outil ambiguë | Extraction de champ |
| Calcul ou comparaison | Reformulation simple |
| Décision avec conditions | Réponse factuelle courte |

Forcer le scratchpad uniquement quand nécessaire : chaque token de thinking augmente latence et coût.

### 6. Descriptions d'outils

Modèle à suivre pour chaque outil :

```python
{
  "name": "search_transactions",
  "description": (
    "Recherche des transactions sur un compte. "
    "UTILISER pour : retrouver un virement, vérifier un débit. "
    "NE PAS UTILISER pour : calculs, infos non transactionnelles."
  ),
  "parameters": {
    "account_id": {"type": "string", "example": "123456"},
    "date_from":  {"type": "string", "format": "YYYY-MM-DD"},
    "limit":      {"type": "integer", "default": 20, "max": 100}
  }
}
```

Règle : si l'agent appelle le mauvais outil, la description est insuffisante — réécrire avant de chercher ailleurs.

### 7. Guardrails dans le prompt

Instructions de récupération à intégrer directement :

```
- Si tu n'es pas sûr à plus de 80%, réponds UNCERTAIN au lieu d'inventer.
- Valide le JSON de sortie avant de retourner (structure, types, champs requis).
- Si un outil retourne une erreur, retente une seule fois avec des args corrigés,
  puis escalade avec status="error".
- Ne concatène jamais d'informations de comptes différents dans une même réponse.
```

### 8. A/B testing

```
variante_A = prompt actuel (contrôle)
variante_B = prompt modifié (une seule variable changée)

Evaluer sur le dataset d'évaluation :
- taux_succes_A vs taux_succes_B
- p-value < 0.05 requis pour déployer (test de proportion z-test)
- si delta < 2% : ne pas déployer, bruit statistique

# Exemple Python rapide (z-test sur taux de succès)
from statsmodels.stats.proportion import proportions_ztest
stat, p = proportions_ztest([ok_B, ok_A], [n_B, n_A])
print(f"p={p:.4f} — {'DEPLOY' if p < 0.05 else 'SKIP'}")
```

Ne déployer une variante que si l'amélioration est significative ET si le gain justifie l'éventuelle augmentation de coût/latence.

### 9. Versionnage

Gérer les prompts comme du code :

```bash
# Commit après chaque expérimentation
git add prompts/agent_support_v2.txt
git commit -m "prompt: ajouter guardrail hallucination — +4.2% accuracy"

# Tag de version stable
git tag prompt-support-v2.1-stable
```

Maintenir un `PROMPT_CHANGELOG.md` minimal :

```
## 2026-06-24 — v2.1
Auteur : k.benazzouz
Change : ajout guardrail UNCERTAIN + exemple edge case solde nul
Métriques : accuracy 81% → 85.2%, hallucination 6% → 1.8%
```

### 10. Boucle d'amélioration continue

```
Production → logging des échecs → analyse hebdo → update dataset → nouveau cycle
```

Déclencher un cycle forcé lors de : mise à jour du modèle LLM, changement de cas d'usage, dérive de performance > 5% sur 2 semaines.

## Critères de décision rapide

| Symptôme | Action en premier |
|----------|------------------|
| JSON invalide en sortie | Ajouter exemple de format dans le prompt |
| Outil appelé avec mauvais args | Réécrire description de l'outil |
| Hallucination fréquente | Ajouter instruction UNCERTAIN + guardrail |
| Refus excessifs | Assouplir les contraintes, ajouter few-shots positifs |
| Coût trop élevé | Réduire thinking obligatoire, raccourcir few-shots |
| Latence trop haute | Passer à réponse directe sur tâches simples |

## Anti-patterns / pièges

- **Modifier plusieurs variables simultanément** : impossible d'identifier la cause de l'amélioration ou de la régression.
- **Instructions vagues** : "sois précis" ne change rien. Remplacer par "réponds en 2 phrases maximum, chiffres inclus".
- **Over-fitting au dataset de test** : un prompt parfait sur 50 exemples peut échouer en production sur les variantes non représentées. Toujours valider sur un ensemble holdout séparé.
- **Few-shots contradictoires** : deux exemples qui montrent des formats de sortie différents créent de la confusion. Uniformiser avant d'ajouter.
- **Ignorer le coût des guardrails** : chaque instruction de validation ajoutée consomme des tokens. Grouper les guardrails en bloc unique plutôt qu'instructions dispersées.
- **Pas de rollback prévu** : déployer sans tag git ou sauvegarde du prompt précédent = incapacité à revenir en arrière rapidement en cas d'incident.
