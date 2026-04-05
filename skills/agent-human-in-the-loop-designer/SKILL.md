---
name: agent-human-in-the-loop-designer
description: Design de systèmes human-in-the-loop pour agents IA avec approbation, correction et escalade. Se déclenche avec "human in the loop", "HITL", "approbation humaine", "validation humaine", "escalade agent", "agent supervisé", "intervention humaine", "approval workflow".
---

# Human-in-the-Loop Designer

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois intégrer des points de contrôle humain dans un workflow d'agent IA. Il s'applique dès que l'agent peut prendre des décisions irréversibles (envoyer un email, supprimer des données, effectuer un paiement), opérer dans des domaines à haute criticité (médical, légal, financier), ou lorsque la confiance dans les décisions autonomes n'est pas encore établie.

## Workflow

1. **Identifier les points de décision nécessitant un humain** — Cartographie le workflow de l'agent et identifie les actions à haute criticité (irréversibles, coûteuses, risquées), les zones d'incertitude (l'agent n'a pas assez d'information), et les étapes réglementairement obligatoires (conformité, audit). Distingue les vérifications systématiques (toujours demander) des vérifications conditionnelles (demander si X).

2. **Patterns HITL** — Choisis le pattern adapté : `approval gate` (bloquer l'agent jusqu'à approbation explicite), `correction loop` (l'agent propose, l'humain corrige puis l'agent continue), `exception escalation` (l'agent agit seul sauf cas limite), `confidence threshold` (escalade automatique si le score de confiance est sous un seuil), `shadow mode` (l'agent recommande, l'humain décide pour l'instant).

3. **UX du HITL** — Conçois l'interface de validation pour maximiser la vitesse et la qualité des décisions humaines : notification claire avec contexte suffisant (ne pas forcer l'humain à chercher l'information), `diff view` pour les modifications (ce qui change vs l'état actuel), bouton undo pour les actions déjà exécutées, timeout visible avec compte à rebours, résumé de l'impact de la décision.

4. **Threshold de confiance** — Implémente un système de scoring pour décider automatiquement d'escalader : calcule un score de confiance basé sur la clarté de la requête, la familiarité de la tâche, le risque estimé, et l'historique de succès. Calibre les seuils empiriquement (commence conservateur, relâche progressivement).
   ```python
   def should_escalate(task: Task, agent_confidence: float) -> bool:
       risk_score = task.estimated_cost * task.reversibility_factor
       if risk_score > HIGH_RISK_THRESHOLD:
           return True
       if agent_confidence < CONFIDENCE_THRESHOLD:
           return True
       return False
   ```

5. **Correction et feedback** — Transforme chaque correction humaine en signal d'apprentissage : loggue la décision originale de l'agent, la correction humaine, et le contexte. Utilise ces données pour affiner les prompts, ajuster les seuils de confiance, ou alimenter un dataset de fine-tuning. Notifie l'agent de la correction pour qu'il adapte la suite du workflow.
   ```python
   def apply_human_correction(agent_output: str, human_correction: str, task_id: str):
       feedback_store.save({
           "task_id": task_id,
           "agent_output": agent_output,
           "human_correction": human_correction,
           "timestamp": datetime.now().isoformat()
       })
       return human_correction  # l'agent continue avec la version corrigée
   ```

6. **Async HITL** — Pour les workflows longs ou multi-utilisateurs, implémente le HITL en asynchrone : stocke les demandes d'approbation dans une queue persistante, envoie une notification (email, Slack, SMS), maintiens un SLA (délai maximum de réponse), permets le batch approval (approuver plusieurs actions d'un coup), et gère l'expiration des demandes trop anciennes.

7. **Implémentation technique** — Selon ta stack : `LangGraph interrupt` (interrompre un graph à un node spécifique et reprendre après approbation), `webhook callbacks` (l'agent envoie une requête HTTP et attend la réponse), `Slack approval` (message interactif avec boutons Approuver/Rejeter), `email approval` (lien magique one-time dans un email), interface web custom.
   ```python
   # LangGraph interrupt pattern
   from langgraph.types import interrupt

   def human_approval_node(state: AgentState):
       decision = interrupt({
           "action": state["proposed_action"],
           "context": state["context"],
           "risk_level": state["risk_level"]
       })
       if decision["approved"]:
           return {"approved_action": state["proposed_action"]}
       else:
           return {"approved_action": decision.get("correction")}
   ```

8. **Audit trail** — Loggue exhaustivement chaque décision impliquant un humain : qui a approuvé/rejeté (identifiant utilisateur), quand (timestamp précis), quoi (action proposée par l'agent), pourquoi (commentaire optionnel), et quelle a été la suite du workflow. Rends ces logs immuables et consultables pour la conformité réglementaire.

9. **Graceful degradation** — Prévois le comportement si l'humain ne répond pas : `timeout with safe default` (l'agent prend l'action la moins risquée par défaut), `pause and notify` (l'agent s'arrête et notifie qu'une intervention est requise), `escalate up` (notifier un superviseur si le premier responsable ne répond pas), `abort and log` (annuler et documenter pour traitement différé).

10. **Métriques** — Monitore la santé du système HITL : `approval rate` (% d'actions approuvées sans correction — une baisse indique une dégradation de l'agent), `correction rate` (% de corrections — utile pour identifier les zones d'amélioration), `escalation frequency` (% de tâches escaladées — calibre les seuils si trop élevé), `human response time` (SLA respecté ?), `false positive rate` (escalades inutiles qui surchargent les humains).

## Règles

- **Minimalisme du HITL** : chaque validation humaine est un coût (temps, attention) ; n'escalade que ce qui le justifie vraiment — l'objectif est de réduire progressivement la fréquence d'escalade à mesure que la confiance s'établit.
- **Anti-pattern — approbation sans contexte** : demander "Approuver ?" sans montrer ce qui va se passer génère des clics aveugles ; fournis toujours un résumé de l'action et de son impact avant la validation.
- **Asymétrie risque** : le coût d'une escalade inutile (quelques secondes humaines) est bien moindre que le coût d'une action incorrecte non vérifiée ; calibre les seuils en faveur de la prudence.
- **Boucle de feedback fermée** : un système HITL sans mécanisme de retour vers l'agent n'améliore rien ; chaque correction doit alimenter l'amélioration continue du système.
- **Test du chemin de refus** : teste systématiquement ce qui se passe quand un humain rejette ou corrige l'action de l'agent — le workflow doit être aussi robuste dans ce cas que dans le cas d'approbation.


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
