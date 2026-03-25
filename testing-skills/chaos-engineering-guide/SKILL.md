---
name: chaos-engineering-guide
description: Principes et outils de chaos engineering pour tester la résilience des systèmes distribués, incluant fault injection et game days. Se déclenche avec "chaos engineering", "Chaos Monkey", "fault injection", "résilience", "Litmus", "game day"
---

# Chaos Engineering Guide

## Workflow
1. **Définir l'état stable du système** — Identifier les métriques clés qui caractérisent le fonctionnement normal du système (latence, taux d'erreur, throughput, disponibilité). Établir les seuils de base (baseline) à partir des données de monitoring existantes.
2. **Formuler des hypothèses** — Énoncer des hypothèses sur le comportement attendu du système face à des perturbations spécifiques. Exemple : "Si un noeud tombe, le load balancer redirige le trafic en moins de 30 secondes sans erreur utilisateur."
3. **Sélectionner les outils de chaos** — Choisir les outils adaptés à l'infrastructure : Chaos Monkey (Netflix/AWS), Litmus (Kubernetes), Gremlin (plateforme managée), Toxiproxy (réseau). Installer et configurer l'outil dans l'environnement cible.
4. **Concevoir les expériences de chaos** — Définir les types de pannes à injecter : arrêt de processus, latence réseau, saturation CPU/mémoire, perte de paquets, indisponibilité de dépendance. Commencer par des perturbations limitées en scope (blast radius).
5. **Exécuter en environnement contrôlé** — Lancer les expériences d'abord en staging, puis progressivement en production. Mettre en place un bouton d'arrêt d'urgence (kill switch). Surveiller les métriques en temps réel pendant l'expérience.
6. **Organiser des game days** — Planifier des sessions de chaos en équipe avec des scénarios de panne réalistes. Impliquer les équipes Dev, Ops et SRE. Documenter les observations, les temps de détection et de récupération.
7. **Analyser les résultats et corriger** — Comparer le comportement observé aux hypothèses. Identifier les points de défaillance, les cascades d'erreurs et les gaps dans le monitoring. Créer des tickets de correction priorisés.
8. **Automatiser et itérer** — Intégrer les expériences de chaos validées dans le pipeline CI/CD. Augmenter progressivement la complexité et le blast radius. Construire un catalogue d'expériences reproductibles.

## Règles
- Toujours commencer par des expériences à faible impact (blast radius minimal) et augmenter progressivement ; ne jamais injecter de pannes majeures sans expérience préalable.
- Ne jamais lancer d'expérience de chaos sans monitoring actif et sans mécanisme d'arrêt d'urgence (kill switch) testé et fonctionnel.
- Obtenir l'accord explicite des parties prenantes (management, équipe ops) avant toute expérience en production ; documenter le périmètre et les risques.
- Traiter chaque découverte comme une opportunité d'amélioration : créer systématiquement des actions correctives avec un responsable et une échéance.
