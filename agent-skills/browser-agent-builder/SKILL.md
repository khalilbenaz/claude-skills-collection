---
name: browser-agent-builder
description: Construction d'agents de navigation web autonomes incluant scraping intelligent, interaction DOM et gestion de sessions. Se déclenche avec "browser agent", "agent navigateur", "agent web autonome", "Puppeteer agent", "Playwright agent"
---

# Browser Agent Builder

## Workflow
1. **Choisir le framework de navigation** — Sélectionner l'outil adapté : Playwright (multi-navigateur, auto-wait), Puppeteer (Chrome-focused), ou Selenium (legacy). Évaluer les besoins : headless vs headed, multi-onglets, interception réseau, support mobile. Privilégier Playwright pour les nouveaux projets.
2. **Concevoir l'architecture de l'agent** — Définir les composants : module de navigation (goto, click, fill, scroll), module d'extraction (DOM parsing, sélecteurs CSS/XPath), module de décision (LLM pour interpréter les pages), module de mémoire (historique des pages visitées, état de la session).
3. **Implémenter l'interaction DOM intelligente** — Développer des sélecteurs résilients : préférer les data-testid, aria-labels et rôles ARIA aux sélecteurs CSS fragiles. Implémenter l'auto-wait et le retry sur les éléments dynamiques. Gérer les iframes, shadow DOM et les web components.
4. **Intégrer la vision par LLM** — Capturer des screenshots et les envoyer au LLM multimodal (GPT-4o, Claude) pour comprendre les pages visuellement. Utiliser la vision pour naviguer dans les interfaces complexes où les sélecteurs DOM ne suffisent pas. Combiner extraction DOM et vision pour la robustesse.
5. **Gérer les sessions et l'authentification** — Persister les cookies et le localStorage entre les sessions. Implémenter les flows d'authentification (login, OAuth, 2FA avec TOTP). Gérer les captchas avec des services de résolution ou des stratégies de contournement légales (rate limiting, user-agent rotation).
6. **Implémenter l'anti-détection** — Configurer les fingerprints de navigateur réalistes (user-agent, viewport, WebGL, fonts). Utiliser des proxies rotatifs. Randomiser les délais entre les actions pour simuler un comportement humain. Respecter les robots.txt et les conditions d'utilisation.
7. **Orchestrer les workflows multi-pages** — Concevoir des state machines pour les parcours complexes (formulaires multi-étapes, checkout, recherche itérative). Implémenter le error recovery avec des stratégies de retry et de fallback. Logger chaque étape avec des screenshots pour le debugging.
8. **Tester et maintenir** — Écrire des tests end-to-end pour les workflows critiques. Monitorer les changements de structure DOM qui cassent les sélecteurs. Implémenter des alertes sur les taux d'échec. Versionner les scripts d'extraction avec des tests de régression.

## Règles
- Toujours respecter les conditions d'utilisation des sites visités et le robots.txt ; ne jamais scraper des données personnelles sans consentement légal.
- Ne jamais coder en dur les sélecteurs CSS basés sur des classes générées dynamiquement ; utiliser des attributs stables (data-testid, aria-label, rôles).
- Toujours implémenter des délais raisonnables entre les requêtes pour ne pas surcharger les serveurs cibles et éviter le blocage IP.
- Persister systématiquement l'état de session (cookies, tokens) pour éviter les ré-authentifications coûteuses et les déclenchements de sécurité.
- Toujours capturer des screenshots à chaque étape critique du workflow pour faciliter le debugging et l'audit des actions de l'agent.
