---
name: browser-agent-builder
description: Construction d'agents de navigation web autonomes incluant scraping intelligent, interaction DOM et gestion de sessions. Se déclenche avec "browser agent", "agent navigateur", "agent web autonome", "Puppeteer agent", "Playwright agent"
---

# Browser Agent Builder

## 1. Choisir le framework

| Critère | Playwright | Puppeteer | Selenium |
|---|---|---|---|
| Multi-navigateur | ✅ Chromium, Firefox, WebKit | ❌ Chrome/Edge uniquement | ✅ tous |
| Auto-wait natif | ✅ | ❌ (manuel) | ❌ (manuel) |
| Interception réseau | ✅ `route()` | ✅ `setRequestInterception` | ❌ limité |
| Support mobile | ✅ `devices` preset | ❌ | ❌ |
| Ecosystème / doc | Excellent (2024–2026) | Bon | Vieillissant |

**Décision** : Playwright par défaut sur tout nouveau projet. Puppeteer si contrainte Chrome-only ou lib existante. Selenium uniquement legacy/Java.

```bash
# Installation Playwright (Node.js)
npm init -y && npm i -D playwright
npx playwright install chromium   # ou --with-deps pour CI

# Python
pip install playwright && playwright install chromium
```

## 2. Architecture de l'agent

```
┌───────────────────────────────────────────────┐
│                  Orchestrateur                │
│  (LLM : planifie, décide, retry si échec)     │
└────────┬──────────────┬────────────┬──────────┘
         │              │            │
    Navigation      Extraction   Mémoire/État
  (goto/click/fill) (DOM/vision) (cookies, historique)
```

Composants minimaux :
- **Navigator** : wraps `page.goto / click / fill / keyboard`
- **Extractor** : `page.$eval`, `locator`, screenshot → LLM
- **SessionStore** : persist cookies + localStorage sur disque
- **DecisionLoop** : LLM reçoit DOM/screenshot, émet actions structurées

## 3. Implémenter l'interaction DOM robuste

```typescript
// Sélecteurs stables — ordre de préférence
page.getByRole('button', { name: 'Valider' })      // 1er choix
page.getByTestId('submit-btn')                      // 2e choix
page.getByLabel('Email')                            // 3e choix
page.locator('[data-id="checkout"]')                // 4e choix
// Jamais : page.locator('.css-1a2b3c')             // ❌ généré dynamiquement

// Auto-wait + retry inclus dans Playwright — ne pas ajouter de sleep manuel
await page.getByRole('button', { name: 'Valider' }).click()

// Shadow DOM
const shadow = page.locator('my-component').locator('pierce=button')

// iFrame
const frame = page.frameLocator('#checkout-iframe')
await frame.getByLabel('Numéro carte').fill('4111111111111111')
```

## 4. Intégrer la vision LLM (multimodal)

Utiliser les screenshots quand le DOM est insuffisant (canvas, interfaces riches, CAPTCHAs visuels lisibles).

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

async function describePageAndAct(page: Page): Promise<string> {
  const screenshot = await page.screenshot({ type: 'png' })
  const b64 = screenshot.toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
        { type: 'text', text: 'Quelle action faut-il effectuer ensuite pour compléter le formulaire ?' }
      ]
    }]
  })
  return (response.content[0] as any).text
}
```

**Règle** : vision = fallback coûteux — toujours tenter le sélecteur DOM d'abord.

## 5. Gestion de session et authentification

```typescript
// Sauvegarder l'état de session après login
await page.context().storageState({ path: 'session.json' })

// Réutiliser à la session suivante
const context = await browser.newContext({
  storageState: 'session.json'
})

// TOTP (2FA) avec otplib
import { totp } from 'otplib'
const code = totp.generate(process.env.TOTP_SECRET!)
await page.getByLabel('Code OTP').fill(code)
```

## 6. Anti-détection — périmètre légal uniquement

```typescript
// Playwright : stealth via playwright-extra
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
chromium.use(StealthPlugin())

// Profil réaliste
const context = await chromium.launchPersistentContext('', {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  viewport: { width: 1366, height: 768 },
  locale: 'fr-FR',
  timezoneId: 'Africa/Tunis'
})

// Délais humains : randomiser, ne jamais fixer
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
await delay(500 + Math.random() * 1000)
```

## 7. Orchestration multi-pages et error recovery

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxAttempts - 1) throw err
      await page.screenshot({ path: `error_attempt_${i}.png` })
      await page.reload()
      await delay(2000)
    }
  }
  throw new Error('unreachable')
}

// State machine simple
type Step = 'login' | 'search' | 'extract' | 'done'
let step: Step = 'login'
while (step !== 'done') {
  switch (step) {
    case 'login':  await doLogin();  step = 'search'; break
    case 'search': await doSearch(); step = 'extract'; break
    case 'extract': await extract(); step = 'done'; break
  }
}
```

## 8. Tests et monitoring

```typescript
// Playwright Test — test E2E du workflow critique
import { test, expect } from '@playwright/test'

test('workflow checkout complet', async ({ page }) => {
  await page.goto('https://shop.example.com')
  await page.getByRole('button', { name: 'Ajouter au panier' }).click()
  await expect(page.getByText('1 article')).toBeVisible()
})
```

```bash
# Lancer en CI (headless, reporters JUnit)
npx playwright test --reporter=junit --output=results.xml
```

Monitoring : alerter si taux d'échec > 5 % sur 1 h. Versionner les snapshots DOM avec des tests de régression sur les sélecteurs clés.

## Anti-patterns / Pièges

- **`page.waitForTimeout(3000)`** — ne jamais utiliser de sleep fixe ; utiliser `waitForSelector` ou les auto-waits Playwright.
- **Sélecteurs sur classes CSS générées** (`css-1x2y3z`) — ils changent à chaque build ; toujours utiliser `role`, `label`, `data-testid`.
- **Pas de gestion d'erreur sur les navigations** — un réseau lent ou une redirection inattendue fait planter silencieusement. Toujours `try/catch` + screenshot.
- **Scraper sans robots.txt check** — vérifier `GET /robots.txt` avant d'automatiser et respecter les `Crawl-delay`.
- **Screenshots en fin de workflow uniquement** — capturer à chaque étape critique (avant/après form submit, après login, à chaque page nouvelle).
- **Ouvrir un nouveau contexte pour chaque requête** — coûteux ; réutiliser `BrowserContext` et changer seulement les cookies/state.
- **Stocker des credentials en clair dans le code** — utiliser `.env` + `dotenv`, ne jamais commit `session.json`.

## Bonnes pratiques 2026

- Playwright MCP (`@playwright/mcp`) permet à Claude d'appeler directement les outils de navigation — idéal pour les agents LLM-driven sans coder les sélecteurs.
- Préférer les `locator` chainables aux `$` / `$$` (deprecated dans les nouvelles versions).
- Pour le scraping à grande échelle : Crawlee (Node) ou Scrapy + Playwright (Python) > code custom.
- Toujours isoler la logique de navigation de la logique métier pour faciliter les changements de sélecteurs sans modifier l'orchestrateur.
