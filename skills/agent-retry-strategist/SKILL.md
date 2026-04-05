---
name: agent-retry-strategist
description: Stratégies de retry intelligentes pour sous-agents qui échouent — backoff, fallback, alternatives et recovery. Se déclenche avec "retry agent", "agent qui échoue", "agent retry", "fallback agent", "error recovery agent", "agent resilience", "agent failure handling", "relancer agent".
---

# Agent Retry Strategist

## Quand utiliser ce skill

Utiliser ce skill dès qu'un sous-agent peut échouer et que l'échec ne doit pas être simplement propagé vers le haut sans tentative de récupération. Ce skill est essentiel dans les pipelines de production où des erreurs transitoires (rate limit, timeout réseau, hallucination LLM) sont fréquentes et gérables. Il convient également aux architectures où différents types d'erreurs nécessitent des traitements distincts — certaines méritent un retry immédiat, d'autres un fallback vers un modèle alternatif, d'autres encore une décomposition de la tâche.

## Workflow

1. **Classification des erreurs** — Avant tout retry, classifier l'erreur : `transient` (rate limit, timeout, 503) vs `permanent` (token limit dépassé, contenu refusé, erreur de schéma). Seules les erreurs transient méritent un retry. Les erreurs permanentes nécessitent un fallback ou une escalade immédiate.

2. **Retry policies** — Implémenter les quatre politiques de base selon la criticité de la tâche :
   - `immediate` : retry instantané (pour les 429 avec Retry-After court)
   - `fixed delay` : attendre N secondes entre chaque tentative
   - `exponential backoff` : délai = base × 2^attempt (ex : 1s, 2s, 4s, 8s)
   - `jittered backoff` : ajouter du bruit aléatoire pour éviter les thundering herds

3. **Max retries et circuit breaker** — Limiter le nombre de tentatives (`max_attempts`). Implémenter un circuit breaker à trois états : `CLOSED` (normal), `OPEN` (stoppe les calls après N failures consécutifs), `HALF-OPEN` (teste une requête de sonde pour voir si le service est rétabli).

4. **Retry with modification** — Si la même requête échoue plusieurs fois, modifier la tentative : reformuler le prompt, simplifier la tâche, réduire le scope, diminuer le nombre de tokens demandés. Un retry identique sur un échec structurel ne sert à rien.

5. **Model fallback** — Si le modèle principal échoue (quota, indisponibilité) : basculer sur un modèle alternatif. Exemple : GPT-4o échoue → Claude 3.5 Sonnet → Claude 3 Haiku avec prompt simplifié. Définir une chaîne de fallback explicite dans la configuration.

6. **Tool fallback** — Si un outil spécifique échoue : utiliser un outil alternatif équivalent. Exemples : `search_web` échoue → `fetch_url` vers un moteur de secours ; API météo principale → API météo de backup ; base de données primaire → réplica.

7. **Task decomposition on failure** — Quand une tâche échoue pour cause de complexité excessive (trop longue, trop ambitieuse), la décomposer automatiquement en sous-tâches plus simples et relancer chaque fragment indépendamment.

8. **Partial result recovery** — Sauvegarder les checkpoints après chaque étape significative. En cas d'échec en cours de traitement, reprendre à partir du dernier checkpoint valide plutôt que de tout recommencer depuis le début.

9. **Dead letter queue** — Les tâches qui épuisent tous leurs retries et tous leurs fallbacks sont transférées dans une dead letter queue (DLQ) pour analyse humaine, audit et potentielle reprise manuelle.

10. **Learning from failures** — Logger systématiquement les patterns d'échec : type d'erreur, modèle impliqué, heure, fréquence. Utiliser ces données pour affiner les politiques de retry et prévenir les récurrences (ex : augmenter le délai de backoff si les rate limits sont fréquents).

```python
# Exemple d'implémentation Python — Retry Strategist complet
import asyncio
import random
import time
from enum import Enum
from dataclasses import dataclass
from typing import Callable, Any, Optional
import logging

logger = logging.getLogger(__name__)


class ErrorClass(Enum):
    TRANSIENT = "transient"    # Retryable
    PERMANENT = "permanent"    # Non-retryable
    UNKNOWN = "unknown"        # Retry avec précaution


class CircuitState(Enum):
    CLOSED = "closed"          # Fonctionnel
    OPEN = "open"              # En panne — stoppe les calls
    HALF_OPEN = "half_open"    # Test de rétablissement


def classify_error(error: Exception) -> ErrorClass:
    """Classifier l'erreur pour choisir la stratégie adaptée."""
    error_str = str(error).lower()
    transient_signals = ["rate limit", "429", "503", "timeout", "connection", "temporarily"]
    permanent_signals = ["token limit", "content policy", "invalid schema", "401", "403"]
    
    if any(s in error_str for s in transient_signals):
        return ErrorClass.TRANSIENT
    if any(s in error_str for s in permanent_signals):
        return ErrorClass.PERMANENT
    return ErrorClass.UNKNOWN


@dataclass
class RetryPolicy:
    max_attempts: int = 3
    base_delay: float = 1.0
    backoff_factor: float = 2.0
    jitter: bool = True
    strategy: str = "exponential"  # immediate | fixed | exponential

    def compute_delay(self, attempt: int) -> float:
        if self.strategy == "immediate":
            return 0
        elif self.strategy == "fixed":
            delay = self.base_delay
        else:  # exponential
            delay = self.base_delay * (self.backoff_factor ** attempt)
        
        if self.jitter:
            delay *= (0.5 + random.random())  # ±50% de bruit
        return min(delay, 60.0)  # plafond à 60 secondes


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time: Optional[float] = None

    def record_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning("[CIRCUIT] Circuit ouvert après %d failures", self.failure_count)

    def can_attempt(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True  # HALF_OPEN : tester une sonde


class RetryStrategist:
    def __init__(self, policy: RetryPolicy = None, circuit_breaker: CircuitBreaker = None):
        self.policy = policy or RetryPolicy()
        self.circuit = circuit_breaker or CircuitBreaker()
        self.failure_log: list[dict] = []
        
        # Chaîne de fallback modèles
        self.model_fallback_chain = [
            "claude-3-5-sonnet",
            "claude-3-5-haiku",
            "claude-3-haiku",
        ]
        
        # Fallback outils
        self.tool_fallbacks = {
            "search_web": ["fetch_url", "search_academic"],
            "fetch_url": ["search_web"],
        }

    async def execute_with_retry(
        self,
        task_fn: Callable,
        task_args: dict,
        checkpoint_fn: Callable = None,
    ) -> Any:
        """Exécuter une tâche avec retry intelligent."""
        
        for attempt in range(self.policy.max_attempts):
            if not self.circuit.can_attempt():
                raise RuntimeError("[CIRCUIT] Circuit ouvert — service indisponible")

            try:
                result = await task_fn(**task_args)
                self.circuit.record_success()
                return result

            except Exception as e:
                error_class = classify_error(e)
                self.circuit.record_failure()
                self._log_failure(e, attempt, error_class, task_args)

                if error_class == ErrorClass.PERMANENT:
                    logger.error("[RETRY] Erreur permanente — pas de retry: %s", e)
                    raise

                if attempt < self.policy.max_attempts - 1:
                    delay = self.policy.compute_delay(attempt)
                    logger.info("[RETRY] Tentative %d/%d dans %.1fs — %s",
                                attempt + 1, self.policy.max_attempts, delay, e)
                    
                    # Modifier la tâche si l'échec persiste
                    if attempt >= 1:
                        task_args = self._modify_task(task_args, attempt)
                    
                    await asyncio.sleep(delay)
                else:
                    logger.error("[DLQ] Toutes les tentatives épuisées — envoi en DLQ")
                    self._send_to_dlq(task_args, e)
                    raise

    def _modify_task(self, task_args: dict, attempt: int) -> dict:
        """Modifier la tâche pour améliorer les chances de succès."""
        modified = task_args.copy()
        if "prompt" in modified and attempt == 2:
            modified["prompt"] = f"Simplifié: {modified['prompt'][:500]}"
        if "model" in modified:
            chain = self.model_fallback_chain
            current_idx = next(
                (i for i, m in enumerate(chain) if m == modified["model"]), 0
            )
            if current_idx + 1 < len(chain):
                modified["model"] = chain[current_idx + 1]
                logger.info("[FALLBACK] Modèle → %s", modified["model"])
        return modified

    def _log_failure(self, error: Exception, attempt: int, 
                     error_class: ErrorClass, task_args: dict):
        self.failure_log.append({
            "error": str(error),
            "class": error_class.value,
            "attempt": attempt,
            "task": str(task_args)[:200],
            "timestamp": time.time(),
        })

    def _send_to_dlq(self, task_args: dict, error: Exception):
        """Envoyer en Dead Letter Queue pour analyse humaine."""
        print(f"[DLQ] Tâche échouée après tous les retries: {task_args} | Erreur: {error}")
        # Ici : persister dans Redis, SQS, base de données, etc.

    def failure_report(self) -> dict:
        from collections import Counter
        classes = Counter(f["class"] for f in self.failure_log)
        return {"total_failures": len(self.failure_log), "by_class": dict(classes)}
```

```
Architecture — Retry Strategist

  Tâche entrante
       │
       ▼
  ┌──────────────┐
  │Circuit Breaker│ OPEN? → rejeter immédiatement
  └──────┬───────┘
         │ CLOSED / HALF-OPEN
         ▼
  ┌──────────────┐
  │  Attempt #1  │──── succès → retourner résultat
  └──────┬───────┘
         │ échec
         ▼
  Classifier erreur
  PERMANENT ────────────────────► Escalade / Exception
  TRANSIENT
         │
         ▼
  Modifier tâche (attempt >= 2)
  Model fallback → Tool fallback
         │
  Délai backoff (jittered)
         │
         ▼
  ┌──────────────┐
  │  Attempt #2  │──── succès → retourner résultat
  └──────┬───────┘
         │ ...
         ▼
  Max attempts épuisés
         │
         ▼
  ┌─────────────────┐
  │ Dead Letter Queue│ → analyse humaine
  └─────────────────┘
```

**Comparaison LangGraph vs CrewAI vs Custom :**

| Critère | LangGraph | CrewAI | Custom Python |
|---|---|---|---|
| Retry natif | Partiel (node retry) | Non natif | Total contrôle |
| Circuit breaker | Non | Non | Manuel |
| Model fallback | Non | Non | Manuel |
| DLQ | Non | Non | Manuel |
| Modification de tâche | Non | Non | Manuel |

## Anti-patterns

- **Retry infini sans backoff** — Boucler immédiatement sans délai sur un service en rate limit aggrave la situation et peut déclencher une mise en quarantaine.
- **Retry sur erreurs permanentes** — Retenter une erreur de "content policy" ou de "token limit exceeded" est inutile et gaspille du budget. Classifier d'abord, retenter ensuite.
- **Pas de logging des failures** — Sans trace des échecs, il est impossible d'identifier les patterns problématiques et d'améliorer la stratégie au fil du temps.
- **Même stratégie pour toutes les erreurs** — Un délai fixe de 5 secondes peut être trop long pour un rate limit de 429 (qui a un Retry-After de 1s) et trop court pour une indisponibilité de service (qui peut durer 30s+).

## Règles

1. **Toujours classifier l'erreur avant de décider d'un retry** — `transient` vs `permanent` détermine la stratégie ; ne jamais retenter une erreur permanente.
2. **Implémenter le jittered exponential backoff par défaut** — c'est la stratégie la plus robuste pour éviter les pics de charge synchronisés sur des services partagés.
3. **Modifier la tâche après le premier échec** — un retry identique sur un même input aura tendance à produire le même échec ; changer le prompt, le modèle ou le scope améliore les chances.
4. **Tout ce qui dépasse `max_attempts` va en Dead Letter Queue** — ne jamais silencieusement abandonner une tâche ; la DLQ garantit la traçabilité et la reprise possible.
5. **Mesurer et analyser les patterns d'échec** — le rapport de failures doit alimenter un processus d'amélioration continue des politiques de retry.


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
