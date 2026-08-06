---
name: prompt-translator
description: Adapte un prompt d'un modèle/plateforme à un autre en préservant l'intention. À utiliser pour porter un prompt de ChatGPT vers Claude, de Midjourney vers DALL-E, ou entre modèles. Se déclenche aussi avec "adapter pour Claude", "convertir de GPT", "porter ce prompt", "prompt Midjourney", ou toute traduction de prompt entre modèles. Also triggers on "adapt a prompt to another model", "port a prompt", "same prompt for GPT and Claude".
---

# Prompt Translator

## Workflow de traduction en 5 étapes

### Étape 1 — Collecte des infos

Demander si absent :
- **Modèle source** (ex. `gpt-4o`, `claude-3-5-sonnet`, `midjourney v6`, `gemini-1.5-pro`)
- **Modèle cible** (ex. `claude-opus-4`, `dall-e-3`, `gpt-4.1`)
- **Prompt original complet** — system prompt + user message séparés si applicable
- **Contexte d'usage** (API directe, playground, intégration applicative)

---

### Étape 2 — Diagnostic des différences critiques

Analyser selon la paire source→cible :

| Dimension | GPT-4x | Claude | Gemini | Midjourney/DALL-E |
|---|---|---|---|---|
| Structure préférée | Markdown, instructions linéaires | Balises XML `<role>`, `<context>`, `<instructions>` | Markdown, liste hiérarchique | Paramètres inline (`--ar`, style tokens) |
| System prompt | `{"role":"system","content":"..."}` | `system=` param séparé | `system_instruction` | N/A |
| Few-shot | Messages alternés user/assistant | `<examples>` XML ou messages alternés | Turns multimodaux | Tokens de style (ex. `in the style of`) |
| Longueur optimale | ~2 000 tokens suffit | Supporte 200k, profite des instructions longues | 1M tokens, verbose ok | 77 tokens max (CLIP) |
| Refus/guardrails | Safety layer strict, tournures à éviter | Nuancé, accepte ambiguïté si contexte clair | Modéré | Filtrage image automatique |

---

### Étape 3 — Règles de traduction par cas

#### GPT → Claude
```
# Avant (GPT)
system: "You are a helpful assistant. Be concise."
user: "Summarize: {{text}}"

# Après (Claude)
<system>
Vous êtes un assistant expert en synthèse.
<constraints>Répondez en moins de 150 mots. Langue : français.</constraints>
</system>
<task>Résumez le texte suivant :\n<text>{{text}}</text></task>
```
- Remplacer les instructions implicites par des contraintes XML explicites
- Séparer `role`, `context`, `task`, `output_format` en balises distinctes
- Supprimer les tournures "You must never…" → préférer "Faites X" (positif)
- `temperature=0` GPT ≈ `temperature=0` Claude (échelles identiques 0–1)

#### Claude → GPT
```
# Avant (Claude XML)
<instructions>Liste les 3 points clés. Format JSON.</instructions>
<text>{{text}}</text>

# Après (GPT)
system: "Tu es un assistant analytique. Réponds toujours en JSON valide."
user: "Liste les 3 points clés du texte suivant :\n\n{{text}}\n\nFormat attendu : {\"points\":[...]}"
```
- Aplatir les balises XML en texte structuré Markdown
- Déplacer le format de sortie dans le message user ou en fin de system
- Ajouter `response_format: {"type":"json_object"}` si JSON requis (API)

#### Midjourney → DALL-E 3
```
# Avant (Midjourney)
/imagine a futuristic city at dusk, cyberpunk, neon lights, rainy streets --ar 16:9 --style raw --v 6.1

# Après (DALL-E 3)
"A wide-angle (16:9 crop) photorealistic render of a futuristic cyberpunk city at dusk.
Neon lights reflect on rain-slicked streets. No text, no watermark.
Style: cinematic, high contrast, volumetric fog."
```
- Traduire `--ar` → description de cadrage ("landscape", "portrait", "square")
- `--style raw` → "photorealistic", "no artistic filter"
- `--v 6` → sans équivalent, préciser "hyper-detailed, current AI render quality"
- `--no X` → "Exclude: X" en fin de prompt DALL-E

#### Midjourney → Stable Diffusion / Flux
```
# Avant
/imagine portrait of a samurai, bokeh, 85mm lens --ar 2:3 --style raw

# Après (SD/Flux — positive + negative)
positive: "portrait of a samurai, bokeh background, 85mm lens, photorealistic, sharp focus, 2:3 ratio"
negative: "blurry, cartoon, anime, watermark, low quality, deformed hands"
```
- Toujours générer un prompt négatif explicite
- Ajouter des tokens de qualité : `masterpiece, best quality, 8k`
- Préciser le sampler si connu : `DPM++ 2M Karras`, `Euler a`

---

### Étape 4 — Livraison du prompt traduit

Fournir :
1. **Prompt final copier-coller** (code block, sans explication mélangée)
2. **Paramètres API** si applicable (temperature, max_tokens, response_format)

Exemple de bloc livrable :
```python
# Claude API
response = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    system="<role>Expert en synthèse</role>",
    messages=[{"role": "user", "content": "<task>Résumez : {{text}}</task>"}]
)
```

---

### Étape 5 — Notes de migration

Signaler systématiquement :
- **Fonctionnalités perdues** (ex. vision GPT-4V → pas de vision en mode text-only Claude)
- **Fonctionnalités gagnées** (ex. contexte 200k Claude vs 128k GPT)
- **Comportements différents** : ton par défaut, verbosité, format JSON natif
- **Paramètres à ajuster** : `top_p`, `temperature`, seeds image
- **Tests recommandés** : 3 à 5 inputs représentatifs avant de valider la migration

---

## Garde-fous & anti-patterns

| Anti-pattern | Problème | Correctif |
|---|---|---|
| Copier-coller le prompt sans adaptation | Format inadapté, résultats dégradés | Toujours appliquer les règles de structure cible |
| Traduire `--ar` par rien | DALL-E ignore le ratio, image carrée | Ajouter le ratio en texte ("landscape 16:9") |
| Garder les balises XML pour GPT | GPT les lit comme texte littéral | Aplatir en Markdown |
| Omettre le prompt négatif pour SD/Flux | Artefacts visuels fréquents | Prompt négatif obligatoire |
| Ignorer les limites de tokens Midjourney | Prompt tronqué silencieusement à 77 tokens | Compresser le prompt, tester le token count |
| `system` vide pour Claude | Comportement générique, pas de persona | Toujours renseigner `system=` |
| Temperature identique sans vérifier l'échelle | Gemini 0.0–2.0 ≠ Claude 0.0–1.0 | Normaliser selon l'échelle cible |

---

## Paires de traduction courantes (2026)

| Source | Cible | Effort | Notes |
|---|---|---|---|
| GPT-4o | Claude Opus/Sonnet | Faible | Structurer en XML, gain sur longs contextes |
| Claude 3.x | GPT-4.1 | Faible | Aplatir XML → Markdown |
| Midjourney v6 | DALL-E 3 | Moyen | Perte des paramètres fins de style |
| Midjourney v6 | Flux / SD 3.5 | Moyen | Nécessite prompt négatif |
| GPT-4o | Gemini 1.5/2.0 | Faible | Adapter `system` → `system_instruction` |
| Gemini | Claude | Faible | Ajouter XML, séparer system/user |


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
