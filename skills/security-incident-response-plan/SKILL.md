---
name: security-incident-response-plan
description: Plan de réponse aux incidents de sécurité — préparation, détection, containment, éradication, recovery et lessons learned. Se déclenche avec "incident response", "plan de réponse", "breach", "compromission", "réponse à incident", "CSIRT".
---

# Plan de Réponse aux Incidents

## Workflow

1. **Préparer l'organisation** — Constituer l'équipe CSIRT avec les rôles définis (incident manager, analyste forensique, communicant, juridique), maintenir les contacts d'urgence à jour, préparer les outils forensiques (kits d'analyse, images de référence), et organiser des exercices de simulation réguliers (tabletop exercises).

2. **Détecter et analyser** — Identifier l'incident via les sources de détection (SIEM, EDR, IDS/IPS, signalement utilisateur, threat intelligence), évaluer la sévérité initiale, classifier le type d'incident (malware, ransomware, exfiltration, DDoS, insider threat), et déclencher le niveau d'escalade approprié.

3. **Contenir la menace** — Appliquer le containment à court terme : isoler les systèmes compromis du réseau, bloquer les vecteurs d'attaque identifiés, désactiver les comptes compromis, et préserver les preuves forensiques. Déployer le containment à long terme : appliquer les correctifs, renforcer les contrôles d'accès.

4. **Éradiquer la cause** — Supprimer complètement la menace : nettoyer les malwares, fermer les backdoors, révoquer les accès non autorisés, corriger les vulnérabilités exploitées, et valider l'éradication complète par un scan approfondi de l'infrastructure impactée.

5. **Restaurer les opérations** — Remettre en service les systèmes de manière contrôlée : restaurer depuis des backups vérifiés, appliquer les configurations durcies, surveiller intensivement les systèmes restaurés pour détecter toute résurgence, et valider le fonctionnement nominal avec les équipes métier.

6. **Communiquer** — Gérer la communication interne (direction, équipes IT, employés) et externe (clients, régulateurs, autorités, presse) selon le plan de communication de crise. Respecter les obligations légales de notification (RGPD 72h, réglementations sectorielles).

7. **Conduire le retour d'expérience** — Organiser la réunion post-mortem dans les 5 jours suivant la clôture : analyser la timeline complète, identifier les points d'amélioration (détection, réponse, communication), mettre à jour les playbooks, et planifier les actions correctives avec des responsables et des échéances.

## Règles

- Documente chaque action avec horodatage précis dès le début de l'incident — la traçabilité est essentielle pour l'analyse post-mortem et les obligations légales.
- Ne tente jamais de restaurer un système compromis sans avoir d'abord collecté les preuves forensiques et identifié la cause racine.
- Respecte strictement les obligations légales de notification (RGPD, réglementations sectorielles) — le non-respect expose l'organisation à des sanctions.
- Teste le plan de réponse aux incidents au minimum deux fois par an avec des exercices de simulation impliquant toutes les parties prenantes.
- Applique le principe du besoin d'en connaître pour la communication sur l'incident — ne divulgue les détails techniques qu'aux personnes habilitées.
