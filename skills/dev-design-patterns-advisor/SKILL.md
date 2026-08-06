---
name: dev-design-patterns-advisor
description: Conseille le pattern de conception adapté à un problème donné. Se déclenche avec "design pattern", "quel pattern", "singleton", "factory", "observer", "strategy", "SOLID", "pattern adapté". Also triggers on "which design pattern", "refactor to a pattern", "strategy vs factory".
---

# Design Patterns Advisor

## Workflow

1. **Qualifier le problème** — poser 1-2 questions précises sur la douleur actuelle : couplage fort ? code dupliqué ? difficile à tester ? trop de `if/switch` ? besoin d'extension sans modification ?
2. **Classifier le besoin** — mapper sur la bonne famille :
   - **Création** : instanciation complexe, cache d'instances, familles d'objets
   - **Structure** : adapter une interface, décorer un comportement, encapsuler une hiérarchie
   - **Comportement** : algorithmes interchangeables, notifications, état interne variable
   - **Architectural** : séparation UI/logique, CQRS, pipeline de traitement
3. **Proposer 2-3 candidats** avec critères de décision (voir tableau ci-dessous) — pas de liste exhaustive, uniquement ceux pertinents
4. **Implémenter le pattern recommandé** dans le langage du projet — code complet, copiable, commenté
5. **Montrer l'avant/après** — mettre en évidence les gains mesurables (testabilité, lignes supprimées, points d'extension)
6. **Signaler les garde-fous** — cas où le pattern est inutile ou contre-productif
7. **Relier aux principes SOLID** concernés — expliquer le lien de façon pratique

---

## Critères de décision rapide

| Symptôme du code | Famille | Patterns à considérer |
|---|---|---|
| `new ConcreteClass()` éparpillé | Création | Factory Method, Abstract Factory, Builder |
| Une seule instance globale nécessaire | Création | Singleton (avec précaution), Monostate |
| Interfaces incompatibles | Structure | Adapter, Facade |
| Ajout de comportement sans héritage | Structure | Decorator, Proxy |
| Plusieurs algorithmes interchangeables | Comportement | Strategy, Command |
| Couplage fort entre producteur/consommateur | Comportement | Observer, Mediator, Event Bus |
| État interne qui change le comportement | Comportement | State |
| Pipeline de transformations | Comportement | Chain of Responsibility, Pipeline |
| Logique métier + UI mélangées | Architectural | MVC, MVP, MVVM, Clean Architecture |
| Lecture/écriture asymétriques | Architectural | CQRS, Repository |

---

## Exemples concrets par pattern

### Strategy — algorithmes interchangeables

**Avant (if/switch ingérable) :**
```csharp
// Ajout d'une méthode = modifier cette classe
public decimal CalculateFee(string type, decimal amount) {
    if (type == "standard") return amount * 0.02m;
    else if (type == "premium") return amount * 0.01m;
    else if (type == "corporate") return amount * 0.005m;
    throw new ArgumentException();
}
```

**Après (Strategy) :**
```csharp
public interface IFeeStrategy { decimal Calculate(decimal amount); }

public class StandardFee : IFeeStrategy { public decimal Calculate(decimal amount) => amount * 0.02m; }
public class PremiumFee  : IFeeStrategy { public decimal Calculate(decimal amount) => amount * 0.01m; }
public class CorporateFee: IFeeStrategy { public decimal Calculate(decimal amount) => amount * 0.005m; }

public class FeeCalculator(IFeeStrategy strategy) {
    public decimal Calculate(decimal amount) => strategy.Calculate(amount);
}
// Extension = nouvelle classe, zéro modification existante (OCP)
```

### Observer — découplage producteur/consommateur

```typescript
// Implémentation légère sans dépendance externe
type Handler<T> = (payload: T) => void;

class EventBus<T> {
    private handlers: Handler<T>[] = [];
    subscribe(h: Handler<T>) { this.handlers.push(h); }
    publish(payload: T) { this.handlers.forEach(h => h(payload)); }
}

const orderBus = new EventBus<{ orderId: string; amount: number }>();
orderBus.subscribe(({ orderId }) => console.log(`Email confirmation ${orderId}`));
orderBus.subscribe(({ amount }) => updateStats(amount));
orderBus.publish({ orderId: "123", amount: 500 });
```

### Decorator — enrichissement sans héritage

```python
from functools import wraps

def retry(max_attempts=3):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
        return wrapper
    return decorator

@retry(max_attempts=3)
def call_external_api(url: str) -> dict:
    ...  # logique inchangée
```

### Factory Method — instanciation déléguée

```java
// Contexte : création de parsers selon le format de fichier
public interface DocumentParser { Document parse(InputStream in); }

public class ParserFactory {
    public static DocumentParser create(String contentType) {
        return switch (contentType) {
            case "application/pdf"  -> new PdfParser();
            case "text/csv"         -> new CsvParser();
            case "application/json" -> new JsonParser();
            default -> throw new UnsupportedFormatException(contentType);
        };
    }
}
// Ajout d'un format = nouvelle classe + 1 ligne dans le switch
```

### Repository — abstraction de la persistance

```csharp
public interface IOrderRepository {
    Task<Order?> FindById(Guid id);
    Task<IEnumerable<Order>> FindByStatus(OrderStatus status);
    Task Save(Order order);
}

// Implémentation swappable : EF Core, Dapper, mock pour tests
public class EfOrderRepository(AppDbContext ctx) : IOrderRepository {
    public async Task<Order?> FindById(Guid id) => await ctx.Orders.FindAsync(id);
    public async Task Save(Order order) { ctx.Orders.Add(order); await ctx.SaveChangesAsync(); }
    // ...
}
```

---

## Garde-fous et anti-patterns

- **Singleton** : éviter pour tout ce qui a un état mutable ou dépend d'une config runtime — préférer l'injection de dépendances. Le Singleton global tue la testabilité.
- **Over-engineering** : un `if/else` avec 2 branches ne justifie pas un Strategy. Le pattern doit réduire la complexité, pas l'augmenter.
- **Abstract Factory trop tôt** : ne créer une famille d'objets abstraite que si plusieurs variantes coexistent réellement. Sinon : YAGNI.
- **Observer sans cleanup** : toujours prévoir le désabonnement (`unsubscribe`/`Dispose`) — sinon fuites mémoire.
- **Decorator imbriqué en cascade** : au-delà de 3 niveaux, préférer un pipeline explicite ou un middleware pattern.
- **Repository sur un CRUD trivial** : si toute la logique est `GET/POST/PUT/DELETE` sans règle métier, un simple DAO ou l'ORM direct suffit.
- **Pattern sans tests** : chaque pattern introduit une abstraction — écrire les tests avant de refactorer pour valider le comportement est conservé.

---

## Principes SOLID associés

| Principe | Patterns qui l'expriment directement |
|---|---|
| S — Single Responsibility | Facade, Command, Repository |
| O — Open/Closed | Strategy, Decorator, Factory Method |
| L — Liskov Substitution | Template Method, Strategy |
| I — Interface Segregation | Adapter, Proxy |
| D — Dependency Inversion | Factory, Abstract Factory, Repository, tous les patterns à base d'interface |

---

## Bonnes pratiques 2026

- **Préférer la composition à l'héritage** — les langages modernes (Go, Rust, Kotlin, Swift) favorisent les interfaces et traits ; éviter les hiérarchies profondes.
- **Patterns fonctionnels** : en TypeScript/Kotlin/Python, Strategy et Command se réduisent souvent à une simple fonction de premier ordre — pas besoin d'une classe.
- **Architecture hexagonale** : combiner Repository + Domain Events + Use Cases pour isoler le domaine de l'infrastructure.
- **Event-driven par défaut** : dans les microservices, Observer devient un Event Bus (Kafka, Azure Service Bus) — appliquer les mêmes principes de découplage.
- **Valider avec des tests** : après tout refactoring vers un pattern, exécuter la suite de tests existante avant de pousser :
  ```bash
  dotnet test --no-build   # .NET
  npx jest --runInBand     # Node/TS
  pytest -x                # Python
  ```


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
