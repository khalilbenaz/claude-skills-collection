---
name: security-compliance-checker
description: Vérification de conformité sécurité incluant ISO 27001, SOC 2, HIPAA, NIST et audit trail. Se déclenche avec "ISO 27001", "SOC 2", "HIPAA", "NIST", "conformité sécurité", "audit sécurité", "compliance"
---

# Compliance Checker

## Workflow
1. **Identifier les frameworks applicables** — Déterminer les réglementations et standards pertinents selon le secteur, la géographie et les données traitées : ISO 27001 (général), SOC 2 (services cloud), HIPAA (santé), PCI DSS (paiement), NIST CSF (gouvernement US), RGPD (données personnelles EU). Mapper les exigences communes entre frameworks.
2. **Inventorier les contrôles existants** — Auditer les contrôles de sécurité déjà en place : politiques, procédures, configurations techniques, outils. Évaluer chaque contrôle par rapport aux exigences des frameworks ciblés. Identifier les gaps et les non-conformités. Documenter dans une matrice de contrôles.
3. **Évaluer les risques** — Conduire une analyse de risques formelle (méthodologie ISO 27005 ou NIST RMF). Identifier les actifs critiques, les menaces et les vulnérabilités. Calculer le risque résiduel après les contrôles existants. Prioriser les actions de remédiation par niveau de risque.
4. **Implémenter les contrôles manquants** — Déployer les contrôles techniques (chiffrement, MFA, logs, segmentation réseau) et organisationnels (politiques, formations, procédures d'incident). Automatiser les contrôles avec des outils de compliance-as-code (OPA, AWS Config, Azure Policy).
5. **Configurer l'audit trail** — Centraliser tous les logs de sécurité dans un SIEM (Splunk, Sentinel, ELK). Garantir l'intégrité des logs (stockage immuable, chiffrement). Conserver les logs selon les durées réglementaires (minimum 12 mois ISO 27001, 6 ans HIPAA). Configurer les alertes sur les événements critiques.
6. **Automatiser les vérifications continues** — Implémenter des scans de conformité automatisés (AWS Security Hub, Defender for Cloud, Prowler). Configurer des dashboards de conformité en temps réel. Exécuter des tests automatisés sur les configurations (CIS Benchmarks). Déclencher des alertes sur les dérives de conformité.
7. **Préparer les audits** — Constituer les dossiers de preuves par contrôle : captures d'écran, exports de configuration, rapports d'outils, procès-verbaux. Organiser les preuves dans un système centralisé. Conduire des audits internes réguliers pour identifier les problèmes avant l'audit externe.
8. **Maintenir la conformité** — Planifier les revues périodiques des politiques et contrôles (annuelle minimum). Former les collaborateurs sur les exigences de conformité. Suivre les évolutions réglementaires et adapter les contrôles. Documenter les incidents et les actions correctives.

## Règles
- Toujours maintenir une matrice de correspondance entre les contrôles implémentés et les exigences de chaque framework pour éviter les doublons et identifier les gaps.
- Ne jamais considérer la conformité comme un état figé ; implémenter un processus de vérification continue avec des scans automatisés et des revues périodiques.
- Toujours garantir l'intégrité et l'immuabilité des logs d'audit en utilisant un stockage WORM (Write Once Read Many) ou un chaînage cryptographique.
- Documenter chaque exception ou dérogation aux politiques de sécurité avec une justification métier, une approbation formelle et une date de revue.
- Automatiser la collecte de preuves de conformité autant que possible pour réduire la charge des audits et garantir la fraîcheur des données.


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
