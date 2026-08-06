---
name: post-surgery-tracker
description: Suit la récupération après une opération chirurgicale avec suivi structuré des symptômes, douleurs, cicatrisation, médicaments et rendez-vous. À utiliser quand l'utilisateur mentionne une opération récente ou une convalescence. Se déclenche aussi avec "après mon opération", "post-opératoire", "convalescence", "ma cicatrice", "j'ai été opéré", "je suis en convalescence", "récupération après chirurgie", ou toute mention de récupération chirurgicale. Also triggers on "recovery after surgery", "post-op tracking", "wound healing log".
---

# Post-Surgery Tracker

Outil d'organisation pour la convalescence chirurgicale. Ne pose pas de diagnostic, ne modifie pas les consignes médicales, et signale clairement ce qui justifie un contact avec l'équipe soignante.

> ⚠️ Ce suivi est un outil d'organisation uniquement. Suivez toujours les consignes de votre chirurgien ou équipe soignante. En cas de signe d'alerte, contactez votre chirurgien ou les urgences sans attendre.

---

## Étape 1 — Recueil du contexte chirurgical

Commence par poser ces questions (en une seule fois, pas en rafale) :

1. **Type d'intervention** — quelle opération, quelle partie du corps ?
2. **Date de l'opération** — combien de jours se sont écoulés ?
3. **Mode chirurgical** — ambulatoire (retour le jour même) ou hospitalisation avec durée ?
4. **Consignes reçues** — document de sortie, restrictions de mouvement, soins de plaie ?
5. **Traitements prescrits** — antidouleurs, antibiotiques, anticoagulants, autres ?
6. **Contexte de santé** — antécédents notables si l'utilisateur souhaite les mentionner ?

Si l'utilisateur ne connaît pas certaines réponses, continue sans les forcer.

---

## Étape 2 — Saisie du suivi quotidien

Pour chaque journée ou période mentionnée, recueille :

| Champ | Ce qu'on cherche à savoir |
|---|---|
| **Douleur** | Note de 0 (nulle) à 10 (insupportable), localisation, type (sourde, lancinante, brûlure) |
| **Cicatrice / plaie** | Aspect visuel : fermée, rouge, gonflée, suintante, croûte, ecchymose |
| **Température** | Si mesurée ; sinon noter "non mesurée" |
| **Mobilité** | Debout, marche, escaliers, position assise, exercices kiné prescrits |
| **Sommeil / appétit** | Qualité du sommeil, retour de l'appétit normal |
| **Médicaments pris** | Conformité avec les prescriptions (oublis, effets ressentis) |
| **Événement notable** | Rendez-vous, visite de soins, changement de pansement, incident |

Exemple de saisie utilisateur : *"J4 post-op genou : douleur 5/10 le matin, 3/10 après kiné. Cicatrice un peu rouge sur 2 cm. Pas de fièvre. J'ai marché 15 min."*

Exemple de tableau généré :

| Jour | Douleur | Cicatrice | Temp. | Mobilité | Médicaments | Notes |
|------|---------|-----------|-------|----------|-------------|-------|
| J4 | 5→3/10 | Légèrement rouge 2 cm | Non mesurée | Marche 15 min | Conformes | Post-kiné |

---

## Étape 3 — Analyse de progression (si plusieurs jours disponibles)

Quand l'utilisateur fournit des données sur au moins 3 jours, synthétise :

- **Tendance douleur** : diminution attendue, plateau, ou augmentation anormale ?
- **Cicatrisation** : évolution visible (fermeture, changement de couleur) ?
- **Reprise d'activité** : conforme au calendrier de récupération habituel pour ce type de chirurgie ?
- **Observance médicamenteuse** : signaler les oublis d'anticoagulants ou d'antibiotiques (risque réel).

Donne une lecture factuelle de l'évolution, sans conclure à "normal" ou "anormal". Exemple : *"La douleur a diminué de 7/10 à 3/10 sur 5 jours, ce qui est une évolution encourageante. La rougeur signalée mérite d'être mentionnée au prochain contrôle."*

---

## Étape 4 — Signes d'alerte à rappeler systématiquement

Rappelle ces signes à chaque session. S'ils sont présents, recommande de contacter le chirurgien ou les urgences **sans délai** :

**Infection potentielle**
- Fièvre > 38,5 °C persistante plus de 24 h
- Rougeur, chaleur ou gonflement **croissant** autour de la cicatrice
- Écoulement purulent ou malodorant
- Cicatrice qui s'ouvre (déhiscence)

**Douleur anormale**
- Douleur qui augmente nettement après avoir diminué
- Douleur thoracique ou difficulté à respirer

**Complications vasculaires (surtout chirurgie des membres)**
- Mollet gonflé, chaud ou douloureux (signe de phlébite)
- Essoufflement soudain (embolie pulmonaire possible)

**Saignement**
- Saignement actif qui ne s'arrête pas après 10 min de compression
- Pansement trempé de sang rouge vif

Si l'utilisateur décrit l'un de ces signes : **ne pas minimiser, recommander le contact médical immédiat et ne pas poursuivre le suivi comme si tout allait bien.**

---

## Étape 5 — Préparation du prochain rendez-vous

Génère automatiquement :

### Questions personnalisées pour le chirurgien
Basées sur ce qui a été noté, propose 5 questions concrètes. Exemples :
- *"La rougeur autour de ma cicatrice est-elle normale à ce stade ?"*
- *"Puis-je reprendre la conduite automobile à partir de quand ?"*
- *"Mon niveau d'activité actuel (marche 20 min/j) est-il adapté ?"*
- *"Quand puis-je arrêter les bas de contention ?"*
- *"Dois-je continuer le traitement antidouleur ou puis-je le réduire ?"*

### Checklist rendez-vous de suivi habituel
- J8–J15 : retrait des fils ou agrafes (si non résorbables)
- J30 : consultation de contrôle chirurgicale standard
- J45–J90 : reprise kiné ou bilan fonctionnel selon type d'opération
- Au-delà : suivi médecin traitant

---

## Étape 6 — Export / résumé de suivi

Si l'utilisateur veut partager le suivi avec son médecin, génère un résumé structuré :

```
SUIVI POST-OPÉRATOIRE — [Prénom optionnel]
Intervention : [type]  |  Date : [date]  |  Jours écoulés : [N]

ÉVOLUTION
- Douleur : [min]-[max]/10, tendance [↓ / stable / ↑]
- Cicatrice : [description dernière observation]
- Mobilité : [état actuel]
- Médicaments : [conformité]

POINTS À ABORDER AU PROCHAIN RENDEZ-VOUS
1. ...
2. ...

Suivi généré le [date] via outil d'organisation — ne remplace pas l'avis médical.
```

---

## Garde-fous et pièges à éviter

**Ne jamais faire**
- Dire qu'une cicatrice "semble normale" ou "semble infectée" — seul le soignant peut juger.
- Modifier ou relativiser les consignes du chirurgien ("vous pouvez probablement faire X même si ce n'est pas indiqué").
- Recommander une automédication non prescrite.
- Minimiser un signe d'alerte pour ne pas inquiéter.

**Pièges fréquents utilisateurs**
- Comparer leur récupération à celle d'un proche : la variabilité individuelle est grande, éviter la comparaison.
- Arrêter prématurément les anticoagulants ou antibiotiques parce qu'ils "se sentent mieux" — rappeler l'importance de terminer le traitement prescrit.
- Négliger la kiné prescrite parce que c'est douloureux — noter et encourager d'en parler au kinésithérapeute.
- Reprendre une activité physique trop tôt (sport, port de charges) — s'en tenir au calendrier fourni par le chirurgien.

**Bonnes pratiques 2026**
- Proposer de générer un fichier texte ou tableau copiable pour les utilisateurs qui veulent montrer leur suivi à leur équipe soignante.
- Si l'utilisateur mentionne une application de suivi fournie par son établissement de santé (ex. Sillage, Lifen, Doctolib post-op), ne pas se substituer — compléter.
- Les plateformes de téléconsultation permettent un avis rapide sur photo de cicatrice : suggérer cette option si disponible et si un signe inquiète sans être urgent.
