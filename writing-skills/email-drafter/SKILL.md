---
name: email-drafter
description: Rédige des emails professionnels ou personnels adaptés au contexte et à l'objectif. À utiliser quand l'utilisateur veut écrire un email important. Se déclenche aussi avec "écrire un email", "rédiger un mail", "comment formuler", "email professionnel", "répondre à ce mail".
---

# Email Drafter

## Workflow

### 1. Collecter le contexte (si manquant, poser ces questions en bloc)
- **Destinataire** : interne/externe, niveau hiérarchique, familiarité, culture (FR/EN/autre).
- **Objectif** : informer | demander | relancer | refuser | escalader | convaincre | remercier.
- **Enjeu** : faible / moyen / élevé (détermine le nombre de variantes à proposer).
- **Ton cible** : formel, semi-formel, direct, empathique.
- **Contraintes** : deadline, pièces jointes, confidentialité, CC/BCC.

### 2. Choisir le registre

| Situation | Registre | Vouvoiement |
|---|---|---|
| Client externe inconnu | Formel | Oui |
| Collègue du même niveau | Semi-formel | Selon culture interne |
| Manager / DG | Formel ou selon culture d'entreprise | Oui |
| Partenaire technique récurrent | Direct, concis | Optionnel |
| RH / juridique / escalade | Formel, factuel, neutre | Oui |

### 3. Structurer l'email

**Objet** : `[Action] Sujet — contexte court`
- Bon : `[Décision requise] Renouvellement contrat Acme — avant 28/06`
- Mauvais : `Suite à notre réunion` (trop vague)

**Corps** :
```
Ligne d'accroche (1 phrase) : contexte ou référence
→ Corps : faits / demande / information (3-5 phrases max par paragraphe)
→ CTA explicite : "Pourriez-vous confirmer avant vendredi 27/06 ?"
→ Formule de clôture adaptée au registre
```

**Signature** : Nom — Titre — Téléphone — Entreprise (ne pas omettre pour les externes).

### 4. Rédiger et proposer des variantes

- Enjeu **faible** → 1 version directe.
- Enjeu **moyen** → 1 version + 1 alternative de ton.
- Enjeu **élevé** (conflit, escalade, refus) → 2-3 versions : directe / diplomatique / ferme.

**Exemple — relance de paiement (semi-formel)** :
```
Objet : [Relance] Facture #2026-041 — échéance dépassée

Bonjour [Prénom],

Notre facture #2026-041 du 01/06 (montant : 4 800 €) est arrivée à échéance le 15/06.
Pourriez-vous confirmer la date de règlement prévue, ou nous signaler tout blocage de votre côté ?

Bien cordialement,
[Signature]
```

**Exemple — refus poli (formel)** :
```
Objet : Re : Proposition de partenariat — suite de nos échanges

Madame, Monsieur,

Nous vous remercions de l'intérêt que vous portez à [entreprise].
Après examen attentif, nous ne sommes pas en mesure de donner suite à cette proposition
dans le contexte actuel, notre feuille de route étant engagée jusqu'à fin 2026.
Nous restons ouverts à un contact ultérieur si votre projet évolue.

Cordialement,
[Signature]
```

### 5. Checklist avant livraison

- [ ] Objet : informatif, actionnable, < 60 caractères.
- [ ] Un seul objectif par email.
- [ ] CTA unique, daté si possible.
- [ ] Ton cohérent du début à la fin.
- [ ] Pas de jargon incompréhensible pour le destinataire.
- [ ] CC/BCC justifiés (éviter le "reply-all" inutile).
- [ ] Pièces jointes mentionnées dans le corps ET effectivement présentes.
- [ ] Relecture pour ambiguïtés (négations, conditionnel flou).

---

## Anti-patterns à éviter

| Anti-pattern | Problème | Correction |
|---|---|---|
| Objet vide ou générique ("Bonjour") | Email ignoré ou mal trié | Objet descriptif + action |
| Plusieurs demandes empilées | Destinataire répond à moitié | 1 email = 1 demande |
| Ton passif-agressif ("comme je l'avais déjà indiqué…") | Détériore la relation | Reformuler en neutre factuel |
| Majuscules / CAPS LOCK | Perçu comme agressif | Gras si besoin d'emphase |
| Email émotionnel envoyé à chaud | Dommages relationnels | Rédiger, attendre 1h, relire |
| CC en masse | Dilue la responsabilité | CC = information uniquement, TO = action |
| Formule de politesse absente | Froideur perçue | Toujours conclure, même en interne |

---

## Bonnes pratiques 2026

- **Objet avec tag d'action** : `[Pour info]`, `[Décision requise]`, `[Urgent]`, `[FYI]` — aide les filtres et la priorisation.
- **Réponse dans les 24h** : si pas de réponse possible, accusé de réception avec date de traitement prévue.
- **Plain text > HTML surchargé** : les emails surchargés (images, tableaux) sont filtrés par les antispams et mal rendu sur mobile.
- **Thread control** : si le sujet change, créer un nouveau thread avec un nouvel objet.
- **Confidentialité** : ne jamais transférer un thread interne à un externe sans vérifier les messages précédents du fil.
- **Langue mixte** : si le destinataire est anglophone, rédiger en anglais même si la demande était en français — adapte-toi au destinataire, pas à l'expéditeur.
