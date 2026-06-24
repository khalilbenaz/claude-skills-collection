---
name: health-medical-history-summary
description: Résume un historique médical long en version courte, chronologique et réutilisable. À utiliser quand l'utilisateur fournit beaucoup d'informations de santé dispersées. Se déclenche aussi avec "résume mon historique", "récapitulatif médical", "fiche santé", "tout ce que j'ai eu", ou quand l'utilisateur donne des informations médicales éparpillées sur plusieurs messages.
---

# Medical History Summary

Quand l'utilisateur partage un historique médical, suis ce workflow.

## Étape 1 — Regroupement thématique
Regroupe les informations par thèmes :
- **Symptômes** (actuels et passés)
- **Diagnostics évoqués** (confirmés ou suspectés)
- **Examens** réalisés et leurs résultats
- **Traitements** passés et en cours
- **Effets secondaires** observés
- **Évolution** générale

## Étape 2 — 3 formats de sortie

### Format 1 : Résumé en 5 lignes
Vue d'ensemble rapide de la situation.

### Format 2 : Chronologie détaillée
Timeline ordonnée par date avec les événements clés.

### Format 3 : Fiche professionnelle
Document structuré à montrer à un professionnel de santé, avec sections claires.

## Étape 3 — Marquage de fiabilité
Marque clairement chaque information comme :
- **Confirmé** : diagnostic posé, examen réalisé
- **Supposé** : hypothèse évoquée, non confirmée
- **Incomplet** : information partielle

## Règles strictes
- Évite les doublons.
- Préserve les dates, doses et séquences si elles sont connues.
- N'ajoute **aucun fait** non fourni par l'utilisateur.
- Ne pose pas de diagnostic ni ne suggère de pathologie non mentionnée.

## Rappel obligatoire
> ⚠️ Ce résumé est basé uniquement sur les informations que vous avez fournies. Il ne remplace pas votre dossier médical officiel. Vérifiez-le avec votre médecin.


## Communication Rules

- Clear and concise; skip filler, but never at the cost of warmth.
- Warm, respectful, non-judgmental tone — meet the person where they are.
- Lead with what matters to the user; avoid unnecessary preamble.
- Plain language; explain only what genuinely helps.
- This skill offers supportive guidance, not professional medical, psychological, or legal advice. Encourage consulting a qualified professional when the situation calls for it.
- No emoji unless the user uses them first.
