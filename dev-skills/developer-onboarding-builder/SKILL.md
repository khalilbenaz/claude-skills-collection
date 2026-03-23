---
name: developer-onboarding-builder
description: Création de processus d'onboarding pour nouveaux développeurs. Se déclenche avec "onboarding", "nouveau développeur", "intégration équipe", "setup poste", "getting started guide", "accueil développeur".
---

# Developer Onboarding Builder

## Workflow

1. **Automatiser le setup du poste de travail** : Fournir un script d'installation idempotent (Makefile, shell script ou Ansible) qui configure l'environnement en une commande. Couvrir : outils de développement (IDE, runtime, package managers), variables d'environnement, certificats, accès aux registres privés (npm, Docker, Maven). Tester le script sur une machine vierge régulièrement. Viser < 2 heures de setup total pour un poste fonctionnel.

2. **Produire une documentation d'accueil complète** : Créer un GETTING_STARTED.md accessible depuis le README principal. Couvrir : vue d'ensemble de l'architecture (avec un diagramme C4 niveau contexte), le tech stack et les choix techniques clés (avec liens vers les ADR), les conventions de code et de nommage, le glossaire des termes métier et techniques. Cette doc doit permettre au nouveau dev de comprendre "qui fait quoi" en 30 minutes.

3. **Structurer le premier jour** : Préparer les accès avant l'arrivée (repos Git, Slack/Teams, Jira/Linear, VPN, AWS/GCP/Azure, environnement de développement local). Organiser une session d'accueil de 2h : tour de l'équipe, présentation de l'architecture, walkthrough du workflow (branch → PR → review → merge → déploiement). Identifier et présenter le buddy/mentor dédié. Objectif J1 : le dev a un environnement local fonctionnel et a fait tourner les tests.

4. **Planifier la première semaine** : Sélectionner 2-3 "good first issues" : bugs simples ou petites features bien isolées avec des tests existants. Planifier une session de pair programming sur une vraie tâche avec un membre senior. Organiser un code walkthrough des modules principaux de l'application. Programmer un 1:1 avec le tech lead en fin de semaine. Objectif S1 : le dev a soumis au moins une PR mergée, même petite.

5. **Définir les objectifs du premier mois** : Viser une feature complète de bout en bout (backend + frontend + tests + documentation) livrée en production. Le dev doit avoir participé à des code reviews (donner et recevoir du feedback). Organiser une courte présentation technique (15 min) devant l'équipe sur un sujet qu'il a découvert. Objectif M1 : autonomie sur les tâches de complexité moyenne, sans besoin constant de guidance.

6. **Fournir un parcours de formation structuré** : Créer une roadmap d'apprentissage personnalisée selon le profil (junior, intermédiaire, senior, nouveau stack). Recenser et partager les ressources internes : tech talks enregistrés, runbooks, post-mortems instructifs, ADR importants. Lister les formations externes recommandées avec budget alloué. Donner accès au calendrier des présentations internes et des revues d'architecture.

7. **Mettre en place un buddy system** : Assigner un buddy (différent du manager hiérarchique, idéalement même niveau ou un niveau au-dessus) dès le premier jour. Définir les attentes du buddy : disponible pour les questions rapides, check-in quotidien la première semaine, hebdomadaire le premier mois. Organiser des check-ins formels J7, J30 et J90. Recueillir le feedback du nouveau dev sur l'onboarding en continu pour améliorer le processus.

8. **Mesurer et améliorer l'onboarding** : Tracker des métriques objectives : time to first commit (< 3 jours), time to first PR mergée (< 1 semaine), time to première feature en prod (< 1 mois). Envoyer un questionnaire de satisfaction à J30 et J90 (satisfaction globale, clarté de la documentation, qualité du buddy, points de friction). Organiser une rétrospective onboarding formelle chaque trimestre. Mettre à jour le GETTING_STARTED.md à chaque friction identifiée par les nouveaux arrivants.

## Règles

- **Automatiser le setup sans exception** : Un onboarding qui dépend d'instructions manuelles incomplètes génère de la frustration dès J1. Un script reproduit toujours fidèlement ; une documentation se dégrade.
- **Préparer avant l'arrivée** : Tous les accès doivent être provisionnés avant le premier jour. Faire attendre un nouveau dev sur ses accès pendant 3 jours envoie un signal négatif fort sur la culture de l'équipe.
- **Objectifs clairs à J1, J7, J30** : Sans jalons définis, l'onboarding s'étire sans structure. Des objectifs clairs aident le nouveau dev à mesurer sa progression et à demander de l'aide au bon moment.
- **Le buddy n'est pas le manager** : Le rôle du buddy est d'offrir un espace safe pour les questions "bêtes" et les doutes. Cette relation fonctionne mieux avec un pair qu'avec un supérieur hiérarchique.
- **Améliorer en continu grâce aux nouveaux arrivants** : Chaque nouveau dev révèle des imperfections invisibles aux membres historiques. Leur feedback est le meilleur outil d'amélioration de l'onboarding.
