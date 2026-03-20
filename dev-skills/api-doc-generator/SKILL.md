---
name: api-doc-generator
description: Génère une documentation d'API claire et structurée à partir de code, routes ou descriptions. À utiliser quand l'utilisateur veut documenter une API REST, GraphQL ou des endpoints. Se déclenche aussi avec "documente mon API", "swagger", "endpoint documentation", "API docs", ou quand l'utilisateur montre des routes/controllers.
---

# API Doc Generator

## Workflow
1. **Détection** : identifie le framework (Express, FastAPI, Django, Laravel…) et le type d'API.
2. **Extraction** : pour chaque endpoint, documente :
   - Méthode HTTP + URL
   - Description courte
   - Paramètres (path, query, body) avec types et obligatoire/optionnel
   - Headers requis
   - Réponses possibles (200, 400, 401, 404, 500) avec exemples JSON
   - Authentification requise
3. **Format de sortie** : tableau Markdown structuré ou format OpenAPI simplifié.
4. **Exemples** : génère des exemples de requêtes cURL pour chaque endpoint.
5. **Résumé** : table des routes avec méthode, URL et description.

## Règles
- Si le code est incomplet, documente ce qui est visible et signale les trous.
- Adapte le format au besoin (Markdown, OpenAPI YAML, Postman collection).
