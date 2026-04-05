---
name: security-soc-analyst-guide
description: Guide pour analyste SOC — triage d'alertes, investigation, SIEM, indicateurs de compromission et playbooks de réponse. Se déclenche avec "SOC", "analyste SOC", "SIEM", "IoC", "incident de sécurité", "triage sécurité".
---

# Guide Analyste SOC

## Workflow

1. **Trier les alertes** — Recevoir et prioriser les alertes SIEM selon la sévérité (critique, haute, moyenne, basse), le contexte métier de l'asset impacté, et la fiabilité de la source de détection. Éliminer les faux positifs récurrents en ajustant les règles de corrélation.

2. **Qualifier l'incident** — Analyser l'alerte pour déterminer s'il s'agit d'un vrai positif : vérifier les logs sources, corréler avec d'autres événements dans la fenêtre temporelle, enrichir avec les données de threat intelligence (réputation IP, hash de fichier, domaine malveillant).

3. **Investiguer en profondeur** — Collecter les artefacts forensiques : logs réseau (NetFlow, DNS, proxy), logs système (authentification, processus, registre), captures mémoire si nécessaire. Reconstituer la timeline de l'attaque et identifier le vecteur d'entrée initial.

4. **Identifier les indicateurs de compromission** — Extraire les IoCs de l'investigation : adresses IP malveillantes, domaines C2, hashes de malware, chemins de fichiers suspects, commandes exécutées, et comptes compromis. Alimenter la base de threat intelligence interne.

5. **Appliquer le playbook de réponse** — Exécuter le playbook adapté au type d'incident : isoler les systèmes compromis, bloquer les IoCs identifiés (firewall, proxy, EDR), réinitialiser les credentials compromis, et notifier les parties prenantes selon la matrice d'escalade.

6. **Documenter et clôturer** — Rédiger le rapport d'incident avec la timeline complète, les actions prises, l'impact évalué, les IoCs partagés, et les recommandations de remédiation. Mettre à jour les règles SIEM et les playbooks en fonction des enseignements.

7. **Améliorer la détection** — Créer ou affiner les règles de détection SIEM/EDR basées sur les techniques MITRE ATT&CK observées, réduire les faux positifs par tuning des seuils, et développer de nouvelles alertes pour les gaps de couverture identifiés.

## Règles

- Documente chaque étape de l'investigation avec horodatage pour constituer une chaîne de preuves exploitable.
- Corrèle toujours les alertes avec le framework MITRE ATT&CK pour identifier les tactiques, techniques et procédures (TTPs) de l'attaquant.
- N'agis jamais sur un système compromis sans avoir préalablement collecté les artefacts forensiques nécessaires à l'investigation.
- Applique la matrice d'escalade définie — certains incidents nécessitent une notification immédiate au management ou aux autorités.
- Partage les IoCs et les lessons learned avec la communauté SOC pour renforcer la détection collective.


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
