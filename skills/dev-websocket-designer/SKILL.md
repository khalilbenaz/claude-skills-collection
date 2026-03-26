---
name: dev-websocket-designer
description: Conception de systèmes temps réel avec WebSocket — SignalR, Socket.io, scaling horizontal et stratégies de reconnexion. Se déclenche avec "WebSocket", "temps réel", "SignalR", "Socket.io", "real-time", "push notifications".
---

# WebSocket Designer

## Workflow

1. **Analyser le besoin temps réel** — Identifier le type d'interaction en temps réel requis (chat, notifications, collaboration live, streaming de données, dashboards) et évaluer les contraintes de latence, volume de messages et nombre de connexions simultanées.

2. **Choisir la technologie** — Sélectionner la solution adaptée au stack : SignalR pour .NET, Socket.io pour Node.js, ou WebSocket natif. Évaluer les alternatives (SSE, long polling) si le WebSocket bidirectionnel n'est pas nécessaire.

3. **Concevoir le protocole de messages** — Définir le format des messages (JSON structuré), les types d'événements (subscribe, unsubscribe, broadcast, direct), les canaux/groupes, et le contrat d'échange entre client et serveur.

4. **Implémenter le serveur** — Créer le hub/serveur WebSocket avec gestion des connexions, authentification (JWT via query string ou premier message), autorisation par canal, et handlers pour chaque type de message.

5. **Implémenter le client** — Développer le client avec connexion automatique, gestion des événements, sérialisation/désérialisation des messages, et file d'attente pour les messages envoyés pendant la déconnexion.

6. **Gérer la reconnexion** — Implémenter une stratégie de reconnexion robuste avec exponential backoff, jitter aléatoire, détection de déconnexion (heartbeat/ping-pong), et synchronisation de l'état après reconnexion (rattrapage des messages manqués).

7. **Scaler horizontalement** — Configurer un backplane pour la distribution des messages entre instances : Redis Pub/Sub pour SignalR, Redis adapter pour Socket.io, ou un message broker (RabbitMQ, Kafka) pour les architectures custom. Gérer les sticky sessions si nécessaire.

8. **Monitorer et sécuriser** — Mettre en place les métriques (connexions actives, messages/sec, latence), les alertes sur les anomalies, le rate limiting par connexion, et la protection contre les abus (taille max des messages, throttling).

## Règles

- Prévois toujours un mécanisme de fallback (SSE ou long polling) pour les environnements où WebSocket est bloqué par des proxys ou firewalls.
- Implémente systématiquement la reconnexion automatique avec exponential backoff — ne laisse jamais une connexion coupée sans tentative de reprise.
- Authentifie chaque connexion WebSocket dès l'établissement et vérifie les autorisations à chaque message reçu.
- Limite la taille et la fréquence des messages côté serveur pour éviter les abus et protéger les ressources.
- Documente le protocole de messages (types, formats, exemples) comme un contrat d'API à part entière.
