---
name: agent-result-aggregator
description: Agrégation et synthèse des résultats de multiples sous-agents en un résultat cohérent. Se déclenche avec "agréger résultats", "fusionner résultats", "combiner outputs", "agent aggregator", "merge results", "synthèse multi-agent", "consolider résultats agents".
---

# Agent Result Aggregator

## Quand utiliser ce skill
Utiliser ce skill dès que plusieurs sous-agents ont produit des résultats qui doivent être fusionnés en un output unique cohérent. Applicable pour les résultats complémentaires (chaque agent couvre une partie), les résultats redondants (plusieurs agents ont traité la même question), ou les résultats contradictoires (les agents ont abouti à des conclusions différentes).

## Workflow

1. **Définir le format de sortie attendu**
   - Spécifier le schema exact du résultat final avant de commencer l'agrégation
   - Choisir le niveau de détail : résumé exécutif, rapport complet, JSON structuré, réponse conversationnelle
   - Définir les champs obligatoires vs optionnels pour détecter les résultats incomplets
   ```python
   from pydantic import BaseModel
   from typing import Optional, Any

   class AggregatedResult(BaseModel):
       result_id: str
       summary: str
       details: dict[str, Any]
       sources: list[dict]       # Attribution par sous-agent
       confidence: float         # 0.0 - 1.0
       conflicts: list[dict]     # Contradictions détectées et résolues
       metadata: dict
   ```

2. **Collecte des résultats (gathering asynchrone)**
   - Utiliser `asyncio.gather` pour collecter tous les résultats en parallèle
   - Gérer les timeouts : un sous-agent lent ne doit pas bloquer l'agrégation
   - Distinguer les résultats complets des résultats partiels des échecs
   ```python
   import asyncio
   from dataclasses import dataclass

   @dataclass
   class AgentResult:
       agent_id: str
       status: str        # "complete" | "partial" | "failed"
       data: Any
       confidence: float
       execution_time: float

   async def collect_all_results(agents: list, timeout: int = 60) -> list[AgentResult]:
       tasks = [asyncio.wait_for(agent.get_result(), timeout=timeout) for agent in agents]
       raw_results = await asyncio.gather(*tasks, return_exceptions=True)
       return [
           r if not isinstance(r, Exception)
           else AgentResult(agent_id=agents[i].id, status="failed", data=None, confidence=0.0, execution_time=timeout)
           for i, r in enumerate(raw_results)
       ]
   ```

3. **Validation des résultats (qualité et conformité)**
   - Vérifier la conformité au schema attendu pour chaque résultat reçu
   - Scorer la qualité : longueur minimale, présence des champs clés, cohérence interne
   - Catégoriser : `valid`, `partial` (manque des champs), `invalid` (hors schema), `empty`
   ```python
   class ResultValidator:
       def validate(self, result: AgentResult, schema: BaseModel) -> dict:
           score = 0.0
           issues = []
           if result.status == "failed":
               return {"valid": False, "score": 0.0, "issues": ["Agent a échoué"]}
           try:
               schema.model_validate(result.data)
               score += 0.5
           except Exception as e:
               issues.append(f"Non-conformité schema: {e}")
           # Vérification qualité supplémentaire
           if result.confidence >= 0.7:
               score += 0.3
           if result.execution_time < 60:
               score += 0.2
           return {"valid": score >= 0.5, "score": score, "issues": issues}
   ```

4. **Résolution de conflits (contradictions entre agents)**
   - Détecter les contradictions : deux agents donnent des réponses incompatibles sur le même fait
   - Stratégie `voting` : prendre la réponse majoritaire si 3+ agents ou plus
   - Stratégie `confidence-based` : prendre la réponse de l'agent avec la confiance la plus haute
   - Stratégie `LLM arbitration` : demander à un LLM de trancher en analysant les deux versions
   ```python
   class ConflictResolver:
       def resolve(self, conflicts: list[tuple], strategy: str = "confidence") -> dict:
           resolved = {}
           for field, competing_values in conflicts:
               if strategy == "voting":
                   resolved[field] = max(set(v for _, v in competing_values),
                                         key=lambda x: sum(1 for _, v in competing_values if v == x))
               elif strategy == "confidence":
                   resolved[field] = max(competing_values, key=lambda x: x[0])[1]
               elif strategy == "llm":
                   resolved[field] = self._llm_arbitrate(field, competing_values)
           return resolved

       def _llm_arbitrate(self, field: str, options: list) -> Any:
           prompt = f"Choisir la meilleure valeur pour '{field}': {options}. Justifier."
           return llm.invoke(prompt)
   ```

5. **Déduplication (éliminer les redondances)**
   - Détecter les résultats identiques ou quasi-identiques (même contenu, sources différentes)
   - `Exact dedup` : hash MD5/SHA des données, supprimer les doublons exacts
   - `Semantic dedup` : embeddings + similarité cosinus pour détecter les paraphrases
   ```python
   from sklearn.metrics.pairwise import cosine_similarity
   import numpy as np

   class SemanticDeduplicator:
       def __init__(self, similarity_threshold: float = 0.92):
           self.threshold = similarity_threshold

       def deduplicate(self, results: list[AgentResult]) -> list[AgentResult]:
           texts = [str(r.data) for r in results]
           embeddings = embed_batch(texts)  # Votre fonction d'embedding
           kept = [0]
           for i in range(1, len(results)):
               sims = cosine_similarity([embeddings[i]], [embeddings[j] for j in kept])[0]
               if max(sims) < self.threshold:
                   kept.append(i)
           return [results[i] for i in kept]
   ```

6. **Ranking et priorisation (sélection des meilleurs résultats)**
   - Scorer chaque résultat selon : confiance de l'agent, qualité de validation, fraîcheur des données
   - Prioriser les résultats des agents spécialisés sur les agents généralistes
   - En cas de budget de tokens limité, tronquer en gardant les résultats les mieux scorés
   ```python
   class ResultRanker:
       def rank(self, results: list[AgentResult], validations: list[dict]) -> list[tuple]:
           scored = []
           for result, validation in zip(results, validations):
               score = (
                   result.confidence * 0.4 +
                   validation["score"] * 0.4 +
                   (1.0 if result.status == "complete" else 0.3) * 0.2
               )
               scored.append((score, result))
           return sorted(scored, reverse=True, key=lambda x: x[0])
   ```

7. **Synthèse (fusion en un output cohérent)**
   - Pour des résultats complémentaires : concatener intelligemment en évitant les redites
   - Pour des résultats redondants : prendre le meilleur et enrichir avec les nuances des autres
   - Utiliser un LLM pour la synthèse finale quand la structure est complexe
   ```python
   class LLMSynthesizer:
       def synthesize(self, ranked_results: list, output_format: str) -> str:
           context = "\n\n".join([
               f"[Agent {r.agent_id}, confiance={r.confidence:.2f}]\n{r.data}"
               for _, r in ranked_results[:5]  # Top 5 résultats
           ])
           prompt = f"""Synthétise les résultats suivants de multiple agents en un {output_format} cohérent.
           Résous les contradictions, élimine les répétitions, garde les informations les plus précises.

           Résultats des agents :
           {context}

           Output attendu: {output_format}"""
           return llm.invoke(prompt)
   ```

8. **Citation et attribution (source tracking)**
   - Tracer quelle information vient de quel sous-agent dans le résultat final
   - Permet l'audit post-hoc et le débogage en cas d'erreur dans le résultat agrégé
   - Format de citation : `[Agent: research_agent_1, confiance: 0.92, timestamp: ...]`
   ```python
   class SourceTracker:
       def __init__(self):
           self.attributions = {}

       def track(self, field: str, value: Any, source_agent: AgentResult):
           self.attributions[field] = {
               "agent_id": source_agent.agent_id,
               "confidence": source_agent.confidence,
               "execution_time": source_agent.execution_time,
               "status": source_agent.status
           }

       def generate_attribution_report(self) -> dict:
           return {"sources": self.attributions}
   ```

9. **Quality assurance (vérification du résultat final)**
   - Vérifier la cohérence interne du résultat agrégé (pas de contradictions internes résiduelles)
   - Fact-checking léger : les affirmations clés sont-elles étayées par au moins une source ?
   - Completeness check : tous les champs obligatoires du schema de sortie sont-ils remplis ?
   ```python
   class FinalQAChecker:
       def check(self, aggregated: AggregatedResult) -> dict:
           issues = []
           # Vérification complétude
           if not aggregated.summary or len(aggregated.summary) < 50:
               issues.append("Résumé trop court ou absent")
           if not aggregated.sources:
               issues.append("Aucune attribution de source")
           if aggregated.confidence < 0.3:
               issues.append("Confiance trop basse — résultat peu fiable")
           # Cohérence
           if aggregated.conflicts and not all(c.get("resolved") for c in aggregated.conflicts):
               issues.append("Des conflits non résolus subsistent")
           return {"passed": len(issues) == 0, "issues": issues}
   ```

10. **Output formatting (mise en forme finale)**
    - Adapter le format au contexte : JSON pour une API, Markdown pour un humain, texte brut pour un LLM suivant
    - Inclure les métadonnées : nombre d'agents, taux de succès, confiance globale, durée d'exécution
    - Proposer différents niveaux de détail : résumé / complet / avec sources
    ```python
    class OutputFormatter:
        def format(self, result: AggregatedResult, mode: str = "full") -> str:
            if mode == "summary":
                return result.summary
            elif mode == "json":
                return result.model_dump_json(indent=2)
            elif mode == "markdown":
                lines = [f"# Résultat agrégé\n\n{result.summary}\n\n## Détails\n"]
                for k, v in result.details.items():
                    lines.append(f"### {k}\n{v}\n")
                lines.append(f"\n---\n*Confiance: {result.confidence:.0%} | Sources: {len(result.sources)} agents*")
                return "\n".join(lines)
    ```

## Anti-patterns

- **Concaténer sans synthétiser** : empiler les résultats des agents les uns après les autres sans fusion intelligente produit un output redondant, incohérent et trop long. Toujours passer par une étape de synthèse qui fusionne et déduplique.
- **Ignorer les conflits** : quand deux agents se contredisent, laisser les deux affirmations dans le résultat final crée de la confusion. Chaque conflit doit être détecté, documenté et résolu explicitement.
- **Pas de validation du résultat final** : même si chaque résultat individuel est valide, leur agrégation peut produire des incohérences. Toujours exécuter un QA check sur l'output final avant de le livrer.
- **Perdre l'attribution des sources** : un résultat agrégé sans traçabilité est un résultat non auditable. Conserver systématiquement le lien entre chaque information et le sous-agent qui l'a produite.

## Règles

1. **Toujours définir le schema du résultat final avant de lancer l'agrégation** — travailler vers un format inconnu rend l'agrégation non déterministe.
2. **Les résultats partiels sont mieux que rien** : si un sous-agent a échoué, inclure ses résultats partiels avec un flag `partial` plutôt que de les ignorer complètement.
3. **La confiance globale est le minimum des confidences individuelles**, pas la moyenne — un résultat final est aussi fiable que son maillon le plus faible.
4. **Documenter chaque conflit résolu** dans les métadonnées du résultat final pour permettre l'audit et l'amélioration continue du système.
5. **Limiter la taille de l'output agrégé** : un résultat trop verbeux est inutilisable. Définir une longueur cible et utiliser le LLM de synthèse pour respecter cette contrainte.


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
