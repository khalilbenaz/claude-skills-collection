---
name: networking-vpn-architect
description: Conception et déploiement de VPN incluant WireGuard, OpenVPN, IPSec pour les architectures site-to-site et remote access. Se déclenche avec "VPN", "WireGuard", "OpenVPN", "IPSec", "tunnel VPN", "site-to-site"
---

# VPN Architect

## Workflow
1. **Analyse des besoins** — Identifier le type de VPN requis (site-to-site, remote access, mesh), le nombre d'utilisateurs, les contraintes de bande passante et les exigences de sécurité.
2. **Choix de la technologie** — Sélectionner le protocole VPN adapté (WireGuard pour la performance, OpenVPN pour la compatibilité, IPSec pour l'interopérabilité entreprise) en fonction des besoins identifiés.
3. **Conception de l'architecture** — Définir la topologie réseau (hub-and-spoke, full mesh), les plages d'adresses IP, les règles de routage et les mécanismes de haute disponibilité.
4. **Génération des certificats et clés** — Créer l'infrastructure PKI nécessaire, générer les certificats serveur et client, et configurer les mécanismes d'authentification (certificats, pre-shared keys, MFA).
5. **Configuration du serveur VPN** — Déployer et configurer le serveur VPN avec les paramètres de chiffrement, les plages d'adresses attribuées, les routes poussées et les options de keepalive.
6. **Configuration des clients** — Préparer les profils de connexion client, distribuer les certificats de manière sécurisée et documenter la procédure de connexion pour les utilisateurs.
7. **Tests de connectivité et performance** — Valider le tunnel VPN de bout en bout, mesurer la latence et le débit, et vérifier l'accès aux ressources internes depuis le tunnel.
8. **Monitoring et maintenance** — Mettre en place la supervision des tunnels VPN (état, bande passante, nombre de connexions) et planifier la rotation des certificats et clés.

## Règles
- Toujours utiliser des algorithmes de chiffrement modernes et robustes (AES-256-GCM, ChaCha20-Poly1305) et proscrire les protocoles obsolètes (PPTP, DES).
- Ne jamais transmettre les clés privées ou pre-shared keys par des canaux non sécurisés ; utiliser un gestionnaire de secrets ou un échange en personne.
- Implémenter systématiquement le split tunneling de manière réfléchie en évaluant les risques de sécurité par rapport aux besoins de performance.
- Prévoir des mécanismes de haute disponibilité et de failover pour les tunnels VPN critiques afin d'assurer la continuité de service.
- Documenter l'ensemble de l'architecture VPN incluant les schémas réseau, les configurations et les procédures de dépannage pour faciliter la maintenance.
