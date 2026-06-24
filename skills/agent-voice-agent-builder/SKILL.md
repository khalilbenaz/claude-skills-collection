---
name: agent-voice-agent-builder
description: Construction d'agents vocaux conversationnels avec STT, TTS et gestion du dialogue. Se déclenche avec "voice agent", "agent vocal", "téléphone IA", "voice bot", "STT", "TTS", "speech to text", "conversational AI", "IVR intelligent", "Vapi", "LiveKit".
---

# Voice Agent Builder

## Quand utiliser ce skill

Conception ou implémentation d'un agent vocal interactif : bot téléphonique, IVR intelligent, assistant vocal webapp, agent conversationnel WebRTC/SIP. Couvre le pipeline complet STT → LLM → TTS et la gestion du dialogue.

---

## Workflow en étapes

### 1. Choix d'architecture

**Décision clé :** synchrone vs streaming end-to-end.

| Critère | Synchrone (simple) | Streaming E2E (recommandé prod) |
|---|---|---|
| Latence typique | 2–4 s | < 1 s |
| Complexité | Faible | Élevée |
| Cas d'usage | PoC, flux courts | Production, conversations longues |

Pipeline cible :
```
Micro → VAD → STT (stream) → LLM (stream) → TTS (stream) → Haut-parleur
                ↑ barge-in détecté → interrompre TTS
```

**Stack recommandée 2026 pour démarrer vite :**
- Plateforme voix : **Vapi** (gère WebRTC/PSTN, VAD, barge-in, SIP nativement)
- STT : **Deepgram Nova-3** (streaming, < 300 ms first byte, FR/EN)
- LLM : **GPT-4o / Claude 3.5 Sonnet** (streaming obligatoire)
- TTS : **ElevenLabs Turbo v2.5** ou **OpenAI TTS-1**

---

### 2. Speech-to-Text (STT)

**Critères de sélection :**

| Moteur | Latence stream | Langues | Coût/min | Cas d'usage |
|---|---|---|---|---|
| Deepgram Nova-3 | ~200 ms | 36 langues | $0.0043 | Production générale |
| Whisper large-v3 | ~500 ms (local) | 99 langues | Gratuit (GPU) | Multi-langue, RGPD strict |
| Azure Speech | ~250 ms | 100+ | $0.016 | Intégration Microsoft |
| Google STT v2 | ~300 ms | 125 | $0.016 | Écosystème GCP |

**Configuration VAD incontournable :**
```python
# Deepgram avec VAD + barge-in
dg_config = {
    "model": "nova-3",
    "language": "fr",
    "interim_results": True,      # transcription partielle pour barge-in
    "endpointing": 300,           # ms de silence avant fin d'énoncé
    "utterance_end_ms": 1000,     # timeout si silence prolongé
    "vad_events": True,           # événements speech_started / speech_ended
    "smart_format": True,         # formatage nombres, dates auto
}
```

**Barge-in (interruption utilisateur) :**
```python
async def on_speech_started():
    if tts_is_playing:
        await tts_client.stop()       # couper TTS immédiatement
        await cancel_pending_llm()    # annuler génération en cours si possible
        conversation.add_interruption_marker()
```

---

### 3. Gestion du dialogue

**Choisir le bon modèle de gestion d'état :**

- **State machine** : flux structurés (prise de RDV, paiement, identification). Déterministe, testable.
- **LLM pur** : conversations libres, FAQs. Flexible mais moins contrôlable.
- **Hybride (recommandé)** : state machine pour les étapes critiques (confirmation, paiement), LLM pour le remplissage et les clarifications.

```python
# Exemple system prompt voice-optimized
SYSTEM_PROMPT = """
Tu es l'assistant vocal de {company}. Règles strictes :
- Réponds en 1 à 2 phrases maximum. Les réponses longues sont coupées par l'utilisateur.
- N'utilise jamais de listes à puces, markdown, ou caractères spéciaux.
- Dis les nombres à l'oral ("vingt-trois" pas "23").
- Si tu ne comprends pas, dis : "Pouvez-vous reformuler ?"
- Si tu ne peux pas aider : "Je vous transfère à un conseiller."
État actuel : {state}
Contexte : {context}
"""
```

**Gestion des silences :**
```python
SILENCE_TIMEOUT_MS = 5000
REPROMPT_MESSAGE = "Je suis toujours là, vous pouvez parler."
MAX_REPROMPTS = 2  # au-delà → transfert humain ou fin d'appel
```

---

### 4. Text-to-Speech (TTS)

**Sélection moteur :**

| Moteur | Latence TTFB | Qualité | Streaming | Clonage vocal |
|---|---|---|---|---|
| ElevenLabs Turbo v2.5 | ~200 ms | Excellent | ✅ | ✅ |
| OpenAI TTS-1 | ~300 ms | Bon | ✅ | ❌ |
| Azure Neural TTS | ~200 ms | Très bon | ✅ | Limité |
| Cartesia Sonic | ~90 ms | Bon | ✅ | ✅ |

**SSML pour les cas spéciaux :**
```xml
<!-- Pause naturelle + prononciation métier -->
<speak>
  Votre numéro de dossier est
  <say-as interpret-as="characters">ABC123</say-as>.
  <break time="500ms"/>
  Souhaitez-vous que je répète ?
</speak>
```

**Filler words pour masquer la latence LLM :**
```python
FILLERS = {
    "thinking": ["Bien sûr...", "Laissez-moi vérifier...", "Un instant..."],
    "searching": ["Je consulte votre dossier...", "Je recherche..."],
}
# Jouer le filler dès la réception du 1er token LLM si délai > 600 ms
async def stream_with_filler(llm_stream):
    first_chunk = await asyncio.wait_for(llm_stream.__anext__(), timeout=0.6)
    yield first_chunk
    async for chunk in llm_stream:
        yield chunk
# Si timeout → jouer filler, puis continuer stream
```

---

### 5. Intégration téléphonie / WebRTC

**Choisir la plateforme :**

| Plateforme | Type | Recommandé pour |
|---|---|---|
| **Vapi** | SaaS clé en main | Démarrage rapide, PSTN, webhook simple |
| **LiveKit** | Self-hosted WebRTC | Contrôle total, RGPD, faible latence |
| **Twilio Voice + Media Streams** | SaaS PSTN | Intégration Twilio existante |
| **Asterisk/FreeSWITCH + SIP** | Self-hosted PBX | Enterprise, on-premise strict |

**Exemple Vapi — démarrer un appel sortant :**
```bash
curl -X POST https://api.vapi.ai/call/phone \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumberId": "xxx",
    "customer": {"number": "+33600000000"},
    "assistant": {
      "model": {"provider": "anthropic", "model": "claude-sonnet-4-5"},
      "voice": {"provider": "elevenlabs", "voiceId": "yyy"},
      "firstMessage": "Bonjour, je suis votre assistant vocal.",
      "silenceTimeoutSeconds": 5
    }
  }'
```

**Transfert vers humain (escalade) — toujours prévoir :**
```python
ESCALATION_TRIGGERS = [
    lambda ctx: ctx.failed_intents >= 3,        # incompréhensions répétées
    lambda ctx: ctx.sentiment_score < -0.6,      # frustration détectée
    lambda ctx: "conseiller" in ctx.last_user_text,
    lambda ctx: ctx.turn_count > 20,             # conversation trop longue
]
```

---

### 6. Optimisation latence

Cible : **< 1,2 s end-to-end** perçu par l'utilisateur.

```
Budget latence :
  STT first result    : 150–300 ms
  LLM first token     : 200–400 ms  (streaming requis)
  TTS first audio     : 100–250 ms  (streaming requis)
  Transport réseau    : 50–100 ms
  ─────────────────────────────────
  Total cible         : 500–1050 ms ✅
```

Optimisations prioritaires :
1. **Streaming à tous les niveaux** — ne jamais attendre la fin d'une étape pour commencer la suivante.
2. **Truncation des réponses longues** — couper après 60 mots si l'utilisateur peut interrompre.
3. **Cache TTS** — pré-générer les phrases fixes (accueil, erreurs courantes) et les servir depuis le CDN.
4. **Modèle LLM léger** — pour les tours simples (confirmation oui/non), utiliser un modèle rapide (GPT-4o-mini) plutôt que le modèle complet.
5. **Déploiement régional** — héberger STT/LLM/TTS dans la même région cloud pour minimiser les RTT inter-services.

---

### 7. Tests et validation

```python
# Test sans audio — text injection (CI/CD)
response = await agent.process_turn(
    text="Je voudrais annuler ma commande numéro 4521",
    session_id="test-001"
)
assert response.intent == "cancel_order"
assert "4521" in response.entities["order_id"]
assert len(response.tts_text.split()) <= 30  # réponse courte

# Benchmark latence end-to-end
import time
latencies = []
for audio_file in test_audio_samples:
    t0 = time.perf_counter()
    await agent.process_audio(audio_file)
    latencies.append(time.perf_counter() - t0)
assert statistics.quantiles(latencies, n=20)[18] < 1.5  # P95 < 1.5 s
```

**Checklist avant mise en production :**
- [ ] Testé avec enregistrements réels (accents, bruit de fond, mobile vs fixe)
- [ ] Latence P95 < 1,5 s mesurée sous charge (10+ appels simultanés)
- [ ] Barge-in fonctionnel et non perturbateur
- [ ] Transfert humain accessible à tout moment et testé
- [ ] Gestion des coupures réseau (reconnexion, reprise de session)
- [ ] Monitoring latence, taux d'erreur STT, taux d'escalade en place

---

## Garde-fous / Anti-patterns / Pièges

| Anti-pattern | Conséquence | Correction |
|---|---|---|
| Attendre la fin de transcription pour appeler le LLM | Latence +800 ms | Streaming STT → LLM dès interim results stables |
| Réponses TTS > 3 phrases | Interruption, frustration | Limiter à 1–2 phrases par tour |
| Pas de VAD côté client | Faux déclenchements, écho | Intégrer VAD (WebRTC VAD, Silero VAD) |
| Appeler le LLM à chaque mot interimaire | Surcoût ×10, incohérence | Attendre endpointing (silence > 300 ms) |
| SSML avec balises non supportées par le moteur TTS | Lecture littérale des balises | Tester le SSML sur chaque moteur cible |
| Aucun fallback si STT timeout | Appel bloqué indéfiniment | Timeout + reprompt + escalade après 2 échecs |
| Stocker l'audio des conversations sans consentement | Non-conformité RGPD | Consentement explicite ou transcription-only |
| Pipeline monolithique non testable unitairement | Debugging impossible | Interfaces mockables entre STT/LLM/TTS |

---

## Bonnes pratiques 2026

- **Modèles audio natifs** : GPT-4o Audio et Gemini 2.0 Flash Live permettent de court-circuiter le pipeline STT→LLM→TTS en un seul appel. Évaluer pour les cas où la latence est critique et le contrôle fin sur la voix moins important.
- **Détection d'émotion** : intégrer un classificateur léger (Hume AI, ou modèle local) sur l'audio pour adapter le ton de l'agent en temps réel.
- **Voice Activity Detection locale** : toujours faire le VAD côté client (Silero VAD WebAssembly) avant d'envoyer au STT cloud pour réduire les coûts et la latence.
- **Test de régression audio** : maintenir un corpus d'enregistrements annotés et rejouer après chaque changement de modèle STT/LLM/TTS.
- **Observabilité** : tracer chaque tour de conversation avec `trace_id` commun STT/LLM/TTS pour le debugging de latence. Alerter sur P95 > 2 s et taux d'escalade > 15 %.


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
