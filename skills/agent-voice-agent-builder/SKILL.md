---
name: agent-voice-agent-builder
description: Construction d'agents vocaux conversationnels avec STT, TTS et gestion du dialogue. Se déclenche avec "voice agent", "agent vocal", "téléphone IA", "voice bot", "STT", "TTS", "speech to text", "conversational AI", "IVR intelligent", "Vapi", "LiveKit".
---

# Voice Agent Builder

## Quand utiliser ce skill
Utilise ce skill lorsque tu dois concevoir ou implémenter un agent vocal interactif — qu'il s'agisse d'un bot téléphonique, d'un assistant vocal embarqué dans une application, d'un IVR intelligent ou d'un agent conversationnel temps réel sur WebRTC. Il couvre l'ensemble du pipeline STT → LLM → TTS et la gestion du dialogue.

## Workflow

1. **Architecture du pipeline** — Concevoir le pipeline de bout en bout : Audio entrant → STT (transcription) → NLU/LLM (compréhension + génération) → TTS (synthèse) → Audio sortant. Choisir entre architecture synchrone (simple, latence élevée) et streaming end-to-end (complexe, latence < 800 ms). Définir la gestion du WebRTC/SIP, les timeouts, les buffers audio et les points de reprise en cas d'erreur.

2. **Speech-to-Text** — Sélectionner et configurer le moteur STT selon les contraintes : Whisper (open-source, multilingue, haute précision, déploiement local possible), Deepgram Nova-2 (streaming temps réel, API, excellente précision en anglais/français), Google Speech-to-Text (intégration GCP, multilingue), Azure Speech (intégration Microsoft, custom models). Configurer le VAD (Voice Activity Detection), les timeouts de silence et la détection de barge-in.

3. **Compréhension du langage naturel** — Extraire l'intention et les entités de la transcription. Maintenir l'état de la conversation (dialog state) avec les variables de session. Gérer les ambiguïtés et les transcriptions partiellement incorrectes (correction de contexte). Choisir entre NLU classique (Rasa, Dialogflow) pour les domaines bornés ou LLM directement pour la flexibilité maximale.

4. **Gestion du dialogue** — Implémenter la logique conversationnelle : state machine explicite pour les flux structurés (prise de RDV, commandes), LLM-based pour les conversations libres, hybride pour la plupart des cas d'usage réels. Gérer les interruptions (barge-in), le silence prolongé (reprompt), les répétitions et les demandes de confirmation. Définir clairement les conditions de fin de conversation.

5. **Text-to-Speech** — Configurer le moteur TTS pour naturalité et performance : ElevenLabs (voix ultra-réalistes, clonage vocal, streaming), OpenAI TTS (simple, rapide, bonne qualité), Azure Speech (SSML avancé, personnalisation), Google Cloud TTS. Utiliser SSML pour contrôler les pauses, l'emphase et la prononciation des termes métier. Pré-générer les phrases les plus fréquentes pour réduire la latence.

6. **Optimisation de la latence** — Cible : latence totale perçue < 1,5 s de bout en bout. Techniques : streaming STT (commencer le traitement LLM avant la fin de la transcription), génération TTS en streaming (commencer la lecture pendant la génération), filler words ("Bien sûr, laissez-moi vérifier...") pour masquer le délai de traitement, parallélisation des appels d'outils, pré-computation des réponses fréquentes.

7. **Intégration téléphonie** — Connecter l'agent aux canaux vocaux : Twilio (PSTN, SIP, Flex), Vapi (stack voix IA clé en main, recommandé pour démarrer vite), LiveKit (WebRTC temps réel, self-hosted), SIP direct pour les intégrations PBX enterprise. Gérer les spécificités téléphoniques : qualité audio variable, bruit de fond, coupures réseau, transferts vers agents humains.

8. **Voice UX** — Concevoir l'expérience vocale selon les bonnes pratiques : confirmations concises ("D'accord, je note..."), questions à choix unique plutôt que multiples, messages d'erreur naturels ("Je n'ai pas bien compris, pourriez-vous reformuler ?"), gestion de la prononciation des nombres/dates/acronymes via SSML, personnalité de la voix cohérente avec la marque. Éviter les formules robotiques et les menus DTMF hérités.

9. **Multi-langue** — Implémenter la détection automatique de la langue dès les premières phrases, le basculement dynamique du pipeline STT/TTS vers la langue détectée, la gestion des accents régionaux via les modèles adaptés, la localisation des formats (dates, nombres, devises) et la gestion du code-switching (mélange de langues). Tester avec des locuteurs natifs de chaque langue supportée.

10. **Tests et validation** — Tester l'agent vocal avec une suite dédiée : simulation de conversations via text injection (sans audio) pour les tests fonctionnels, tests avec audio synthétique pour les tests STT, benchmarks de latence end-to-end sous charge, tests de robustesse (bruit de fond, mauvaise qualité audio), tests utilisateurs avec de vrais locuteurs. Monitorer en production : latence P50/P95, taux de transcription correcte, taux de succès conversationnel.

## Règles

- **La latence est reine** : une latence > 2 s détruit l'expérience vocale. Tout choix architectural doit être évalué à l'aune de son impact sur la latence perçue. Préférer le streaming à tous les niveaux du pipeline.
- **Concevoir pour la parole imparfaite** : les utilisateurs se reprennent, parlent avec du bruit, ont des accents. L'agent doit gérer gracieusement les transcriptions partiellement incorrectes sans demander de répéter plus de deux fois sur un même point.
- **Transparence sur les limites** : l'agent vocal doit clairement indiquer quand il ne comprend pas ou quand il transfère vers un humain. Ne jamais simuler une compréhension qui n'a pas eu lieu.
- **Tester avec de vraies voix** : les tests purement textuels ne suffisent pas. Valider obligatoirement avec des enregistrements audio réels avant la mise en production, couvrant les accents, âges et conditions d'enregistrement variés.
- **Fallback humain toujours disponible** : tout agent vocal en production doit avoir un mécanisme de transfert vers un agent humain accessible à tout moment. Définir les déclencheurs automatiques (frustration détectée, échecs répétés, demande explicite).
