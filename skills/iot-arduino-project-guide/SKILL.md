---
name: iot-arduino-project-guide
description: Développement de projets Arduino avec circuits, capteurs, code et communication série. Se déclenche avec "Arduino", "capteur", "servo", "GPIO", "circuit Arduino", "sketch".
---

# Arduino Project Guide

## Workflow
1. **Analyse du besoin** — Identifier le projet IoT visé, les capteurs/actionneurs nécessaires, les contraintes d'alimentation et de communication
2. **Sélection du matériel** — Choisir la carte Arduino adaptée (Uno, Mega, Nano, ESP32) et les composants compatibles (capteurs, shields, modules)
3. **Conception du circuit** — Dessiner le schéma de câblage avec les résistances de protection, les connexions GPIO et l'alimentation appropriée
4. **Développement du sketch** — Écrire le code Arduino avec setup() et loop(), en utilisant les bibliothèques appropriées et une structure modulaire
5. **Communication série** — Configurer le moniteur série pour le débogage, implémenter les protocoles de communication (I2C, SPI, UART) si nécessaire
6. **Calibration des capteurs** — Tester et calibrer chaque capteur individuellement, ajuster les seuils et les filtres de bruit
7. **Intégration et tests** — Assembler le circuit complet, tester les interactions entre composants et valider le comportement global
8. **Optimisation** — Réduire la consommation mémoire, optimiser les boucles, implémenter le mode veille si nécessaire pour l'autonomie

## Règles
- Toujours inclure des résistances de protection et vérifier les tensions avant de connecter un composant
- Commenter le code de manière détaillée et séparer la logique en fonctions réutilisables
- Privilégier les interruptions plutôt que le polling pour les événements critiques en temps réel
- Proposer un schéma de câblage clair avec la liste complète des composants et leurs références
- Tester chaque composant isolément avant l'intégration finale du circuit


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
