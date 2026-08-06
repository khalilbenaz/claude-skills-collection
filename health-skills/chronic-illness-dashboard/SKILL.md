---
name: chronic-illness-dashboard
description: Aide à organiser le suivi d'une maladie chronique (diabète, hypertension, asthme, thyroïde, etc.) avec tableau de bord structuré. À utiliser quand l'utilisateur mentionne une maladie chronique et veut organiser son suivi. Se déclenche aussi avec "je suis diabétique", "hypertension", "ma thyroïde", "maladie chronique", "suivi longue durée", "mon asthme", ou toute mention de pathologie nécessitant un suivi régulier. Also triggers on "chronic illness tracking", "manage diabetes follow-up", "long-term condition log".
---

# Chronic Illness Dashboard

Ce skill aide à **organiser** le suivi d'une maladie chronique : centraliser les informations, planifier les examens, préparer les consultations. Il ne remplace pas le suivi médical — toutes les cibles et décisions thérapeutiques appartiennent au médecin.

---

## Étape 1 — Identifier la situation

Pose ces questions (une à la fois, en t'adaptant à ce que l'utilisateur a déjà partagé) :

1. **Quelle pathologie** a été diagnostiquée ? (nom exact si connu)
2. **Depuis quand** le suivi est-il en place ? (date ou durée approximative)
3. **Quel spécialiste** assure le suivi référent ? (endocrinologue, cardiologue, pneumologue, généraliste…)
4. **Fréquence actuelle** des consultations et bilans

> Si l'utilisateur dit simplement "je suis diabétique" sans plus de détails, commence par le tableau de bord vide et remplis-le au fur et à mesure de la conversation.

---

## Étape 2 — Inventaire complet

Collecte les informations suivantes avant de construire le tableau :

**Traitements**
- Nom du médicament, dosage, fréquence, heure de prise
- Traitements ponctuels vs permanents
- Compléments ou traitements parallèles (phytothérapie, etc.)

**Examens attendus**
- Bilans sanguins (ex. : HbA1c tous les 3 mois pour le diabète de type 2)
- Imagerie, ECG, spirométrie, fond d'œil…
- Consultations spécialisées planifiées

**Résultats récents**
- Dernières valeurs connues + date de mesure
- Cibles fixées par le médecin (ex. : HbA1c < 7 %, tension < 130/80 mmHg, TSH 0,5–4 mUI/L)

**Symptômes / changements récents**
- Nouveau symptôme, aggravation, effet secondaire suspect

---

## Étape 3 — Tableau de bord

Génère les trois tableaux suivants. Remplis les colonnes avec les données fournies ; laisse vide ce qui n'est pas connu.

### 3a. Constantes et résultats de biologie

| Date | Mesure | Valeur | Cible médicale | Statut | Notes |
|------|--------|--------|----------------|--------|-------|
| — | HbA1c | — | < 7 % | — | — |
| — | Glycémie à jeun | — | 0,7–1,0 g/L | — | — |

*(Adapter les lignes à la pathologie : TSH, tension systolique/diastolique, DEP, créatinine, cholestérol LDL, etc.)*

**Légende statut** : ✅ Dans la cible · ⚠️ Limite · 🔴 Hors cible — à signaler au médecin

### 3b. Calendrier des examens

| Examen | Dernier réalisé | Prochain prévu | Fréquence recommandée | Statut |
|--------|----------------|----------------|-----------------------|--------|
| Bilan sanguin | — | — | Tous les 3 mois | — |
| Fond d'œil | — | — | 1 fois/an | — |

**Règle de remplissage** : Si "Dernier réalisé" + fréquence < aujourd'hui → marquer ⚠️ À planifier.

### 3c. Traitements en cours

| Médicament | Dose | Fréquence | Heure | Depuis | Effets notés |
|-----------|------|-----------|-------|--------|--------------|
| — | — | — | — | — | — |

---

## Étape 4 — Alertes automatiques

À partir des données saisies, signale systématiquement :

- **Examen en retard** : dernier réalisé + fréquence < date du jour
- **Valeur hors cible** : comparer la valeur à la cible fournie par l'utilisateur (cible = celle fixée par le médecin, pas une valeur générique)
- **Médicament sans date de révision** depuis plus de 6 mois
- **Symptôme nouveau** non encore mentionné en consultation

Formulation recommandée :
> "Votre dernier fond d'œil remonte à [date]. Si votre médecin recommande un contrôle annuel, il serait utile de planifier un rendez-vous."

---

## Étape 5 — Fiche consultation

Génère une fiche synthétique (format texte copiable) à emporter au prochain rendez-vous :

```
==== FICHE CONSULTATION — [PRÉNOM] — [DATE] ====

PATHOLOGIE : [nom]
MÉDECIN RÉFÉRENT : [nom / spécialité]

TRAITEMENTS ACTUELS :
  - [Médicament A] [dose] [fréquence]
  - [Médicament B] ...

DERNIÈRES VALEURS :
  - [Mesure] : [valeur] (cible : [cible]) — [date]

EXAMENS À PRÉVOIR :
  - [Examen] : dernier le [date], prochain recommandé : [date]

QUESTIONS POUR LE MÉDECIN :
  1. [Question issue des alertes ou des notes de l'utilisateur]
  2. ...

SYMPTÔMES / CHANGEMENTS RÉCENTS :
  - [Description libre]
===============================================
```

Propose à l'utilisateur de remplir la section "Questions pour le médecin" ensemble avant la consultation.

---

## Exemples concrets par pathologie

| Pathologie | Constantes clés | Examens typiques |
|-----------|----------------|-----------------|
| Diabète type 2 | HbA1c, glycémie à jeun, poids | Bilan lipidique, fond d'œil, créatinine, microalbuminurie |
| Hypertension | TA systolique, TA diastolique, fréquence cardiaque | ECG, bilan rénal, bilan lipidique |
| Asthme | DEP (débit expiratoire de pointe), fréquence des crises | Spirométrie, consultation pneumologue |
| Hypothyroïdie | TSH, T4 libre | Bilan annuel, adaptation Lévothyrox selon TSH |
| Maladie inflammatoire | CRP, VS, NFS | Imagerie selon localisation, suivi rhumato/gastro |

---

## Garde-fous et pièges à éviter

**Ne jamais faire :**
- Suggérer un changement de dose ou d'arrêt de traitement — même si la valeur semble normale
- Interpréter une valeur de biologie comme un diagnostic (ex. : "votre HbA1c élevée signifie que votre diabète est mal équilibré" → à laisser au médecin)
- Utiliser des cibles génériques (normes de laboratoire) à la place des cibles individuelles fixées par le médecin — elles peuvent différer intentionnellement
- Comparer les résultats de l'utilisateur à ceux d'autres personnes

**Pièges courants :**
- L'utilisateur ne connaît pas ses cibles : noter "à confirmer avec le médecin" plutôt qu'une valeur de substitution
- Valeurs dans la cible mais symptômes persistants : orienter vers une consultation, ne pas rassurer à tort
- Plusieurs pathologies concomitantes : créer une section par pathologie, ne pas mélanger les tableaux

---

## Rappel professionnel

> Ce tableau de bord est un outil d'**organisation personnelle**. Il ne remplace pas le jugement clinique de votre médecin. Toute valeur hors cible, symptôme nouveau ou question sur votre traitement doit être discutée avec un professionnel de santé qualifié. En cas de doute urgent, contactez votre médecin ou le 15 (SAMU).
