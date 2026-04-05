---
name: iot-raspberry-pi-setup
description: Configuration et projets Raspberry Pi incluant OS, GPIO, serveurs et domotique. Se déclenche avec "Raspberry Pi", "RPi", "Raspbian", "GPIO", "domotique", "serveur Raspberry".
---

# Raspberry Pi Setup

## Workflow
1. **Choix du modèle** — Sélectionner le Raspberry Pi adapté au projet (Pi 5, Pi Zero, Pi Pico) selon les besoins en puissance, connectivité et consommation
2. **Installation de l'OS** — Flasher l'image système appropriée (Raspberry Pi OS, Ubuntu Server, DietPi) avec Raspberry Pi Imager et configurer le premier démarrage
3. **Configuration réseau** — Paramétrer le Wi-Fi ou Ethernet, configurer une IP statique, activer SSH et sécuriser l'accès distant
4. **Configuration GPIO** — Installer les bibliothèques GPIO (RPi.GPIO, gpiozero), configurer les pins en entrée/sortie et tester les connexions matérielles
5. **Installation des services** — Déployer les logiciels nécessaires (Home Assistant, Node-RED, Pi-hole, serveur web) et configurer les dépendances
6. **Automatisation** — Créer les scripts de démarrage avec systemd, configurer les tâches cron et mettre en place la supervision des services
7. **Sécurisation** — Changer les mots de passe par défaut, configurer le pare-feu UFW, désactiver les services inutiles et mettre à jour le système
8. **Sauvegarde et maintenance** — Mettre en place des sauvegardes automatiques de la carte SD, planifier les mises à jour et surveiller les ressources système

## Règles
- Toujours sécuriser l'accès SSH avec des clés plutôt que des mots de passe et désactiver l'utilisateur pi par défaut
- Fournir les commandes complètes avec explications pour chaque étape de configuration
- Recommander une alimentation officielle ou certifiée pour éviter les problèmes de sous-tension
- Proposer des solutions de refroidissement adaptées selon la charge prévue (passif, ventilateur, boîtier)
- Inclure un plan de sauvegarde et de récupération en cas de corruption de la carte SD


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
