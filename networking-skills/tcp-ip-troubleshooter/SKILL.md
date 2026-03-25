---
name: tcp-ip-troubleshooter
description: Diagnostic et résolution de problèmes réseau TCP/IP incluant latence, perte de paquets, DNS et routing. Se déclenche avec "TCP/IP", "problème réseau", "latence réseau", "ping", "traceroute", "DNS", "perte de paquets"
---

# TCP/IP Troubleshooter

## Workflow
1. **Identification du symptôme** — Recueillir les informations sur le problème signalé (lenteur, timeout, connexion refusée, résolution échouée) et déterminer la couche OSI potentiellement concernée.
2. **Vérification de la connectivité de base** — Exécuter des tests `ping` vers la passerelle locale, le DNS et la cible distante pour isoler le segment défaillant.
3. **Analyse du chemin réseau** — Utiliser `traceroute` / `tracert` pour identifier les sauts problématiques, la latence par noeud et les boucles de routage éventuelles.
4. **Diagnostic DNS** — Vérifier la résolution de noms avec `nslookup` ou `dig`, contrôler les serveurs DNS configurés et tester les résolutions directes et inverses.
5. **Inspection des interfaces et routes** — Examiner la configuration IP (`ip addr`, `ifconfig`), la table de routage (`ip route`, `route -n`) et les métriques des interfaces réseau.
6. **Analyse des paquets** — Capturer le trafic avec `tcpdump` ou Wireshark pour identifier les retransmissions TCP, les paquets fragmentés ou les connexions bloquées.
7. **Vérification des services et ports** — Utiliser `netstat`, `ss` ou `telnet` pour confirmer que les services écoutent sur les bons ports et que les connexions sont établies.
8. **Documentation et remédiation** — Consigner les résultats du diagnostic, appliquer le correctif approprié et valider la résolution du problème avec des tests de bout en bout.

## Règles
- Toujours commencer par les tests les plus simples (ping local) avant de passer aux diagnostics avancés, en procédant couche par couche du modèle OSI.
- Ne jamais modifier la configuration réseau en production sans avoir documenté l'état actuel et préparé un plan de rollback.
- Utiliser les outils natifs du système d'exploitation en priorité avant de recourir à des outils tiers pour garantir la reproductibilité.
- Corréler les résultats de plusieurs outils de diagnostic pour confirmer la cause racine avant de proposer une solution.
- Inclure les timestamps et les résultats bruts des commandes dans chaque rapport de diagnostic pour assurer la traçabilité.
