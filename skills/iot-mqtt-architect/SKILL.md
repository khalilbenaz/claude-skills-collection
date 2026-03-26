---
name: iot-mqtt-architect
description: Architecture de messaging IoT avec MQTT incluant brokers, topics, QoS, sécurité et patterns. Se déclenche avec "MQTT", "broker MQTT", "Mosquitto", "IoT messaging", "topic MQTT", "QoS".
---

# MQTT Architect

## Workflow
1. **Analyse de l'architecture IoT** — Identifier les appareils, les flux de données, les contraintes de bande passante et les exigences de fiabilité du système
2. **Conception de la hiérarchie de topics** — Définir une structure de topics claire et extensible (ex: site/zone/device/metric) avec des conventions de nommage cohérentes
3. **Configuration du broker** — Installer et configurer le broker MQTT (Mosquitto, EMQX, HiveMQ) avec les paramètres de performance, persistance et clustering
4. **Définition des niveaux QoS** — Attribuer le niveau de qualité de service approprié (QoS 0, 1 ou 2) à chaque flux selon la criticité des données
5. **Sécurisation des communications** — Mettre en place TLS/SSL pour le chiffrement, configurer l'authentification (utilisateur/mot de passe, certificats) et les ACL par topic
6. **Implémentation des clients** — Développer les clients MQTT (publish/subscribe) avec gestion de la reconnexion, du last will testament et des messages retenus
7. **Patterns avancés** — Implémenter les patterns adaptés (request/response, fan-out, bridge entre brokers, messages partagés) selon les besoins métier
8. **Monitoring et supervision** — Configurer la surveillance du broker ($SYS topics), les alertes de déconnexion et les métriques de performance

## Règles
- Toujours sécuriser le broker avec TLS et une authentification forte, ne jamais exposer un broker MQTT sans protection
- Concevoir la hiérarchie de topics dès le départ pour supporter la montée en charge sans restructuration
- Utiliser QoS 0 par défaut et ne monter en QoS que pour les messages critiques afin de préserver la bande passante
- Implémenter systématiquement le Last Will Testament pour détecter les déconnexions inattendues des appareils
- Documenter la structure des topics et le format des payloads (JSON recommandé) dans un contrat d'interface partagé
