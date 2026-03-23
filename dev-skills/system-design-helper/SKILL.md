---
name: system-design-helper
description: Aide à la conception de systèmes à grande échelle. Se déclenche avec "system design", "architecture système", "concevoir un système", "comment architecturer", "high availability", "load balancing", "scalability".
---

# System Design Helper

## Workflow
1. Clarification des requirements (fonctionnels, non-fonctionnels, contraintes) — définir le périmètre exact avant tout design : quelles fonctionnalités, quels SLAs, quelles contraintes réglementaires
2. Estimations de charge (QPS, storage, bandwidth, DAU/MAU) — calculer les ordres de grandeur pour guider les choix techniques (read-heavy vs write-heavy, stockage chaud/froid)
3. Design de haut niveau (composants principaux, flux de données) — produire un schéma avec les blocs fonctionnels, les bases de données, les caches et les points d'entrée
4. Deep dive sur les composants critiques (DB choice, cache strategy, CDN) — justifier le choix de chaque technologie clé selon les requirements (SQL vs NoSQL, Redis vs Memcached)
5. Conception de la scalabilité (horizontal/vertical, sharding, partitioning, replication) — détailler la stratégie de montée en charge pour chaque composant critique
6. Haute disponibilité et tolérance aux pannes (failover, redundancy, DR) — définir les RPO/RTO, les stratégies multi-région et les procédures de bascule
7. Sécurité et monitoring (auth, rate limiting, alerting, dashboards) — intégrer la sécurité dès la conception (zero trust, encryption at rest/in transit, WAF)
8. Trade-offs documentés et décisions justifiées — lister explicitement ce qui a été sacrifié (coût, cohérence, latence) pour atteindre les objectifs prioritaires

## Règles
- Adapte les recommandations au stack existant de l'utilisateur (.NET, Node, Python, Java...) et à son contexte cloud (AWS, Azure, GCP, on-premise)
- Privilégie la simplicité : ne sur-architecturer que si les estimations de charge ou les SLAs l'imposent réellement
- Fournis toujours des exemples de code ou de configuration concrets pour les composants critiques
- Justifie chaque choix technique avec ses trade-offs (CAP theorem, coût, complexité opérationnelle)
- Documente toutes les décisions sous forme d'ADR et mets en évidence les hypothèses prises
