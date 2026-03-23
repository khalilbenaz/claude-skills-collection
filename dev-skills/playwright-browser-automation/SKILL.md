---
name: playwright-browser-automation
description: Automatisation de navigateur via Playwright MCP — naviguer, cliquer, remplir des formulaires, prendre des captures d'écran et déboguer des pages web. À utiliser quand l'utilisateur veut interagir avec un navigateur, tester une interface ou automatiser des actions web. Se déclenche aussi avec "ouvre cette page", "teste le formulaire", "automatise le navigateur", "capture d'écran de la page", "remplis le formulaire".
---

# Automatisation Navigateur avec Playwright

## Workflow

1. **Navigation** : accéder à la page cible via son URL.
2. **Inspection** : obtenir la structure de la page (arbre d'accessibilité) avant toute interaction.
3. **Interaction** selon le besoin :
   - **Formulaires** : identifier les champs, les remplir, soumettre
   - **Navigation multi-étapes** : cliquer, attendre le chargement, enchaîner les actions
   - **Débogage** : consulter les messages console, les requêtes réseau, évaluer du JavaScript
4. **Vérification** : valider le résultat (message de succès, changement de page, absence d'erreurs).

## Bonnes pratiques

### Inspection vs Capture d'écran

| Besoin | Outil |
|--------|-------|
| Comprendre la structure, trouver des éléments | Snapshot (structuré, avec identifiants) |
| Vérifier l'apparence visuelle, bugs CSS | Capture d'écran (image visuelle) |
| Les deux | Snapshot d'abord, puis capture si nécessaire |

### Interaction avec les formulaires

- **Champ unique** : remplir directement avec le texte voulu
- **Plusieurs champs** : utiliser le remplissage groupé pour plus d'efficacité
- **Menu déroulant** : sélectionner par la valeur de l'option
- Toujours vérifier le résultat après soumission (message de succès, erreurs)

### Débogage web

1. Naviguer vers la page problématique
2. Consulter en parallèle :
   - Les messages de la console JavaScript (erreurs, warnings)
   - Les requêtes réseau (appels API échoués, codes de statut)
3. Inspecter la structure de la page pour identifier les états d'erreur
4. Exécuter du JavaScript personnalisé si nécessaire

## Dépannage

| Problème | Solution |
|----------|----------|
| Navigateur non démarré | Installer le navigateur, puis naviguer vers une URL simple |
| Éléments introuvables après navigation | Attendre le chargement du contenu asynchrone avant d'inspecter |
| Sortie trop volumineuse | Naviguer vers une sous-page ou interroger des éléments spécifiques |
| Domaines internes inaccessibles | Utiliser l'adresse locale directe (ex: 127.0.0.1) |

## Règles
- Toujours inspecter la page **avant** d'interagir avec ses éléments.
- Préférer l'inspection structurée aux captures d'écran pour l'automatisation.
- Attendre le chargement complet avant de valider un résultat.
- Ne jamais supposer la structure d'une page — toujours vérifier d'abord.
