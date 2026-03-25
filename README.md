# 🧠 Claude Skills Collection

La plus grande collection open-source de skills pour Claude — **296 skills** couvrant **26 domaines** du développement, de la sécurité, des agents IA, du DevOps, de la data, et de la vie quotidienne.

> Un skill transforme Claude en assistant spécialisé avec un workflow structuré étape par étape.

[![Skills](https://img.shields.io/badge/skills-296-blue)]()[![Categories](https://img.shields.io/badge/catégories-26-green)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()
[![Language](https://img.shields.io/badge/langue-Français-red)]()

---

## 📦 Catégories

| Catégorie | Skills | Description |
|-----------|--------|-------------|
| 🤖 [Agent Skills](./agent-skills) | 46 | Agents IA : frameworks, sous-agents, hiérarchies, délégation, communication, pipelines, déploiement, sécurité, **orchestrateur intelligent** |
| 💻 [Dev Skills](./dev-skills) | 93 | Développement complet : sécurité, architecture, DevOps, frontend, mobile, IA, langages, data, testing, UX/UI, blockchain, game dev, **.NET, gRPC, Prisma, RabbitMQ, OAuth2** |
| 🔧 [DevOps Skills](./devops-skills) | 4 | **NOUVEAU** — Terraform, Helm, Prometheus/Grafana, Azure Cloud |
| 📊 [Data Skills](./data-skills) | 3 | **NOUVEAU** — SQL avancé, modélisation dimensionnelle, qualité des données |
| 🔒 [Security Skills](./security-skills) | 3 | **NOUVEAU** — Threat modeling, API hardening, audit de dépendances |
| 🌐 [API Gateway Skills](./api-gateway-skills) | 3 | **NOUVEAU** — YARP, Kong, Ocelot |
| 🏥 [Health Skills](./health-skills) | 16 | Suivi santé, analyses, consultations, douleurs, allergies |
| 🧠 [Psy Skills](./psy-skills) | 12 | Santé mentale, émotions, thérapie, crise, burnout |
| 🎯 [Prompt Skills](./prompt-skills) | 6 | Optimisation, création et debug de prompts IA |
| ⚡ [Productivity Skills](./productivity-skills) | 6 | Planning, réunions, décisions, habitudes, projets, **post-mortem d'incident** |
| 💰 [Finance Skills](./finance-skills) | 6 | Budget, dépenses, épargne, investissement, impôts, **conformité fintech** |
| 📚 [Education Skills](./education-skills) | 5 | Révisions, flashcards, examens, apprentissage |
| ✍️ [Writing Skills](./writing-skills) | 6 | Blog, emails, copywriting, relecture, contenu, **changelog** |
| 🎯 [Career Skills](./career-skills) | 5 | CV, entretiens, salaire, LinkedIn, reconversion |
| ✈️ [Travel Skills](./travel-skills) | 5 | Itinéraire, bagages, visa, budget voyage, langues |
| 🤝 [Social Skills](./social-skills) | 5 | Conversations difficiles, conflits, networking, limites |
| 👶 [Parenting Skills](./parenting-skills) | 5 | Développement enfant, devoirs, écrans, coucher |
| ⚖️ [Legal Skills](./legal-skills) | 5 | Contrats, droits locataire, réclamations, RGPD |

---

## 🤖 Agent Skills — 46 Skills en 10 sous-catégories

### 🧭 Orchestration & Routing (1)
| Skill | Déclencheur |
|-------|-------------|
| [skill-router](./agent-skills/skill-router) | _"quel skill utiliser", "aide-moi à choisir", "orchestrateur", "dispatch", "route"_ |

### 🔧 Frameworks (5)
| Skill | Déclencheur |
|-------|-------------|
| [crewai-expert](./agent-skills/crewai-expert) | _"CrewAI", "crew", "équipe d'agents"_ |
| [autogen-guide](./agent-skills/autogen-guide) | _"AutoGen", "GroupChat", "ConversableAgent"_ |
| [langgraph-designer](./agent-skills/langgraph-designer) | _"LangGraph", "state machine agent", "conditional edges"_ |
| [semantic-kernel-guide](./agent-skills/semantic-kernel-guide) | _"Semantic Kernel", "agent .NET", "C# agent"_ |
| [openai-assistants-builder](./agent-skills/openai-assistants-builder) | _"OpenAI Assistants", "file search", "code interpreter"_ |

### 🧩 Patterns (5)
| Skill | Déclencheur |
|-------|-------------|
| [multi-agent-orchestrator](./agent-skills/multi-agent-orchestrator) | _"multi-agent", "orchestration", "supervisor", "swarm"_ |
| [agent-memory-designer](./agent-skills/agent-memory-designer) | _"mémoire agent", "long-term memory", "vector memory"_ |
| [tool-calling-architect](./agent-skills/tool-calling-architect) | _"tool calling", "function calling", "MCP tool"_ |
| [agent-evaluation-framework](./agent-skills/agent-evaluation-framework) | _"évaluer agent", "benchmark", "agent metrics"_ |
| [human-in-the-loop-designer](./agent-skills/human-in-the-loop-designer) | _"human in the loop", "approbation humaine", "HITL"_ |

### 🏗️ Infrastructure (5)
| Skill | Déclencheur |
|-------|-------------|
| [mcp-server-builder](./agent-skills/mcp-server-builder) | _"MCP", "Model Context Protocol", "serveur MCP"_ |
| [agent-deployment-guide](./agent-skills/agent-deployment-guide) | _"déployer agent", "agent en production", "agent API"_ |
| [agent-monitoring-setup](./agent-skills/agent-monitoring-setup) | _"monitoring agent", "LangSmith", "traces agent"_ |
| [agent-cost-optimizer](./agent-skills/agent-cost-optimizer) | _"coût agent", "réduire les coûts IA", "token optimization"_ |
| [agent-security-hardener](./agent-skills/agent-security-hardener) | _"sécurité agent", "prompt injection", "guardrails"_ |

### 🎯 Use Cases (5)
| Skill | Déclencheur |
|-------|-------------|
| [coding-agent-builder](./agent-skills/coding-agent-builder) | _"coding agent", "agent développeur", "Devin", "SWE-agent"_ |
| [research-agent-designer](./agent-skills/research-agent-designer) | _"research agent", "deep research", "agent qui cherche"_ |
| [data-analyst-agent](./agent-skills/data-analyst-agent) | _"data analyst agent", "agent pandas", "agent SQL"_ |
| [customer-support-agent](./agent-skills/customer-support-agent) | _"agent support", "chatbot support", "helpdesk agent"_ |
| [sales-agent-builder](./agent-skills/sales-agent-builder) | _"sales agent", "agent commercial", "SDR agent"_ |

### 🚀 Avancé (5)
| Skill | Déclencheur |
|-------|-------------|
| [agent-testing-framework](./agent-skills/agent-testing-framework) | _"tester agent", "agent testing", "agent CI/CD"_ |
| [agent-prompt-tuner](./agent-skills/agent-prompt-tuner) | _"optimiser prompt agent", "prompt tuning", "calibrer agent"_ |
| [agent-context-manager](./agent-skills/agent-context-manager) | _"context window", "token limit", "context overflow"_ |
| [voice-agent-builder](./agent-skills/voice-agent-builder) | _"voice agent", "agent vocal", "Vapi", "LiveKit"_ |
| [agent-marketplace-creator](./agent-skills/agent-marketplace-creator) | _"marketplace agent", "agent store", "agent registry"_ |

### 👨‍👦 Sous-Agents Core (5)
| Skill | Déclencheur |
|-------|-------------|
| [subagent-delegator](./agent-skills/subagent-delegator) | _"sous-agent", "délégation", "agent parent", "dispatch"_ |
| [agent-hierarchy-designer](./agent-skills/agent-hierarchy-designer) | _"hiérarchie agent", "manager agent", "worker agent", "arbre d'agents"_ |
| [agent-task-decomposer](./agent-skills/agent-task-decomposer) | _"décomposer tâche", "sous-tâches", "work breakdown", "agent planner"_ |
| [agent-result-aggregator](./agent-skills/agent-result-aggregator) | _"agréger résultats", "fusionner", "combiner outputs", "synthèse"_ |
| [agent-supervisor-builder](./agent-skills/agent-supervisor-builder) | _"supervisor", "contrôler sous-agents", "agent oversight"_ |

### 🔩 Sous-Agents Spécialisés (5)
| Skill | Déclencheur |
|-------|-------------|
| [web-scraper-subagent](./agent-skills/web-scraper-subagent) | _"sous-agent web", "scraper agent", "browser subagent"_ |
| [code-review-subagent](./agent-skills/code-review-subagent) | _"sous-agent review", "PR review agent", "quality check"_ |
| [api-caller-subagent](./agent-skills/api-caller-subagent) | _"sous-agent API", "HTTP agent", "REST agent"_ |
| [file-processor-subagent](./agent-skills/file-processor-subagent) | _"sous-agent fichier", "PDF agent", "Excel agent"_ |
| [database-query-subagent](./agent-skills/database-query-subagent) | _"sous-agent DB", "SQL agent", "NL2SQL", "text-to-SQL"_ |

### 📡 Communication & Coordination (5)
| Skill | Déclencheur |
|-------|-------------|
| [agent-message-protocol](./agent-skills/agent-message-protocol) | _"protocole agent", "message protocol", "inter-agent communication"_ |
| [agent-handoff-designer](./agent-skills/agent-handoff-designer) | _"handoff", "transfert agent", "passer la main", "relay"_ |
| [agent-consensus-builder](./agent-skills/agent-consensus-builder) | _"consensus", "vote agents", "décision collective", "agent debate"_ |
| [agent-conflict-resolver](./agent-skills/agent-conflict-resolver) | _"conflit agent", "résultats contradictoires", "arbitrage"_ |
| [agent-state-synchronizer](./agent-skills/agent-state-synchronizer) | _"synchronisation", "état partagé", "shared state", "concurrent agents"_ |

### ⚙️ Sous-Agents Avancés (5)
| Skill | Déclencheur |
|-------|-------------|
| [agent-spawner](./agent-skills/agent-spawner) | _"spawner", "créer agent dynamiquement", "agent factory"_ |
| [agent-pool-manager](./agent-skills/agent-pool-manager) | _"pool agent", "agent reuse", "warm agents", "worker pool"_ |
| [agent-retry-strategist](./agent-skills/agent-retry-strategist) | _"retry agent", "fallback", "error recovery", "circuit breaker"_ |
| [agent-load-balancer](./agent-skills/agent-load-balancer) | _"load balancer", "distribution charge", "répartir tâches"_ |
| [agent-pipeline-composer](./agent-skills/agent-pipeline-composer) | _"pipeline agent", "chaîne d'agents", "agent DAG", "sequential"_ |

---

## 💻 Dev Skills — 92 Skills en 17 sous-catégories

### 🔒 Sécurité (5)
| Skill | Déclencheur |
|-------|-------------|
| [security-auditor](./dev-skills/security-auditor) | _"audit sécurité", "vérifier la sécurité"_ |
| [owasp-checker](./dev-skills/owasp-checker) | _"OWASP", "top 10", "failles web"_ |
| [secrets-scanner](./dev-skills/secrets-scanner) | _"secrets", "clé API exposée", "credential leak"_ |
| [pentest-assistant](./dev-skills/pentest-assistant) | _"pentest", "test d'intrusion", "red team"_ |
| [vulnerability-analyzer](./dev-skills/vulnerability-analyzer) | _"vulnérabilité", "CVE", "CVSS"_ |

### 🏗️ Architecture (5)
| Skill | Déclencheur |
|-------|-------------|
| [microservices-designer](./dev-skills/microservices-designer) | _"microservices", "bounded context", "décomposition"_ |
| [design-patterns-advisor](./dev-skills/design-patterns-advisor) | _"design pattern", "SOLID", "factory", "strategy"_ |
| [system-design-helper](./dev-skills/system-design-helper) | _"system design", "architecture système", "scalability"_ |
| [clean-architecture-guide](./dev-skills/clean-architecture-guide) | _"clean architecture", "hexagonale", "ports and adapters"_ |
| [event-driven-architect](./dev-skills/event-driven-architect) | _"event driven", "RabbitMQ", "Kafka", "CQRS"_ |

### 🚀 DevOps & CI/CD (5)
| Skill | Déclencheur |
|-------|-------------|
| [docker-composer](./dev-skills/docker-composer) | _"Docker", "Dockerfile", "docker-compose"_ |
| [cicd-pipeline-builder](./dev-skills/cicd-pipeline-builder) | _"CI/CD", "pipeline", "GitHub Actions", "Azure DevOps"_ |
| [kubernetes-helper](./dev-skills/kubernetes-helper) | _"Kubernetes", "K8s", "kubectl", "helm"_ |
| [infrastructure-as-code](./dev-skills/infrastructure-as-code) | _"Terraform", "IaC", "Bicep", "Pulumi"_ |
| [monitoring-setup](./dev-skills/monitoring-setup) | _"monitoring", "Prometheus", "Grafana", "alerting"_ |

### 🔌 Backend & API (5)
| Skill | Déclencheur |
|-------|-------------|
| [rest-api-designer](./dev-skills/rest-api-designer) | _"API REST", "endpoints", "pagination", "versioning"_ |
| [graphql-builder](./dev-skills/graphql-builder) | _"GraphQL", "schema", "resolver", "Apollo"_ |
| [message-queue-architect](./dev-skills/message-queue-architect) | _"message queue", "RabbitMQ", "Kafka", "pub/sub"_ |
| [caching-strategy](./dev-skills/caching-strategy) | _"cache", "Redis", "cache invalidation"_ |
| [rate-limiter-designer](./dev-skills/rate-limiter-designer) | _"rate limit", "throttling", "429"_ |

### 🧪 Testing (5)
| Skill | Déclencheur |
|-------|-------------|
| [unit-test-generator](./dev-skills/unit-test-generator) | _"test unitaire", "Jest", "xUnit", "pytest"_ |
| [integration-test-builder](./dev-skills/integration-test-builder) | _"test d'intégration", "Testcontainers", "E2E"_ |
| [load-test-planner](./dev-skills/load-test-planner) | _"test de charge", "k6", "JMeter", "stress test"_ |
| [test-coverage-analyzer](./dev-skills/test-coverage-analyzer) | _"couverture", "coverage", "mutation testing"_ |
| [tdd-coach](./dev-skills/tdd-coach) | _"TDD", "red green refactor", "BDD"_ |

### ⚡ Performance & Cloud (5)
| Skill | Déclencheur |
|-------|-------------|
| [performance-profiler](./dev-skills/performance-profiler) | _"performance", "lent", "memory leak", "profiling"_ |
| [cloud-cost-optimizer](./dev-skills/cloud-cost-optimizer) | _"coût cloud", "facture Azure", "FinOps"_ |
| [scalability-planner](./dev-skills/scalability-planner) | _"scalabilité", "scaling", "montée en charge"_ |
| [database-migration-helper](./dev-skills/database-migration-helper) | _"migration", "EF migrations", "zero downtime"_ |
| [log-analyzer](./dev-skills/log-analyzer) | _"logs", "ELK", "debug production"_ |

### 🎨 Frontend & Web (5)
| Skill | Déclencheur |
|-------|-------------|
| [react-component-builder](./dev-skills/react-component-builder) | _"composant React", "Vue", "Angular", "Svelte"_ |
| [css-layout-solver](./dev-skills/css-layout-solver) | _"CSS", "Flexbox", "Grid", "centrer", "layout"_ |
| [accessibility-checker](./dev-skills/accessibility-checker) | _"accessibilité", "a11y", "WCAG", "ARIA"_ |
| [responsive-design-helper](./dev-skills/responsive-design-helper) | _"responsive", "mobile first", "media queries"_ |
| [web-performance-optimizer](./dev-skills/web-performance-optimizer) | _"Core Web Vitals", "LCP", "Lighthouse"_ |

### 🎨 UX/UI Design (5)
| Skill | Déclencheur |
|-------|-------------|
| [ux-research-guide](./dev-skills/ux-research-guide) | _"UX research", "persona", "test utilisateur"_ |
| [ui-design-system-builder](./dev-skills/ui-design-system-builder) | _"design system", "design tokens", "Figma"_ |
| [wireframe-advisor](./dev-skills/wireframe-advisor) | _"wireframe", "maquette", "mockup", "prototype"_ |
| [user-flow-designer](./dev-skills/user-flow-designer) | _"user flow", "parcours utilisateur", "onboarding"_ |
| [design-critique](./dev-skills/design-critique) | _"critique mon design", "UI review", "feedback"_ |
| [pencil-ui-designer](./dev-skills/pencil-ui-designer) | _"design moi", "génère une maquette", "landing page", "dashboard", "app mobile", "/pencil"_ |

### 📱 Mobile (5)
| Skill | Déclencheur |
|-------|-------------|
| [mobile-app-architect](./dev-skills/mobile-app-architect) | _"architecture mobile", "native vs cross-platform"_ |
| [flutter-helper](./dev-skills/flutter-helper) | _"Flutter", "Dart", "BLoC", "Riverpod"_ |
| [react-native-guide](./dev-skills/react-native-guide) | _"React Native", "Expo", "Hermes"_ |
| [ios-swift-advisor](./dev-skills/ios-swift-advisor) | _"iOS", "Swift", "SwiftUI", "Xcode"_ |
| [android-kotlin-advisor](./dev-skills/android-kotlin-advisor) | _"Android", "Kotlin", "Jetpack Compose"_ |

### 🤖 IA & Agents (5)
| Skill | Déclencheur |
|-------|-------------|
| [ai-agent-builder](./dev-skills/ai-agent-builder) | _"agent IA", "autonomous agent", "CrewAI", "ReAct"_ |
| [prompt-engineering-pro](./dev-skills/prompt-engineering-pro) | _"prompt engineering", "chain of thought", "few-shot"_ |
| [llm-integration-guide](./dev-skills/llm-integration-guide) | _"API OpenAI", "Claude API", "Ollama", "LLM local"_ |
| [rag-pipeline-designer](./dev-skills/rag-pipeline-designer) | _"RAG", "vector database", "ChromaDB", "Pinecone"_ |
| [ai-workflow-orchestrator](./dev-skills/ai-workflow-orchestrator) | _"LangChain", "LangGraph", "pipeline IA"_ |

### 🔤 Langages Spécifiques (6)
| Skill | Déclencheur |
|-------|-------------|
| [python-best-practices](./dev-skills/python-best-practices) | _"Python", "PEP 8", "FastAPI", "Django", "asyncio"_ |
| [typescript-mastery](./dev-skills/typescript-mastery) | _"TypeScript", "generics", "utility types", "strict"_ |
| [rust-guide](./dev-skills/rust-guide) | _"Rust", "ownership", "borrow checker", "lifetime"_ |
| [go-concurrency-guide](./dev-skills/go-concurrency-guide) | _"Go", "goroutine", "channel", "concurrency"_ |
| [java-spring-advisor](./dev-skills/java-spring-advisor) | _"Java", "Spring Boot", "JPA", "Hibernate"_ |
| [dotnet-csharp-advisor](./dev-skills/dotnet-csharp-advisor) | _".NET", "C#", "ASP.NET", "EF Core", "LINQ"_ |

### 📊 Data & ML (5)
| Skill | Déclencheur |
|-------|-------------|
| [data-pipeline-builder](./dev-skills/data-pipeline-builder) | _"data pipeline", "Airflow", "dbt", "Spark"_ |
| [ml-model-deployer](./dev-skills/ml-model-deployer) | _"MLOps", "model serving", "MLflow"_ |
| [feature-engineering-guide](./dev-skills/feature-engineering-guide) | _"feature engineering", "feature store", "encoding"_ |
| [data-validation-helper](./dev-skills/data-validation-helper) | _"data quality", "Great Expectations", "validation"_ |
| [etl-designer](./dev-skills/etl-designer) | _"ETL", "ELT", "data integration", "SSIS"_ |

### ⛓️ Blockchain & Game Dev (5)
| Skill | Déclencheur |
|-------|-------------|
| [smart-contract-auditor](./dev-skills/smart-contract-auditor) | _"smart contract", "Solidity", "audit blockchain"_ |
| [web3-dapp-builder](./dev-skills/web3-dapp-builder) | _"dApp", "Web3", "ethers.js", "wagmi"_ |
| [unity-game-helper](./dev-skills/unity-game-helper) | _"Unity", "game development", "C# Unity"_ |
| [game-design-patterns](./dev-skills/game-design-patterns) | _"game pattern", "ECS", "game loop", "state machine"_ |
| [pixel-art-advisor](./dev-skills/pixel-art-advisor) | _"pixel art", "sprite", "tileset", "Aseprite"_ |

### 🛠️ Outils & Fondamentaux (6)
| Skill | Déclencheur |
|-------|-------------|
| [api-doc-generator](./dev-skills/api-doc-generator) | _"documenter mon API", "swagger", "OpenAPI"_ |
| [bug-debugger](./dev-skills/bug-debugger) | _"j'ai un bug", "ça ne marche pas", "erreur"_ |
| [code-reviewer](./dev-skills/code-reviewer) | _"revois mon code", "code review"_ |
| [database-query-optimizer](./dev-skills/database-query-optimizer) | _"requête lente", "optimiser SQL", "EXPLAIN"_ |
| [git-workflow-helper](./dev-skills/git-workflow-helper) | _"git merge conflict", "branching strategy"_ |
| [regex-builder](./dev-skills/regex-builder) | _"regex", "expression régulière", "pattern matching"_ |

### 📝 Soft Skills Dev (5)
| Skill | Déclencheur |
|-------|-------------|
| [technical-writing-guide](./dev-skills/technical-writing-guide) | _"documentation technique", "ADR", "RFC", "README"_ |
| [code-documentation-pro](./dev-skills/code-documentation-pro) | _"documenter mon code", "docstring", "JSDoc"_ |
| [project-estimation-helper](./dev-skills/project-estimation-helper) | _"estimation", "combien de temps", "story points"_ |
| [tech-lead-advisor](./dev-skills/tech-lead-advisor) | _"tech lead", "mentoring", "décision technique"_ |
| [developer-onboarding-builder](./dev-skills/developer-onboarding-builder) | _"onboarding", "nouveau développeur", "getting started"_ |

### 🔷 .NET & Backend avancé (5)
| Skill | Déclencheur |
|-------|-------------|
| [dotnet-aspire-guide](./dev-skills/dotnet-aspire-guide) | _".NET Aspire", "Aspire", "AppHost", "orchestration cloud-native"_ |
| [grpc-service-designer](./dev-skills/grpc-service-designer) | _"gRPC", "protobuf", "fichier .proto", "streaming gRPC"_ |
| [hangfire-job-scheduler](./dev-skills/hangfire-job-scheduler) | _"Hangfire", "background job", "tâche de fond .NET", "cron job C#"_ |
| [health-check-monitor](./dev-skills/health-check-monitor) | _"health check", "liveness probe", "readiness probe", "endpoint santé"_ |
| [oauth2-oidc-advisor](./dev-skills/oauth2-oidc-advisor) | _"OAuth2", "OIDC", "JWT", "refresh token", "Keycloak"_ |

### 📨 Messaging & Patterns distribués (3)
| Skill | Déclencheur |
|-------|-------------|
| [rabbitmq-patterns-guide](./dev-skills/rabbitmq-patterns-guide) | _"RabbitMQ", "MassTransit", "exchange", "dead letter"_ |
| [outbox-pattern-guide](./dev-skills/outbox-pattern-guide) | _"outbox pattern", "saga", "transaction distribuée", "dual write"_ |
| [feature-flags-manager](./dev-skills/feature-flags-manager) | _"LaunchDarkly", "OpenFeature", "feature toggle", "déploiement progressif"_ |

### 📝 API & Contrats (2)
| Skill | Déclencheur |
|-------|-------------|
| [openapi-contract-first](./dev-skills/openapi-contract-first) | _"OpenAPI", "Swagger", "contract first", "spécification API"_ |
| [azure-devops-pipeline-advisor](./dev-skills/azure-devops-pipeline-advisor) | _"azure devops", "pipeline YAML", "azure pipeline", "CI/CD azure"_ |

### 🌐 Navigateur & ORM (5)
| Skill | Déclencheur |
|-------|-------------|
| [playwright-browser-automation](./dev-skills/playwright-browser-automation) | _"Playwright", "automatise le navigateur", "teste le formulaire"_ |
| [chrome-devtools-debugger](./dev-skills/chrome-devtools-debugger) | _"devtools", "debug navigateur", "inspecter la page"_ |
| [prisma-expert](./dev-skills/prisma-expert) | _"Prisma", "schema prisma", "migration prisma"_ |
| [sqlite-guide](./dev-skills/sqlite-guide) | _"SQLite", "requête SQL", "schéma SQLite"_ |
| [feature-flag-system](./dev-skills/feature-flag-system) | _"feature flag", "A/B test", "canary deployment"_ |

---

## 🔧 DevOps Skills — 4 Skills

| Skill | Déclencheur |
|-------|-------------|
| [terraform-guide](./devops-skills/terraform-guide) | _"Terraform", "HCL", "tfstate", "terraform plan"_ |
| [helm-chart-builder](./devops-skills/helm-chart-builder) | _"Helm", "chart helm", "values.yaml", "helm install"_ |
| [prometheus-grafana-setup](./devops-skills/prometheus-grafana-setup) | _"Prometheus", "Grafana", "PromQL", "alerting", "dashboard"_ |
| [azure-cloud-advisor](./devops-skills/azure-cloud-advisor) | _"Azure", "App Service", "Container Apps", "Azure Functions"_ |

---

## 📊 Data Skills — 3 Skills

| Skill | Déclencheur |
|-------|-------------|
| [sql-advanced-analytics](./data-skills/sql-advanced-analytics) | _"window function", "CTE récursive", "PARTITION BY", "ROW_NUMBER"_ |
| [dimensional-modeling](./data-skills/dimensional-modeling) | _"schéma en étoile", "star schema", "table de faits", "SCD", "data warehouse"_ |
| [data-quality-checker](./data-skills/data-quality-checker) | _"qualité données", "doublons", "validation données", "anomalie"_ |

---

## 🔒 Security Skills — 3 Skills

| Skill | Déclencheur |
|-------|-------------|
| [threat-modeling](./security-skills/threat-modeling) | _"threat modeling", "STRIDE", "surface d'attaque", "analyse de menaces"_ |
| [api-security-hardener](./security-skills/api-security-hardener) | _"sécurité API", "rate limiting", "OWASP API", "headers sécurité"_ |
| [dependency-audit](./security-skills/dependency-audit) | _"audit dépendances", "CVE", "npm audit", "supply chain security"_ |

---

## 🌐 API Gateway Skills — 3 Skills

| Skill | Déclencheur |
|-------|-------------|
| [yarp-gateway-designer](./api-gateway-skills/yarp-gateway-designer) | _"YARP", "reverse proxy .NET", "API gateway .NET"_ |
| [kong-api-gateway](./api-gateway-skills/kong-api-gateway) | _"Kong", "Kong Gateway", "Kong plugin"_ |
| [ocelot-gateway-guide](./api-gateway-skills/ocelot-gateway-guide) | _"Ocelot", "ocelot.json", "API gateway Ocelot"_ |

---

## ⭐ Top Skills

### 🧭 Orchestrateur
- **[skill-router](./agent-skills/skill-router)** — _"Quel skill utiliser ?"_ → routeur intelligent qui analyse ta demande et te dirige vers le bon skill

### 🤖 Agents IA
- **[crewai-expert](./agent-skills/crewai-expert)** — _"Créer un crew d'agents"_ → système multi-agents complet avec outils et mémoire
- **[langgraph-designer](./agent-skills/langgraph-designer)** — _"Agent workflow stateful"_ → graphes d'agents avec branchements et persistence
- **[mcp-server-builder](./agent-skills/mcp-server-builder)** — _"Connecter Claude à mon API"_ → serveur MCP avec tools, resources et prompts
- **[coding-agent-builder](./agent-skills/coding-agent-builder)** — _"Agent qui code"_ → coding agent autonome type Devin/SWE-agent
- **[agent-security-hardener](./agent-skills/agent-security-hardener)** — _"Sécuriser mon agent"_ → protection contre injection, abus et fuites

### 💻 Développement
- **[security-auditor](./dev-skills/security-auditor)** — _"Audit sécurité"_ → analyse complète 8 axes
- **[microservices-designer](./dev-skills/microservices-designer)** — _"Découper en microservices"_ → DDD + bounded contexts
- **[grpc-service-designer](./dev-skills/grpc-service-designer)** — _"API gRPC"_ → contrats Protobuf, streaming, implémentation C#
- **[outbox-pattern-guide](./dev-skills/outbox-pattern-guide)** — _"Transaction distribuée"_ → Outbox + Saga avec MassTransit
- **[dotnet-aspire-guide](./dev-skills/dotnet-aspire-guide)** — _".NET Aspire"_ → orchestration cloud-native avec dashboard

### 🎯 Prompt Engineering
- **[prompt-optimizer](./prompt-skills/prompt-optimizer)** — _"Améliore mon prompt"_ → analyse 7 critères + version optimisée
- **[mega-prompt-builder](./prompt-skills/mega-prompt-builder)** — _"Crée un prompt pour X"_ → mega-prompt structuré complet
- **[system-prompt-architect](./prompt-skills/system-prompt-architect)** — _"System prompt pour mon chatbot"_ → prompt système robuste

---

## 🚀 Installation rapide

```bash
# Cloner le repo
git clone https://github.com/khalilbenaz/claude-skills-collection.git

# Packager un skill
cd claude-skills-collection/agent-skills/crewai-expert
zip ../../crewai-expert.skill SKILL.md

# → Importer le fichier .skill dans Claude.ai (Paramètres → Skills)
```

📖 Guide complet : **[docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)**

---

## 📖 Documentation

| Document | Contenu |
|----------|---------|
| [🚀 Getting Started](./docs/GETTING_STARTED.md) | Installation, utilisation, FAQ |
| [📚 Skill Catalog](./docs/SKILL_CATALOG.md) | Catalogue complet — 296 skills avec déclencheurs et livrables |
| [🛠️ Creating Skills](./docs/CREATING_SKILLS.md) | Guide + template pour créer son propre skill |
| [🧭 Design Principles](./docs/DESIGN_PRINCIPLES.md) | 8 principes de conception |
| [🤝 Contributing](./docs/CONTRIBUTING.md) | Comment contribuer |

---

## 🧭 Principes

- **Structurer, pas diagnostiquer** — organise l'information sans conclure
- **Toujours un livrable** — tableau, document, plan, checklist, code
- **Ton mesuré** — ni alarmiste ni minimisant
- **Sécurité intégrée** — escalade vers aide humaine si crise
- **Sans jugement** — bienveillant et respectueux
- **Autonomie** — l'utilisateur reste décideur
- **Code concret** — exemples fonctionnels, pas de théorie vague

---

## 🤝 Contribuer

Les contributions sont bienvenues ! Voir le [guide de contribution](./docs/CONTRIBUTING.md).

---

## 📄 Licence

MIT — Libre d'utilisation, modification et redistribution.

---

## ⚠️ Avertissements

- **Santé** : Ne remplace pas un avis médical.
- **Finance** : Ne constitue pas un conseil financier.
- **Juridique** : Ne constitue pas un conseil juridique.
- **Sécurité** : Les outils de pentest sont à utiliser dans un cadre légal et autorisé.
- **Urgence** : En cas de danger, contactez les urgences locales.

---

<p align="center">
  <strong>296 skills • 26 catégories • 100% open-source</strong><br>
  Fait avec 🤖💻🔒🧠🎨 par <a href="https://github.com/khalilbenaz">@khalilbenaz</a>
</p>
