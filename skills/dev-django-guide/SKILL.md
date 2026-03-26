---
name: dev-django-guide
description: Développement d'applications Python Django avec models, views, templates, ORM, admin et Django REST Framework. Se déclenche avec "Django", "Django REST", "DRF", "ORM Django", "model Django", "vue Django".
---

# Guide Django

## Workflow

1. **Analyser le besoin** — Identifier le type de projet (API REST, application web monolithique, back-office) et déterminer l'architecture adaptée : Django classique avec templates, Django REST Framework pour les APIs, ou une approche hybride.

2. **Structurer le projet** — Organiser en applications Django découplées (`django-admin startapp`), chaque app ayant ses models, views, serializers, urls et tests. Séparer la configuration dans `settings/` (base, dev, prod) et centraliser les URLs dans le projet principal.

3. **Concevoir les models** — Définir les models avec les champs Django typés, les relations (`ForeignKey`, `ManyToManyField`, `OneToOneField`), les contraintes (`unique_together`, `CheckConstraint`), les managers custom et les méthodes `__str__`, `get_absolute_url`, et `clean()`.

4. **Implémenter les vues et serializers** — Utiliser les class-based views (`APIView`, `ViewSet`, `ModelViewSet`) pour DRF ou les generic views Django. Créer les serializers avec validation, les permissions custom, et les filtres avec `django-filter`.

5. **Configurer l'ORM et les migrations** — Écrire des querysets optimisés avec `select_related()`, `prefetch_related()`, les annotations et agrégations (`annotate`, `aggregate`). Créer les migrations avec `makemigrations` et gérer les data migrations pour les transformations de données.

6. **Personnaliser l'admin** — Configurer le `ModelAdmin` avec `list_display`, `list_filter`, `search_fields`, les inlines, les actions custom et les fieldsets. Créer des admin views custom pour les tableaux de bord et les rapports.

7. **Sécuriser et authentifier** — Implémenter l'authentification avec le système intégré Django ou JWT pour DRF, configurer les permissions par vue, activer CSRF, gérer les CORS, et utiliser `django-allauth` pour l'authentification sociale.

8. **Tester et déployer** — Écrire des tests avec `TestCase` et `APITestCase`, utiliser les fixtures et factories (`factory_boy`), configurer Gunicorn + Nginx, les variables d'environnement avec `django-environ`, et les tâches asynchrones avec Celery.

## Règles

- Utilise toujours `select_related()` et `prefetch_related()` pour éviter le problème N+1 queries dans les vues et serializers.
- Ne place jamais de logique métier dans les vues — encapsule-la dans les models, les managers ou des services dédiés.
- Valide systématiquement les données au niveau du serializer ou du formulaire avant toute opération en base de données.
- Écris les migrations de manière idempotente et réversible — utilise `RunPython` avec une fonction `reverse_code` pour les data migrations.
- Ne stocke jamais les secrets (clés API, mots de passe) dans `settings.py` — utilise les variables d'environnement avec `django-environ` ou `python-decouple`.
