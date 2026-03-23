---
name: graphql-builder
description: Conception et implémentation de schémas et résolveurs GraphQL. Se déclenche avec "GraphQL", "schema", "query", "mutation", "subscription", "resolver", "Apollo", "Hot Chocolate".
---

# GraphQL Builder

## Workflow
1. **Design du schéma** : Définir les types scalaires, objets, interfaces et unions ; concevoir les queries (lecture), mutations (écriture) et subscriptions (temps réel) ; créer les input types pour les mutations afin de garantir la validation côté serveur.
2. **Résolution efficace** : Implémenter le pattern DataLoader pour éliminer le problème N+1 (batching des requêtes DB par identifiants) ; mettre en cache les résultats des DataLoaders dans le scope de la requête ; éviter les résolveurs qui font des appels en cascade.
3. **Pagination** : Adopter le pattern Relay Connections (`edges`, `node`, `cursor`, `pageInfo`) pour une pagination cursor-based standardisée ; fournir aussi `totalCount` quand c'est nécessaire ; documenter les limites maximales.
4. **Authentification et autorisation** : Protéger le schéma via directives custom (`@auth`, `@hasRole`), middleware de contexte (injection du user dans le contexte GraphQL), ou field-level resolvers avec vérification de permissions ; ne jamais exposer des champs sensibles sans contrôle.
5. **Error handling** : Distinguer les erreurs techniques (exceptions non gérées) des erreurs métier ; utiliser les union types pour les erreurs métier (`union CreateUserResult = User | EmailAlreadyExists | ValidationError`) ; enrichir via `extensions` pour les codes d'erreur custom.
6. **Subscriptions et real-time** : Implémenter les subscriptions via WebSocket (protocole `graphql-ws`) ou server-sent events ; utiliser un bus de messages (Redis Pub/Sub, in-memory EventEmitter) pour la diffusion multi-instance ; gérer proprement la déconnexion.
7. **Schema stitching ou federation** : Pour les microservices, préférer Apollo Federation (sous-graphes avec `@key`, `@extends`, `@external`) plutôt que le stitching manuel ; définir clairement les boundaries de chaque sous-graphe.
8. **Performance** : Analyser la complexité des queries (depth limiting, complexity scoring) pour prévenir les attaques par requêtes profondes ; implémenter les persisted queries (hash côté client) pour réduire la bande passante et améliorer la sécurité en production.

## Règles
- Fournis des exemples de schéma SDL et de code résolveur concrets dans le framework de l'utilisateur (Apollo Server, Hot Chocolate, Strawberry, etc.)
- Adapte les patterns au langage cible (TypeScript/Node.js, C#/.NET, Python, etc.)
- Toujours mentionner les trade-offs (ex. federation = complexité opérationnelle, mais scalabilité d'équipe)
- Commence par la solution simple avant la complexe (schéma monolithique avant federation)
- Souligne quand REST serait plus adapté que GraphQL (cas d'usage simples ou fichiers/uploads)
