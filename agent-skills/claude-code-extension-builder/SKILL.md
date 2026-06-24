---
name: claude-code-extension-builder
description: Construction d'extensions et skills pour Claude Code — slash commands, hooks, intégration MCP et commandes personnalisées. Se déclenche avec "extension Claude Code", "skill Claude", "slash command", "Claude Code plugin", "custom command Claude".
---

# Claude Code Extension Builder

## Critères de décision — quel type d'extension créer ?

| Besoin | Type d'extension |
|---|---|
| Réutiliser un workflow de prompt | **Skill** (SKILL.md) |
| Déclencher une action sur événement Claude | **Hook** (`.claude/settings.json`) |
| Exposer un outil externe (DB, API, fs) | **Serveur MCP** |
| Composer plusieurs skills en une commande | **Slash command custom** |

---

## Workflow en étapes

### 1. Analyser le besoin

- Identifier le workflow répétitif ou l'outil à connecter.
- Répondre à : *déclenchement automatique ou à la demande ? sortie texte, fichier, ou action ?*
- Choisir le type (tableau ci-dessus) avant toute implémentation.

---

### 2. Créer un Skill (SKILL.md)

**Structure minimale obligatoire :**

```markdown
---
name: mon-skill                    # kebab-case, unique dans la collection
description: Une ligne, termine avec les phrases de déclenchement entre guillemets. Se déclenche avec "mot-clé A", "mot-clé B".
---

# Mon Skill

## Workflow

1. **Étape 1** — description actionnable.
2. **Étape 2** — ...

## Règles

- Règle 1 (obligatoire, concise).
```

**Bonnes pratiques :**
- `name` = identifiant technique → dossier `agent-skills/<category>/<name>/SKILL.md`.
- `description` : ≤ 2 phrases ; les triggers entre guillemets couvrent les synonymes naturels de l'utilisateur.
- Corps : 80-180 lignes, pas de section `## Communication Rules` (ajoutée automatiquement).
- Langue : français, termes techniques en anglais.

**Arborescence collection :**
```
agent-skills/
  dev/
    mon-skill/
      SKILL.md
  devops/
    ...
```

---

### 3. Configurer des Hooks

Les hooks interceptent les événements Claude Code pour automatiser des actions.

**Fichier :** `.claude/settings.json` (projet) ou `~/.claude/settings.json` (global).

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo '[hook] commande bash interceptée'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_TOOL_INPUT_FILE_PATH"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/notify-slack.js"
          }
        ]
      }
    ]
  }
}
```

**Événements disponibles :** `PreToolUse`, `PostToolUse`, `Notification`, `Stop`.

**Variables d'environnement injectées :**
- `CLAUDE_TOOL_NAME` — nom de l'outil utilisé
- `CLAUDE_TOOL_INPUT_FILE_PATH` — chemin fichier (si applicable)
- `CLAUDE_SESSION_ID` — id de session en cours

**Cas d'usage typiques :**
- `PostToolUse` + `Write` → auto-format, lint, tests unitaires.
- `PreToolUse` + `Bash` → bloquer des commandes dangereuses (`rm -rf`).
- `Stop` → notification Slack/Teams à la fin de chaque session.

---

### 4. Intégrer un serveur MCP

**Configuration dans `~/.claude/claude_desktop_config.json` :**

```json
{
  "mcpServers": {
    "mon-serveur": {
      "command": "node",
      "args": ["/chemin/vers/mon-serveur/index.js"],
      "env": {
        "API_KEY": "xxxx"
      }
    }
  }
}
```

**Squelette de serveur MCP (Node.js + SDK officiel) :**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "mon-serveur", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "mon_outil",
    description: "Description courte de l'outil",
    inputSchema: {
      type: "object",
      properties: { param: { type: "string", description: "Paramètre" } },
      required: ["param"]
    }
  }]
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "mon_outil") {
    const result = await faireQuelqueChose(request.params.arguments.param);
    return { content: [{ type: "text", text: result }] };
  }
});

await server.connect(new StdioServerTransport());
```

**Vérifier la connexion :**
```bash
claude mcp list          # lister les serveurs configurés
claude mcp get mon-serveur  # détails et outils exposés
```

---

### 5. Créer une Slash Command custom

Les slash commands combinent plusieurs skills ou enchaînent des instructions complexes.

**Emplacement :** `.claude/commands/<nom-commande>.md`

```markdown
# /mon-workflow

Effectue les étapes suivantes dans l'ordre :

1. Appelle le skill `code-review` sur les fichiers modifiés.
2. Génère un changelog depuis les commits non publiés.
3. Propose un bump de version sémantique.

Arguments : `$ARGUMENTS` (optionnels, transmis à chaque étape).
```

**Invoquer dans Claude Code :** `/mon-workflow` ou `/mon-workflow fix bug login`.

---

### 6. Tester l'extension

```bash
# Lancer Claude Code en mode verbeux pour voir les hooks déclenchés
claude --debug

# Tester un skill manuellement
claude "utilise le skill mon-skill pour analyser ce fichier"

# Valider la structure frontmatter d'un SKILL.md
head -5 agent-skills/dev/mon-skill/SKILL.md
```

**Checklist de validation :**
- [ ] Les triggers déclenchent le skill et pas un autre.
- [ ] Le workflow est exécutable sans ambiguïté.
- [ ] Les hooks ne cassent pas les outils existants.
- [ ] Le serveur MCP répond dans `claude mcp get`.
- [ ] La slash command passe les arguments correctement.

---

## Garde-fous / Anti-patterns / Pièges

| Anti-pattern | Conséquence | Correctif |
|---|---|---|
| Triggers trop génériques (`"aide"`, `"code"`) | Déclenchements non voulus | Triggers spécifiques de 2-3 mots |
| Hook sans gestion d'erreur | Claude bloqué si le script plante | `command || true` ou `try/catch` |
| MCP server avec timeout élevé | Ralentissement de toutes les sessions | Timeout ≤ 5 s, async non-bloquant |
| Sections `## Communication Rules` dans le corps | Doublon cassant le skill | Supprimer — section auto-injectée |
| `name` avec espaces ou majuscules | Problème de résolution du skill | Toujours kebab-case |
| Skill > 200 lignes | Dilution des instructions clés | Découper en sous-skills dédiés |
| Pas de `required` dans le schema MCP | Paramètres silencieusement ignorés | Toujours déclarer `required: [...]` |

---

## Bonnes pratiques 2026

- **Versionner** la collection skills dans Git avec un `CHANGELOG.md` par skill modifié.
- **Un dossier = un skill** : pas de SKILL.md racine regroupant plusieurs skills.
- **Nommer les hooks** de façon unique pour faciliter le debug (`"id": "format-on-write"`).
- **Préférer `stdio` au `http`** pour les serveurs MCP locaux (pas de gestion de port).
- **Documenter les dépendances** dans le SKILL.md lui-même (ex: `# Prérequis : node ≥ 20, jq`).
- **Tester en isolation** : désactiver les autres hooks pour valider un hook seul.
