---
name: automation-zapier-workflow-builder
description: Automatisation avec Zapier — Zaps multi-étapes, filtres, paths, webhooks et intégration entre applications. Se déclenche avec "Zapier", "Zap", "automatiser sans code", "connecter des apps", "webhook Zapier".
---

# Zapier Workflow Builder

## Workflow

1. **Analyser le processus à automatiser** — identifier l'application source (trigger), les applications cibles (actions), les données à transférer entre elles, et vérifier la disponibilité des intégrations sur le catalogue Zapier (6000+ apps).

2. **Configurer le trigger** — choisir l'événement déclencheur dans l'application source (nouveau lead dans CRM, nouvel email, nouveau fichier, webhook entrant), connecter le compte, et tester le trigger pour récupérer des données d'exemple utilisées dans les étapes suivantes.

3. **Construire les étapes intermédiaires** — ajouter des actions de transformation : Formatter (texte, dates, nombres), Filter (continuer uniquement si condition remplie), Delay (attendre avant la prochaine action), Looping (itérer sur une liste), et Paths (branches conditionnelles multiples).

4. **Configurer les actions de destination** — mapper les champs du trigger vers les champs de l'application cible, utiliser les variables dynamiques de chaque étape précédente, formater les données avec les fonctions intégrées, et tester chaque action individuellement.

5. **Implémenter les Paths et filtres avancés** — créer des branches conditionnelles avec Paths pour traiter différemment les données selon des critères (type de client, montant, priorité), combiner avec des filtres pour exclure les exécutions inutiles et économiser les tâches.

6. **Configurer les webhooks** — utiliser Webhooks by Zapier pour recevoir des données depuis des applications non intégrées (Catch Hook), envoyer des requêtes HTTP personnalisées (POST, GET, PUT) vers des API externes, et parser les réponses JSON.

7. **Tester de bout en bout** — exécuter le Zap en mode test étape par étape, vérifier le mapping des données à chaque action, tester les cas limites (données manquantes, formats inattendus), et activer le Zap uniquement après validation complète.

## Règles

- Toujours tester chaque étape individuellement avant d'activer le Zap complet — un mapping incorrect peut créer des données corrompues dans l'application cible.
- Utiliser les filtres tôt dans le workflow pour éviter les exécutions inutiles — chaque tâche consommée compte dans le quota du plan Zapier.
- Préférer les Paths aux Zaps multiples quand la logique diverge selon une condition — cela centralise la maintenance et réduit les risques d'incohérence.
- Documenter chaque Zap avec un nom descriptif et des notes expliquant le contexte métier — les Zaps orphelins sans documentation deviennent rapidement ingérables.
- Surveiller les erreurs via le Task History et configurer des alertes email pour les échecs — un Zap en erreur silencieuse peut bloquer un processus métier critique.


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
