---
name: game-design-patterns
description: Patterns de conception spécifiques au développement de jeux vidéo. Se déclenche avec "game pattern", "game architecture", "ECS", "game loop", "state machine game", "component pattern", "game programming patterns".
---

# Game Design Patterns

## Workflow

1. **Game Loop et Update** : Concevoir la boucle de jeu principale avec un timestep fixe pour la physique et variable pour le rendu, implémenter le frame-independent movement avec Time.deltaTime, séparer les phases update/fixed update/late update, et gérer la synchronisation entre rendu et simulation.

2. **Component pattern et ECS** : Appliquer la composition plutôt que l'héritage en décomposant les entités en composants indépendants, implémenter l'architecture Entity-Component-System pour la performance et la flexibilité, et explorer Unity DOTS (Data-Oriented Technology Stack) pour les simulations à grande échelle.

3. **State machines** : Implémenter des FSM (Finite State Machines) pour les comportements de personnages (idle, walk, attack, hurt), utiliser des HSM (Hierarchical State Machines) pour les états imbriqués complexes, appliquer le State pattern orienté objet avec des classes d'état interchangeables, et gérer proprement les transitions et les conditions d'entrée/sortie.

4. **Observer et Event system** : Mettre en place un event bus découplé pour la communication entre systèmes, utiliser les delegates et events C# ou les ScriptableObject events pour éviter les dépendances directes, implémenter un système de signals (Zenject, VContainer), et garantir la désinscription des listeners pour éviter les fuites mémoire.

5. **Object pooling** : Créer un pool manager générique pour le spawn/despawn d'entités (bullets, ennemis, effets), préchauffer les pools au chargement de scène pour éliminer les stutters, rendre les pools extensibles avec une politique de croissance configurable, et réinitialiser correctement l'état des objets à leur retour dans le pool.

6. **Command pattern** : Encapsuler les actions joueur en objets Command pour l'input handling découplé, implémenter l'undo/redo pour les éditeurs de niveaux ou puzzles, construire un système de replay en enregistrant la séquence de commandes, et gérer les commandes réseau dans un contexte multijoueur (autoritative server).

7. **Spatial partitioning** : Utiliser le quadtree (2D) ou l'octree (3D) pour accélérer les requêtes spatiales, implémenter un grid spatial pour la détection de collision large phase, appliquer le spatial hashing pour les mondes procéduraux ou très larges, et optimiser les requêtes d'IA (vision, portée) avec ces structures.

8. **Singleton et Service Locator** : Utiliser le Singleton avec précaution pour les managers globaux (AudioManager, GameManager), préférer le Service Locator ou l'injection de dépendances (Zenject, VContainer) pour les architectures testables, identifier les anti-patterns (Singleton sur MonoBehaviour, dépendances circulaires), et structurer l'initialisation des services au démarrage.

## Règles

- Fournis des exemples de code concrets (C#, pseudocode) illustrant chaque pattern dans un contexte de jeu réel.
- Adapte le pattern recommandé au moteur de jeu utilisé (Unity, Godot, Unreal) et à ses spécificités.
- Priorise la lisibilité et la maintenabilité du code, et souligne les compromis performance/architecture de chaque pattern.
- Mentionne les outils et frameworks recommandés : Unity DOTS, Zenject, VContainer, Mirror (multijoueur).
- Signale quand un pattern est sur-ingénieuré pour le contexte et propose une solution plus simple si appropriée.
