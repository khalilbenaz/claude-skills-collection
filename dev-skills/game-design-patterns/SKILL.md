---
name: game-design-patterns
description: Patterns de conception spécifiques au développement de jeux vidéo. Se déclenche avec "game pattern", "game architecture", "ECS", "game loop", "state machine game", "component pattern", "game programming patterns".
---

# Game Design Patterns

## Workflow

### 1. Identifier le besoin avant de choisir un pattern

| Symptôme | Pattern adapté |
|---|---|
| Hiérarchies d'héritage explosives | Component / ECS |
| Stutters de rendu ou physique instable | Game Loop fixe/variable |
| Comportements personnage complexes | FSM / HSM |
| Couplage fort entre systèmes | Observer / Event Bus |
| GC spikes (bullets, ennemis) | Object Pooling |
| Besoin undo/replay/réseau | Command |
| Collisions/IA lentes sur grande map | Spatial Partitioning |
| Manager global difficile à tester | Service Locator / DI |

---

### 2. Game Loop — timestep fixe + rendu variable

Principe : physique/IA à rate fixe (50–60 Hz), rendu aussi vite que possible avec interpolation.

```csharp
// C# pseudocode — double timestep classique
const float FIXED_DT = 0.02f; // 50 Hz
float accumulator = 0f;

void Update(float realDeltaTime)
{
    accumulator += realDeltaTime;
    while (accumulator >= FIXED_DT)
    {
        FixedSimulate(FIXED_DT);   // physique, IA
        accumulator -= FIXED_DT;
    }
    float alpha = accumulator / FIXED_DT; // [0,1] pour interpolation
    Render(alpha);
}
```

**Pièges :**
- Ne jamais utiliser `Time.deltaTime` directement pour la physique.
- Limiter `accumulator` (`maxAccumulator`) pour éviter la "spiral of death".
- Unity : utiliser `FixedUpdate` pour physique, `LateUpdate` pour caméra.

---

### 3. Component Pattern & ECS

**Composition over inheritance** — découper les entités en composants indépendants.

```csharp
// Unity MonoBehaviour — composition classique
public class Player : MonoBehaviour
{
    [SerializeField] HealthComponent health;
    [SerializeField] MovementComponent movement;
    [SerializeField] WeaponComponent weapon;
}
```

**ECS (Unity DOTS) — quand > ~1 000 entités similaires :**

```csharp
// Component (struct pure, zéro allocation)
public struct Velocity : IComponentData { public float3 Value; }

// System
[BurstCompile]
public partial struct MoveSystem : ISystem
{
    public void OnUpdate(ref SystemState state)
    {
        foreach (var (transform, vel) in
            SystemAPI.Query<RefRW<LocalTransform>, RefRO<Velocity>>())
        {
            transform.ValueRW.Position += vel.ValueRO.Value * SystemAPI.Time.DeltaTime;
        }
    }
}
```

**Critères de décision :**
- < 500 entités : MonoBehaviour classique.
- 500–5 000 : Component pattern + pooling.
- > 5 000 entités similaires (crowd, bullets) : DOTS / ECS.

---

### 4. State Machine (FSM / HSM)

```csharp
// Interface état
public interface IState
{
    void Enter();
    void Update();
    void Exit();
}

public class IdleState : IState
{
    private readonly PlayerController ctx;
    public IdleState(PlayerController ctx) => this.ctx = ctx;

    public void Enter() => ctx.Animator.Play("Idle");
    public void Update()
    {
        if (ctx.Input.Move != Vector2.zero)
            ctx.StateMachine.ChangeState(new WalkState(ctx));
    }
    public void Exit() { }
}

// StateMachine générique
public class StateMachine
{
    private IState current;
    public void ChangeState(IState next) { current?.Exit(); current = next; current.Enter(); }
    public void Update() => current?.Update();
}
```

**HSM (Hierarchical)** : utiliser Animator Controller Unity avec sub-state machines, ou la lib **Stateless** (NuGet) pour la logique pure.

**Anti-pattern :** `switch` géant dans `Update()` — illisible dès 5 états, impossible à tester.

---

### 5. Observer / Event Bus

```csharp
// Event Bus statique typé — zéro dépendance directe
public static class EventBus<T>
{
    private static readonly HashSet<IEventListener<T>> listeners = new();

    public static void Subscribe(IEventListener<T> l) => listeners.Add(l);
    public static void Unsubscribe(IEventListener<T> l) => listeners.Remove(l);
    public static void Publish(T e)
    {
        foreach (var l in listeners) l.OnEvent(e);
    }
}

// Usage
EventBus<PlayerDiedEvent>.Publish(new PlayerDiedEvent { Score = 1500 });
```

**Pièges :**
- Toujours Unsubscribe dans `OnDestroy` — les fuites mémoire sont silencieuses.
- Éviter les événements synchrones chaînés (A → B → C → A = stackoverflow).
- Pour Unity : ScriptableObject events (Ryan Hipple pattern) = pas de fuites, inspectable.

---

### 6. Object Pooling

```csharp
// Pool générique Unity (compatible PoolManager 2021+)
public class BulletPool : MonoBehaviour
{
    [SerializeField] Bullet prefab;
    private Queue<Bullet> pool = new();

    public Bullet Get()
    {
        if (pool.Count == 0) Grow(10);
        var b = pool.Dequeue();
        b.gameObject.SetActive(true);
        return b;
    }

    public void Return(Bullet b)
    {
        b.gameObject.SetActive(false);
        pool.Enqueue(b);
    }

    private void Grow(int n)
    {
        for (int i = 0; i < n; i++)
        {
            var b = Instantiate(prefab);
            b.Pool = this;
            b.gameObject.SetActive(false);
            pool.Enqueue(b);
        }
    }
}
```

**Règles :**
- Préchauffer (Prewarm) au chargement de scène, jamais au runtime.
- Toujours reset l'état complet (position, velocity, health) au `Return`.
- Unity 2021+ : `UnityEngine.Pool.ObjectPool<T>` est disponible nativement.

---

### 7. Command Pattern — input, undo, replay

```csharp
public interface ICommand { void Execute(); void Undo(); }

public class MoveCommand : ICommand
{
    private readonly Transform target;
    private readonly Vector3 delta;
    private Vector3 previousPos;

    public MoveCommand(Transform t, Vector3 d) { target = t; delta = d; }

    public void Execute() { previousPos = target.position; target.position += delta; }
    public void Undo()    { target.position = previousPos; }
}

// History manager
public class CommandHistory
{
    private readonly Stack<ICommand> history = new();
    public void Execute(ICommand cmd) { cmd.Execute(); history.Push(cmd); }
    public void Undo()                { if (history.Count > 0) history.Pop().Undo(); }
}
```

**Replay réseau :** sérialiser les Commands (tick + joueurId + payload) → rejouer sur serveur autoritaire (authoritative server). Voir **Mirror** ou **Netcode for GameObjects**.

---

### 8. Spatial Partitioning

```csharp
// Grid spatial O(1) insert/query — idéal top-down 2D
public class SpatialGrid<T>
{
    private readonly float cellSize;
    private readonly Dictionary<(int, int), List<T>> cells = new();

    private (int, int) Key(Vector2 pos) =>
        ((int)(pos.x / cellSize), (int)(pos.y / cellSize));

    public void Insert(Vector2 pos, T item)
    {
        var k = Key(pos);
        if (!cells.ContainsKey(k)) cells[k] = new();
        cells[k].Add(item);
    }

    public IEnumerable<T> Query(Vector2 pos, float radius)
    {
        int r = Mathf.CeilToInt(radius / cellSize);
        var (cx, cy) = Key(pos);
        for (int x = cx - r; x <= cx + r; x++)
        for (int y = cy - r; y <= cy + r; y++)
            if (cells.TryGetValue((x, y), out var list))
                foreach (var item in list) yield return item;
    }
}
```

**Critères :**
- Grid spatial : objets répartis uniformément, taille fixe.
- Quadtree : objets clustérisés ou densité variable.
- Octree : monde 3D, objets 3D volumineux.
- BVH : rendu, raycasting (Burst + Unity Physics).

---

### 9. Service Locator / Injection de dépendances

```csharp
// Service Locator minimal — mieux que Singleton pur
public static class Services
{
    private static readonly Dictionary<Type, object> registry = new();
    public static void Register<T>(T service) => registry[typeof(T)] = service;
    public static T Get<T>()                  => (T)registry[typeof(T)];
}

// Usage
Services.Register<IAudioService>(new FmodAudioService());
var audio = Services.Get<IAudioService>();
```

**Préférer VContainer ou Zenject** pour les projets > 5 scènes : testabilité, injection constructeur, scope de vie.

**Anti-patterns à éviter :**
- `GameManager.Instance.PlayerHealth` dans chaque classe = couplage total.
- Singleton MonoBehaviour avec `DontDestroyOnLoad` chaîné = ordre d'init imprévisible.

---

## Garde-fous & Anti-patterns globaux

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| `Update()` avec `FindObjectOfType` | 10–100 ms/frame | Cache au `Start`, inject |
| Héritage profond (Enemy > Boss > FinalBoss) | Impossible à modifier | Composition + composants |
| Events non désincrits | Fuites mémoire, crashs | Unsubscribe dans `OnDestroy` |
| Pool non préchauffé | GC spike au premier spawn | Prewarm à la scène |
| FSM en switch-case géant | Inextensible, non testable | Classes d'état dédiées |
| Singleton pour tout | Tests impossibles | Service Locator ou DI |
| Timestep variable pour physique | Comportement non-déterministe | FixedUpdate / double-timestep |

## Bonnes pratiques 2026

- **Profiler first** : identifier le vrai bottleneck avant d'adopter ECS/DOTS.
- **Unity 6 / Netcode for GameObjects** : prefer `NetworkVariable<T>` et `RPC` typed pour le multijoueur.
- **Burst + Jobs** : toute simulation CPU-bound > 500 entités doit passer par le Job System.
- **ScriptableObject Architecture** : events, variables et channels SO = couplage minimal, hot-reload editor.
- **Tests Play Mode** : valider FSM et Command avec `UnityTest` — chaque state en isolation.
