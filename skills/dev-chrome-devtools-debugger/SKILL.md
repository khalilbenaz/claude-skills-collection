---
name: dev-chrome-devtools-debugger
description: Débogage et automatisation de navigateur via Chrome DevTools. Inspecter des pages, analyser les performances, surveiller le réseau et automatiser des interactions. À utiliser quand l'utilisateur veut déboguer une page web, analyser les performances ou inspecter les requêtes réseau. Se déclenche aussi avec "devtools", "debug navigateur", "inspecter la page", "performances web", "requêtes réseau", "console chrome".
---

# Débogueur Chrome DevTools

## Workflow

1. **Navigation** : accéder à la page cible.
2. **Sélection de page** : lister les pages disponibles et sélectionner la bonne.
3. **Inspection** : prendre un snapshot pour comprendre la structure (arbre d'accessibilité avec identifiants uniques).
4. **Action** selon le besoin :
   - Déboguer des erreurs (console, réseau)
   - Analyser les performances (traces)
   - Automatiser des interactions (clic, saisie, navigation)
5. **Vérification** : valider le résultat visuellement ou structurellement.

## Patterns de débogage

### Erreurs JavaScript

1. Naviguer vers la page problématique
2. Consulter les messages de la console pour les erreurs et warnings
3. Inspecter la structure de la page pour identifier les éléments en erreur
4. Exécuter du JavaScript personnalisé pour investiguer davantage

### Problèmes réseau

1. Naviguer vers la page
2. Analyser les requêtes réseau :
   - Requêtes échouées (4xx, 5xx)
   - Requêtes lentes
   - Requêtes bloquées (CORS, CSP)
3. Filtrer par type (XHR, Fetch, Script, CSS) pour cibler l'analyse

### Analyse de performance

1. Lancer un trace de performance sur la page
2. Identifier les goulots d'étranglement :
   - Scripts longs (Long Tasks)
   - Layout thrashing
   - Repaints excessifs
3. Proposer des optimisations ciblées

## Bonnes pratiques

### Choix de l'outil d'inspection

| Besoin | Outil |
|--------|-------|
| Automatisation, trouver des éléments | Snapshot (texte, rapide, avec identifiants) |
| Vérification visuelle | Capture d'écran (quand l'utilisateur doit voir l'état visuel) |
| Données absentes de l'arbre d'accessibilité | Exécution de script JavaScript |

### Optimisation des performances

- Utiliser la pagination et le filtrage pour minimiser les données récupérées
- Sauvegarder les sorties volumineuses dans des fichiers
- Ne pas prendre de capture d'écran systématiquement — préférer les snapshots

### Ordre des opérations

Toujours respecter : **Naviguer → Attendre → Inspecter → Interagir**

## Règles
- Toujours prendre un snapshot avant d'interagir avec des éléments.
- Respecter l'ordre des opérations (naviguer → attendre → inspecter → interagir).
- Préférer les snapshots aux captures d'écran pour le débogage structurel.
- Si DevTools MCP ne suffit pas, orienter vers l'interface Chrome DevTools native.
