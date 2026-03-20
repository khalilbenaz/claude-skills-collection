# 🚀 Guide de démarrage

## Qu'est-ce qu'un Skill Claude ?

Un skill est un fichier d'instructions (`SKILL.md`) qui donne à Claude un workflow spécialisé pour une tâche précise. Au lieu de répondre de manière générale, Claude suit un processus structuré étape par étape.

**Exemple** : au lieu de demander "aide-moi avec mon CV", le skill `cv-builder` guide Claude à travers un processus complet : profil → structure → optimisation → checklist qualité.

---

## Installation d'un skill

### Méthode 1 — Fichier .skill (recommandé)
1. Téléchargez le fichier `.skill` depuis les [Releases](../../releases)
2. Dans Claude.ai, ouvrez les **Paramètres** (icône engrenage)
3. Allez dans la section **Skills**
4. Cliquez sur **Ajouter un skill** et sélectionnez le fichier `.skill`
5. Le skill est maintenant actif

### Méthode 2 — Depuis le code source
1. Clonez ce repo : `git clone https://github.com/khalilbenaz/claude-skills-collection.git`
2. Naviguez vers le skill souhaité (ex: `dev-skills/code-reviewer/`)
3. Compressez le dossier en `.zip`
4. Renommez l'extension `.zip` en `.skill`
5. Importez dans Claude

### Méthode 3 — Copier-coller
1. Ouvrez le fichier `SKILL.md` du skill souhaité
2. Copiez tout le contenu
3. Dans Claude.ai, collez-le dans les instructions personnalisées ou le projet

---

## Utilisation

Une fois installé, le skill se déclenche **automatiquement** quand vous écrivez quelque chose qui correspond à sa description. Exemples :

| Vous écrivez... | Skill déclenché |
|-----------------|----------------|
| "J'ai mal au ventre depuis 3 jours" | symptom-tracker |
| "Review ce code Python" | code-reviewer |
| "Je veux économiser 5000 DH" | savings-goal-planner |
| "Je suis épuisé par le travail" | burnout-assessment |
| "Prépare mon entretien chez Google" | interview-prep |

---

## Désinstallation

Dans les paramètres de Claude → Skills → cliquez sur le skill → **Supprimer**.

---

## FAQ

**Q : Puis-je installer plusieurs skills en même temps ?**
R : Oui, chaque skill se déclenche indépendamment selon le contexte.

**Q : Les skills fonctionnent-ils en anglais ?**
R : Ils sont conçus en français mais Claude s'adaptera si vous écrivez en anglais.

**Q : Un skill peut-il se tromper ?**
R : Les skills guident la structure de la réponse, mais Claude peut toujours faire des erreurs. Vérifiez toujours les informations importantes.

**Q : Comment créer mon propre skill ?**
R : Consultez le guide [CREATING_SKILLS.md](./CREATING_SKILLS.md).
