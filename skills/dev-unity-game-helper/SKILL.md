---
name: dev-unity-game-helper
description: Développement de jeux avec Unity et C#. Se déclenche avec "Unity", "game development", "jeu vidéo", "C# Unity", "GameObject", "ScriptableObject", "2D game", "3D game", "Unity Editor".
---

# Unity Game Helper

## Workflow

### 1. Choisir la version Unity et le render pipeline

| Cible | Version recommandée | Pipeline |
|-------|---------------------|----------|
| Mobile 2D/3D | LTS actuelle (6.x) | URP |
| PC/Console AAA | LTS actuelle | HDRP |
| WebGL / prototypage | LTS actuelle | URP ou Built-in |

```
# Créer un projet URP via CLI (Unity Hub)
Unity -createProject MyGame -version 6000.0.47f1 -templateId com.unity.template.urp-blank
```

---

### 2. Structurer le projet

```
Assets/
  _Project/
    Art/
    Audio/
    Prefabs/
    ScriptableObjects/
    Scripts/
      Core/        ← managers, state machine, services
      Gameplay/    ← character, enemies, interactions
      UI/
      Utils/
    Scenes/
  Tests/
    EditMode/
    PlayMode/
```

Règle : **pas de scripts dans le dossier racine Assets**. Tout code va sous `_Project/Scripts/`.

---

### 3. Architecture : Service Locator ou Injection

**Option A — Service Locator (simple, no dependency)**
```csharp
public static class ServiceLocator
{
    private static readonly Dictionary<Type, object> _services = new();

    public static void Register<T>(T service) => _services[typeof(T)] = service;

    public static T Get<T>()
    {
        if (_services.TryGetValue(typeof(T), out var svc)) return (T)svc;
        throw new Exception($"Service {typeof(T).Name} non enregistré.");
    }
}

// Au démarrage
ServiceLocator.Register<IAudioService>(new AudioService());

// Usage
ServiceLocator.Get<IAudioService>().Play("sfx_jump");
```

**Option B — Singleton (acceptable pour GameManager, uniquement)**
```csharp
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    private void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
}
```

Critère de choix : > 2 singletons → passer au Service Locator ou Zenject/VContainer.

---

### 4. Input System (New Input System)

```csharp
// PlayerControls.inputactions → générer la classe C#
public class PlayerController : MonoBehaviour
{
    private PlayerControls _controls;

    private void Awake()
    {
        _controls = new PlayerControls();
        _controls.Player.Jump.performed += _ => OnJump();
    }

    private void OnEnable()  => _controls.Enable();
    private void OnDisable() => _controls.Disable();

    private void OnJump() { /* logique */ }
}
```

Ne jamais utiliser `Input.GetKey` dans un nouveau projet — l'ancien Input Manager n'est pas rebindable.

---

### 5. ScriptableObjects : données et events

**Canal d'événement découplé**
```csharp
[CreateAssetMenu(menuName = "Events/GameEvent")]
public class GameEvent : ScriptableObject
{
    private readonly List<GameEventListener> _listeners = new();

    public void Raise()
    {
        for (int i = _listeners.Count - 1; i >= 0; i--)
            _listeners[i].OnEventRaised();
    }

    public void Register(GameEventListener l)   => _listeners.Add(l);
    public void Unregister(GameEventListener l) => _listeners.Remove(l);
}
```

Usage : `playerDied.Raise()` depuis le gameplay, UI écoute sans référence directe au player.

---

### 6. Object Pooling (Unity 2021+)

```csharp
using UnityEngine.Pool;

public class BulletSpawner : MonoBehaviour
{
    [SerializeField] private Bullet _prefab;
    private IObjectPool<Bullet> _pool;

    private void Awake()
    {
        _pool = new ObjectPool<Bullet>(
            createFunc:    () => Instantiate(_prefab),
            actionOnGet:   b  => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            defaultCapacity: 20, maxSize: 100
        );
    }

    public void Shoot() => _pool.Get().Init(_pool);
}
```

---

### 7. Performance : règles Update

```csharp
// MAL — recherche en Update, allocation string
void Update()
{
    var rb = GetComponent<Rigidbody>(); // alloc à chaque frame
    Debug.Log("pos: " + transform.position); // string concat
}

// BIEN — cache en Awake, pas d'alloc
private Rigidbody _rb;
void Awake() => _rb = GetComponent<Rigidbody>();

void Update()
{
    // utilise _rb directement, pas d'alloc
}
```

Checklist performance par domaine :
- **GC** : éviter `new` en Update, utiliser `StringBuilder`, `List.Clear()` plutôt que `new List`
- **Draw calls** : static batching sur décors fixes, GPU instancing sur props répétés
- **Physics** : `FixedUpdate` uniquement pour les forces, `LayerMask` pour filtrer les raycasts
- **Coroutines** : toujours stocker la référence et `StopCoroutine` à la destruction

---

### 8. Animation

```csharp
// Blend Tree : X = horizontal, Y = vertical
// Paramètres via hash (plus rapide que string)
private static readonly int SpeedX = Animator.StringToHash("SpeedX");
private static readonly int SpeedY = Animator.StringToHash("SpeedY");

private void Update()
{
    _animator.SetFloat(SpeedX, _moveInput.x);
    _animator.SetFloat(SpeedY, _moveInput.y);
}
```

Pour les tweens UI ou effets procéduraux, préférer **DOTween** (gratuit, zéro GC en mode Blendable) :
```csharp
transform.DOMove(target, 0.5f).SetEase(Ease.OutBack);
```

---

### 9. Tests automatisés

```csharp
// EditMode — test pur C#
[Test]
public void StatCalculator_AppliesMultiplier()
{
    var stat = new Stat(baseValue: 10f);
    stat.AddModifier(new StatModifier(0.5f, ModType.Percent));
    Assert.AreEqual(15f, stat.Value, 0.001f);
}

// PlayMode — test avec MonoBehaviour
[UnityTest]
public IEnumerator PlayerDies_WhenHealthZero()
{
    var go = new GameObject();
    var player = go.AddComponent<PlayerHealth>();
    player.TakeDamage(9999);
    yield return null; // une frame
    Assert.IsTrue(player.IsDead);
}
```

Lancer en CLI :
```
Unity -runTests -testPlatform EditMode -testResults results.xml -batchmode -projectPath .
```

---

### 10. Build et Addressables

```csharp
// Chargement asynchrone d'un prefab
var handle = Addressables.LoadAssetAsync<GameObject>("Enemies/Boss");
await handle.Task;
Instantiate(handle.Result);
// Ne pas oublier de libérer
Addressables.Release(handle);
```

Paramètres de build recommandés (Player Settings) :
- **IL2CPP** pour mobile/console (plus sûr et plus rapide à l'exécution que Mono)
- **ARM64** obligatoire pour iOS App Store
- **Managed stripping level** : High → tester que le jeu démarre bien
- **Incremental GC** : activé (réduit les pics)

---

## Anti-patterns à éviter

| Anti-pattern | Problème | Alternative |
|---|---|---|
| `GameObject.Find()` en Update | Recherche O(n) à chaque frame | Cache en `Awake` / `[SerializeField]` |
| `Instantiate`/`Destroy` fréquents | GC spikes, hitches | Object Pool (§6) |
| Singleton sur tout | Couplage fort, tests impossibles | Service Locator ou Injection |
| `SendMessage` | Réflexion lente, pas de typage | Events typés ou UnityEvent |
| Coroutines sans référence | Fuite mémoire, double-start | Stocker `Coroutine _c` et vérifier null |
| `Resources.Load` au runtime | Tous les assets chargés en RAM | Addressables |
| `string` dans `Animator.SetFloat` | Allocation + lenteur | `Animator.StringToHash` (§8) |

---

## Références rapides

- **Profiler CPU** : Window → Analysis → Profiler (Deep Profile uniquement pour diagnostiquer)
- **Frame Debugger** : Window → Analysis → Frame Debugger (visualiser les draw calls)
- **Unity Docs** : <https://docs.unity3d.com/6000.0/Documentation/Manual/>
- **DOTween** : <http://dotween.demigiant.com/>
- **Addressables** : `com.unity.addressables` via Package Manager


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
