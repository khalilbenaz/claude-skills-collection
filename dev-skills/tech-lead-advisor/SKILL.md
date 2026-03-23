---
name: tech-lead-advisor
description: Guide pour tech leads : architecture, code reviews, mentoring et décisions techniques. Se déclenche avec "tech lead", "lead technique", "décision technique", "mentoring", "code review strategy", "technical leadership", "team lead dev".
---

# Tech Lead Advisor

## Workflow

1. **Clarifier le rôle du tech lead** : Le tech lead n'est pas le meilleur développeur qui code seul mais un multiplicateur d'équipe. Ses responsabilités : définir et communiquer la vision technique, garantir la qualité et la cohérence du code, mentorer les membres juniors et intermédiaires, et servir de pont entre le business et l'engineering. Il code encore (idéalement 30-50% du temps) pour rester crédible et connecté à la réalité.

2. **Prendre des décisions d'architecture** : Instaurer un processus RFC (Request for Comments) pour les décisions significatives : rédiger un doc de proposition, ouvrir une période de commentaires (3-5 jours), intégrer les retours, documenter la décision finale en ADR. Construire le consensus avant de trancher. Documenter les trade-offs explicitement. Accepter qu'une bonne décision collective vaut mieux qu'une décision parfaite imposée.

3. **Conduire des code reviews efficaces** : Définir des standards clairs et documentés pour éviter les débats subjectifs. Maintenir une checklist de review (sécurité, performance, lisibilité, tests, documentation). Donner un feedback constructif : citer le principe violé, expliquer pourquoi, proposer une alternative. Ne pas tout bloquer : distinguer les blockers (sécurité, bugs) des suggestions (style, nit). Répondre dans les 24h ouvrées pour ne pas bloquer l'équipe.

4. **Mentorer et faire grandir l'équipe** : Pratiquer le pair programming régulier, notamment sur les tâches complexes ou pour transmettre des connaissances. Déléguer progressivement : commencer par des tâches bien définies, puis des tâches ouvertes, puis des pans de responsabilité entiers. Organiser des 1:1 techniques mensuels (pas juste RH) pour discuter de croissance, de blocages techniques et de carrière. Identifier les strengths de chacun et les aligner avec les besoins du projet.

5. **Gérer la dette technique** : Auditer et identifier la dette régulièrement (code smells, modules fragiles, absence de tests, dépendances obsolètes). Prioriser par impact business et risque technique. Communiquer la dette au management avec des termes business (risque de panne, vitesse de livraison réduite, coût de maintenance). Négocier un budget de dette technique (ex: 20% du temps de sprint) et le défendre. Tracker la dette dans un backlog dédié.

6. **Établir standards et conventions** : Définir et documenter les coding standards de l'équipe (style, patterns préférés, anti-patterns à éviter). Automatiser via linters, formatters et pre-commit hooks pour que les règles s'appliquent sans friction. Créer des quality gates en CI (coverage minimum, analyses statiques, security scanning). Fournir des templates de PR, d'issues et de déploiement. Réviser les standards trimestriellement en équipe.

7. **Communiquer vers le haut et vers les pairs** : Préparer des présentations techniques accessibles au management (éviter le jargon, parler impact et risque). Contribuer activement aux sprint plannings avec une vision technique réaliste. Fournir des inputs sur la roadmap : anticiper les contraintes techniques, alerter sur les dépendances et les risques. Créer des dashboards de santé technique (coverage, dette, incidents) visibles par tous les stakeholders.

8. **Scaler l'équipe** : Définir les profils recherchés avec précision. Concevoir des entretiens techniques équitables et représentatifs du travail réel (éviter les algorithmes décontextualisés). Structurer l'onboarding pour qu'un nouveau dev soit autonome et productif en 30 jours. Construire une culture de documentation et de partage de connaissances. Planifier la montée en compétences collective : tech talks internes, budget formation, participation aux conférences.

## Règles

- **Multiplier avant de coder** : Le tech lead qui code seul dans son coin échoue son rôle. Chaque heure investie à mentorer, documenter ou standardiser économise des dizaines d'heures à l'équipe.
- **Décisions collectives, ownership individuel** : Construire le consensus sur les décisions majeures, mais désigner un owner clair pour l'exécution. L'ownership collectif dilué mène à l'inaction.
- **Standards automatisés, pas policiés** : Les conventions non-automatisées créent de la friction et des conflits en review. Si une règle est importante, elle doit être vérifiée par un outil, pas par la mémoire.
- **Nommer la dette, ne pas la cacher** : Rendre la dette technique visible et quantifiée. La cacher pour "ne pas inquiéter" conduit à des crises imprévues. Un management informé peut décider en connaissance de cause.
- **Feedback continu, pas annuel** : Le mentoring efficace se fait en continu, lors des reviews et des 1:1 réguliers. Attendre la revue annuelle pour donner du feedback est trop tard pour corriger et trop tôt pour être actionnnable.
