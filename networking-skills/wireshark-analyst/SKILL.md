---
name: wireshark-analyst
description: Analyse de trafic réseau avec Wireshark incluant capture, filtres, protocoles et diagnostic réseau. Se déclenche avec "Wireshark", "capture réseau", "analyse de trafic", "pcap", "packet capture", "tcpdump"
---

# Wireshark Analyst

## Workflow
1. **Définition du périmètre de capture** — Identifier l'interface réseau cible, le type de trafic à analyser et la durée de capture nécessaire pour reproduire le problème.
2. **Configuration des filtres de capture** — Appliquer des filtres BPF (Berkeley Packet Filter) pour limiter le volume de données capturées aux flux pertinents (host, port, protocole).
3. **Lancement de la capture** — Démarrer la capture avec Wireshark ou `tcpdump` en configurant la taille maximale des fichiers, la rotation et le stockage approprié.
4. **Application des filtres d'affichage** — Utiliser les filtres d'affichage Wireshark pour isoler les conversations, protocoles ou anomalies spécifiques (retransmissions TCP, erreurs HTTP, handshakes TLS).
5. **Analyse des flux et conversations** — Examiner les statistiques de conversation, les graphiques d'E/S, les diagrammes de flux et les séquences TCP pour identifier les goulots d'étranglement.
6. **Identification des anomalies** — Repérer les paquets malformés, les retransmissions excessives, les fenêtres TCP réduites, les latences anormales et les erreurs protocolaires.
7. **Corrélation avec les logs applicatifs** — Croiser les résultats de l'analyse réseau avec les journaux applicatifs et système pour confirmer la cause racine du problème.
8. **Rapport d'analyse** — Rédiger un rapport détaillé incluant les captures d'écran pertinentes, les filtres utilisés, les statistiques clés et les recommandations d'amélioration.

## Règles
- Toujours obtenir une autorisation écrite avant de capturer du trafic réseau, car la capture peut contenir des données sensibles ou personnelles soumises à la réglementation.
- Limiter la capture au strict nécessaire en utilisant des filtres BPF précis pour réduire le volume de données et protéger la confidentialité.
- Ne jamais stocker les fichiers pcap contenant des données sensibles sur des supports non chiffrés ou des emplacements accessibles publiquement.
- Utiliser les profils de colonnes et les codes couleur personnalisés dans Wireshark pour accélérer l'identification visuelle des anomalies réseau.
- Supprimer les fichiers de capture après analyse et ne conserver que les extraits pertinents anonymisés dans le rapport final.
