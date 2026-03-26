---
name: dev-code-documentation-pro
description: Documentation de code avec commentaires, docstrings et annotations de qualité. Se déclenche avec "documenter mon code", "commentaires", "docstring", "JSDoc", "XML doc", "annotations", "code comments", "autodoc".
---

# Code Documentation Pro

## Workflow

1. **Adopter la bonne philosophie** : Le code bien écrit s'auto-documente en partie (noms clairs, fonctions courtes). Commenter le POURQUOI (intention, contexte métier, contrainte) jamais le COMMENT (ce que le code dit déjà). Un commentaire qui répète le code est du bruit. Un commentaire qui explique une décision non-évidente est de la valeur.

2. **Rédiger des docstrings et JSDoc de qualité** : Utiliser le format standard du langage (Google style / NumPy style en Python, JSDoc en JS/TS, XML doc comments en C#, Javadoc en Java). Documenter systématiquement : description courte, paramètres avec types et rôle, valeur de retour, exceptions levées, exemples d'usage. Ne pas documenter l'évident.

3. **Écrire des commentaires utiles** : Indiquer la complexité algorithmique (O(n log n)) quand elle n'est pas triviale. Expliquer les workarounds et hacks avec un lien vers l'issue ou le bug tracker. Préfixer les TODO/FIXME avec l'auteur, la date et le contexte (`// TODO(alice, 2024-03): supprimer après migration v3`). Lier vers la documentation externe quand pertinent.

4. **Exploiter types et interfaces comme documentation** : Les types TypeScript, les type hints Python et les génériques C# sont de la documentation exécutable. Préférer des types expressifs (`UserId` vs `string`, `EmailAddress` vs `string`). Les interfaces et contrats de types communiquent l'intention mieux qu'un commentaire.

5. **Ajouter des exemples dans les docstrings** : Inclure un bloc `Examples` ou `@example` dans chaque docstring de fonction publique non-triviale. Les doctest Python sont exécutables et vérifiables. Les exemples dans les docstrings deviennent la première documentation que le dev lit dans son IDE.

6. **Générer la documentation automatiquement** : Configurer les outils selon le stack : Swagger/OpenAPI pour les APIs REST, TypeDoc pour TypeScript, Doxygen pour C/C++, Sphinx pour Python, DocFX pour .NET. Intégrer la génération dans le pipeline CI/CD. Publier automatiquement sur GitHub Pages ou un site interne à chaque merge sur main.

7. **Documenter l'architecture du code** : Ajouter un README.md dans chaque package/module important expliquant son rôle, ses dépendances et son fonctionnement global. Maintenir des diagrammes C4 pour les composants majeurs. Documenter les invariants, pré-conditions et post-conditions des modules critiques (sécurité, paiement, données sensibles).

8. **Faire des revues de documentation** : Inclure la documentation dans les critères d'acceptance des PRs. Vérifier lors des code reviews : nouveaux paramètres documentés, nouvelles exceptions listées, exemples à jour, liens fonctionnels. Utiliser des outils de lint de documentation (pydocstyle, ESLint jsdoc plugin). Organiser des revues trimestrielles de complétude sur les modules publics.

## Règles

- **Commenter le POURQUOI uniquement** : Le code montre le quoi et le comment. Les commentaires expliquent les décisions, contraintes et intentions non-déductibles du code seul.
- **Format standard par langage** : Utiliser le format officiel de l'écosystème (JSDoc, Google style, XML doc) pour bénéficier de l'intégration IDE et des outils de génération.
- **Documentation = critère de qualité** : Une PR qui ajoute une API publique sans docstring est incomplète. La documentation fait partie du code livré, pas d'une tâche optionnelle séparée.
- **Tests comme documentation vivante** : Des tests bien nommés (`should_return_404_when_user_not_found`) documentent le comportement attendu et restent toujours à jour puisqu'ils s'exécutent.
- **Automatiser pour maintenir** : La documentation non-automatisée se dégrade. Générer, déployer et vérifier la documentation en CI garantit sa fraîcheur et sa cohérence.
