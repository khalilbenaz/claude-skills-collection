---
name: firewall-configurator
description: Configuration de firewalls et règles de sécurité réseau pour iptables, pfSense, Azure NSG et AWS Security Groups. Se déclenche avec "firewall", "iptables", "pfSense", "NSG", "Security Group", "règles firewall", "ports"
---

# Firewall Configurator

## Workflow
1. **Audit de l'existant** — Recenser les règles de firewall actuellement en place, identifier les politiques par défaut (ACCEPT/DROP) et documenter les flux autorisés.
2. **Définition de la matrice de flux** — Établir la liste complète des flux réseau nécessaires (source, destination, port, protocole) en collaboration avec les équipes applicatives.
3. **Conception des règles** — Rédiger les règles de firewall en respectant le principe du moindre privilège, en ordonnant les règles du plus spécifique au plus général.
4. **Validation en environnement de test** — Déployer les règles sur un environnement de pré-production et vérifier que les flux légitimes passent et que les flux non autorisés sont bloqués.
5. **Déploiement en production** — Appliquer les règles en production avec un plan de rollback prêt, en utilisant les commandes appropriées selon la plateforme (iptables, pfSense, Azure CLI, AWS CLI).
6. **Test de non-régression** — Valider le bon fonctionnement de tous les services après l'application des règles en testant chaque flux de la matrice.
7. **Monitoring et journalisation** — Configurer les logs de firewall pour capturer les connexions refusées et mettre en place des alertes sur les tentatives d'accès suspectes.
8. **Documentation finale** — Mettre à jour la documentation réseau avec les nouvelles règles, les justifications métier et les procédures de modification.

## Règles
- Toujours appliquer une politique par défaut de type DROP/DENY et n'autoriser explicitement que les flux nécessaires (approche whitelist).
- Ne jamais ouvrir de ports sans justification documentée et validation par l'équipe sécurité ; chaque règle doit avoir un commentaire explicatif.
- Tester systématiquement les règles dans un environnement isolé avant tout déploiement en production pour éviter les interruptions de service.
- Maintenir une numérotation et un ordonnancement cohérent des règles pour faciliter la lecture, l'audit et la maintenance future.
- Conserver un historique versionné de toutes les modifications de règles avec la date, l'auteur et la raison du changement.
