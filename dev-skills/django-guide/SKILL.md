---
name: django-guide
description: Développement d'applications Python Django avec models, views, templates, ORM, admin et Django REST Framework. Se déclenche avec "Django", "Django REST", "DRF", "ORM Django", "model Django", "vue Django". Also triggers on "Django app", "Django ORM query".
---

# Guide Django

## 1. Choisir l'architecture

| Besoin | Architecture recommandée |
|---|---|
| API consommée par SPA/mobile | Django + DRF uniquement (`rest_framework`) |
| Back-office interne | Django + admin personnalisé |
| Application web rendue côté serveur | Django + templates + HTMX |
| Hybride API + pages publiques | Django + DRF + templates pour les pages non-auth |

## 2. Initialiser le projet

```bash
pip install django djangorestframework django-environ
django-admin startproject config .   # config = dossier settings
python manage.py startapp orders     # une app par domaine métier
```

Structure recommandée :
```
project/
  config/
    settings/
      base.py      # commun
      dev.py       # DEBUG=True, SQLite
      prod.py      # ALLOWED_HOSTS, DATABASES Postgres, STATIC_ROOT
    urls.py
    wsgi.py
  orders/
    models.py
    views.py
    serializers.py
    urls.py
    admin.py
    tests/
  manage.py
  .env
```

`config/settings/base.py` :
```python
from environ import Env
env = Env()
Env.read_env()

SECRET_KEY = env("SECRET_KEY")
DATABASES = {"default": env.db()}  # DATABASE_URL=postgres://...
```

## 3. Concevoir les models

```python
from django.db import models
from django.utils.translation import gettext_lazy as _

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING  = "pending",  _("En attente")
        SHIPPED  = "shipped",  _("Expédié")

    reference   = models.CharField(max_length=32, unique=True)
    customer    = models.ForeignKey("users.User", on_delete=models.PROTECT,
                                    related_name="orders")
    status      = models.CharField(max_length=16, choices=Status.choices,
                                    default=Status.PENDING)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [models.Index(fields=["status", "created_at"])]

    def __str__(self):
        return f"Order {self.reference}"

    def clean(self):
        # Validation métier centralisée ici, pas dans la vue
        if self.status == self.Status.SHIPPED and not self.reference:
            raise ValidationError("Reference requise avant expédition.")
```

Migrations :
```bash
python manage.py makemigrations orders
python manage.py migrate
# Data migration
python manage.py makemigrations orders --empty --name backfill_reference
```

Data migration réversible :
```python
def forwards(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(reference="").update(reference="LEGACY")

def backwards(apps, schema_editor):
    pass  # irréversible acceptable si documenté

class Migration(migrations.Migration):
    operations = [migrations.RunPython(forwards, backwards)]
```

## 4. ORM — éviter le N+1

```python
# MAL — N+1
orders = Order.objects.all()
for o in orders:
    print(o.customer.email)  # 1 requête par ligne

# BIEN
orders = Order.objects.select_related("customer").all()

# Relations M2M
orders = Order.objects.prefetch_related("items__product").all()

# Annoter en base plutôt que Python
from django.db.models import Count, Sum
Order.objects.annotate(total=Sum("items__price")).filter(total__gt=100)
```

## 5. DRF — sérializers et ViewSets

```python
# serializers.py
class OrderSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="customer.email", read_only=True)

    class Meta:
        model  = Order
        fields = ["id", "reference", "status", "customer_email", "created_at"]
        read_only_fields = ["created_at"]

    def validate_status(self, value):
        allowed = ["pending", "shipped"]
        if value not in allowed:
            raise serializers.ValidationError(f"Statut invalide. Valeurs : {allowed}")
        return value

# views.py
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ["status"]
    ordering_fields    = ["created_at"]

    def get_queryset(self):
        return Order.objects.select_related("customer")\
                            .filter(customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)
```

```python
# urls.py (app)
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
urlpatterns = router.urls
```

## 6. Admin utile

```python
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ["reference", "customer", "status", "created_at"]
    list_filter   = ["status", "created_at"]
    search_fields = ["reference", "customer__email"]
    raw_id_fields = ["customer"]     # évite le <select> avec milliers d'entrées
    actions       = ["mark_shipped"]

    @admin.action(description="Marquer comme expédié")
    def mark_shipped(self, request, queryset):
        updated = queryset.update(status=Order.Status.SHIPPED)
        self.message_user(request, f"{updated} commande(s) expédiée(s).")
```

## 7. Authentification JWT (DRF)

```bash
pip install djangorestframework-simplejwt
```

```python
# settings/base.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
              "REFRESH_TOKEN_LIFETIME": timedelta(days=7)}
```

```python
# urls.py racine
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
path("api/token/",         TokenObtainPairView.as_view()),
path("api/token/refresh/", TokenRefreshView.as_view()),
```

## 8. Tests

```python
from rest_framework.test import APITestCase
from rest_framework import status

class OrderAPITest(APITestCase):
    def setUp(self):
        self.user  = UserFactory()
        self.order = OrderFactory(customer=self.user)
        self.client.force_authenticate(user=self.user)

    def test_list_returns_own_orders_only(self):
        OrderFactory()  # commande d'un autre user
        r = self.client.get("/api/orders/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["results"]), 1)
```

```bash
pip install factory-boy pytest-django
pytest --reuse-db   # réutilise la DB entre runs pour la vitesse
```

## 9. Déploiement production

```bash
pip install gunicorn whitenoise
# settings/prod.py
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
```

```bash
python manage.py collectstatic --no-input
gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

Variables d'environnement obligatoires en prod :
```
SECRET_KEY=...
DATABASE_URL=postgres://user:pass@host:5432/db
DJANGO_SETTINGS_MODULE=config.settings.prod
ALLOWED_HOSTS=mondomaine.com
```

## Garde-fous / anti-patterns

| Anti-pattern | Problème | Correction |
|---|---|---|
| Logique métier dans la vue | Couplage, non-testable | Service layer ou méthode model |
| `objects.all()` sans filtre en vue liste | Full table scan | Toujours filtrer + paginer |
| `get_or_create` sans `defaults=` | Race condition | Utiliser `update_or_create` ou transaction atomique |
| Migration avec `RunPython` non réversible non documentée | Rollback impossible | Ajouter `reverse_code` ou commenter l'intention |
| `DEBUG=True` en prod | Exposition des stacktraces | Variable d'env + vérification au démarrage |
| Secrets dans `settings.py` | Fuite via repo | `django-environ` ou vault |
| `null=True` sur `CharField` | Deux valeurs "vide" (`""` et `None`) | `blank=True` uniquement sauf FK |
| Serializer `depth=2` en API publique | Sur-exposition de données imbriquées | Champs explicites + `read_only` |

## Bonnes pratiques 2026

- **Django 5.x** : utiliser `GeneratedField` pour colonnes calculées en base, `LoginRequiredMiddleware` au lieu de décorateurs partout.
- Tâches asynchrones : Celery + Redis ou **Django Q2** pour les projets légers.
- Cache : `django.core.cache` + Redis ; décorer les vues coûteuses avec `@cache_page`.
- Observabilité : intégrer `django-silk` en dev pour profiler les requêtes SQL.
- Sécurité headers : `django-csp` + `django-permissions-policy` avant mise en production.
- `django-storages` + S3/Cloudflare R2 pour les fichiers media en production (ne jamais servir les uploads via Django en prod).
