---
name: log-analyzer
description: Analyse de logs pour diagnostiquer problèmes et patterns. Se déclenche avec "logs", "analyser les logs", "erreur dans les logs", "log parsing", "structured logging", "Serilog", "ELK", "debug production". Also triggers on "analyze these logs", "find errors in logs", "log patterns".
---

# Log Analyzer

## Workflow

### 1. Identifier le format et la source

Avant tout filtrage, qualifier le format :

| Format | Outil natif | Champ clé à valider |
|---|---|---|
| JSON structuré | `jq`, Kibana, Loki | `timestamp`, `level`, `traceId` |
| Plain text (Apache/Nginx/IIS) | `grep`, `awk`, `goaccess` | pattern de date, status code |
| Syslog RFC 5424 | `journalctl`, ELK Filebeat | `PRI`, `HOSTNAME`, `MSGID` |
| Windows Event Log | `Get-WinEvent`, Winlogbeat | `EventID`, `Provider` |
| Application Insights / Datadog | KQL, SDK query | `operation_Id`, `customDimensions` |

```bash
# Détecter rapidement le format
head -5 app.log | python3 -m json.tool 2>/dev/null || echo "plain text"
```

### 2. Filtrer par fenêtre temporelle et correlation ID

**Règle d'or : isoler avant d'analyser.**

```bash
# Plage horaire + niveau ERROR dans un fichier plain text
awk '/2026-06-24T10:[23][0-9]/ && /ERROR/' app.log

# JSON structuré avec jq
jq 'select(.level=="Error" and .timestamp >= "2026-06-24T10:20:00Z")' app.log

# journalctl (systemd)
journalctl -u myservice --since "2026-06-24 10:00" --until "2026-06-24 11:00" -p err

# grep avec correlation ID (format UUID)
grep "traceId=3fa85f64" app.log | sort -t' ' -k1
```

```kql
// Application Insights — top 10 exceptions sur 1h
exceptions
| where timestamp > ago(1h)
| summarize count() by type, outerMessage
| order by count_ desc
| take 10
```

```logql
# Grafana Loki — error rate par service
sum(rate({app="api"} |= "ERROR" [5m])) by (service)
```

### 3. Identifier les patterns d'erreurs

Objectifs : top exceptions, spikes, cascading failures.

```bash
# Top 10 messages d'erreur (plain text)
grep "ERROR" app.log | sed 's/.*ERROR //' | sort | uniq -c | sort -rn | head 10

# Fréquence d'erreurs par minute (détecter les spikes)
grep "ERROR" app.log | awk '{print $1}' | cut -c1-16 | uniq -c

# Détecter une exception Java/C# récurrente
grep -A 5 "Unhandled exception" app.log | grep "at " | sort | uniq -c | sort -rn
```

**Critères de sévérité :**
- Spike soudain (×5 erreurs en 2 min) → incident actif, vérifier les dépendances.
- Erreur unique répétée > 100×/min → bug code ou config, pas infra.
- Erreurs croissantes en escalier → memory leak ou pool exhaustion.
- Erreurs aléatoires faible fréquence → instabilité réseau ou 3rd party.

### 4. Corréler entre services (distributed tracing)

```bash
# Suivre un traceId à travers plusieurs fichiers de services
grep "traceId=abc123" service-a.log service-b.log service-c.log | sort -k1

# Reconstituer la timeline d'une transaction
grep "abc123" *.log | awk '{print $1, $2, $NF}' | sort
```

```kql
// Application Insights — trace complète d'une opération
union requests, dependencies, exceptions, traces
| where operation_Id == "abc123def456"
| order by timestamp asc
| project timestamp, itemType, name, duration, success, message
```

**Si pas de traceId :** corréler par userId + fenêtre de ±500 ms, ou par sessionId.

### 5. Analyser les performances

```bash
# Extraire les durées (format "duration=NNNms") et calculer P95
grep "duration=" app.log | grep -oP 'duration=\K[0-9]+' | sort -n | \
  awk 'BEGIN{c=0} {a[c++]=$1} END{print "P50=" a[int(c*0.5)] " P95=" a[int(c*0.95)] " P99=" a[int(c*0.99)]}'

# Identifier les slow SQL queries (EF Core / SqlClient)
grep "Executed DbCommand" app.log | grep -oP '\(\K[0-9]+(?=ms\))' | awk '$1>1000' | wc -l
```

```kql
// Application Insights — P95 latence par endpoint
requests
| where timestamp > ago(1h)
| summarize percentile(duration, 95) by name
| order by percentile_duration_95 desc
```

### 6. Structured logging — configuration minimale

**Serilog (.NET) :**
```csharp
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Service", "MyApi")
    .Enrich.WithProperty("Version", "1.4.2")
    .WriteTo.Console(new JsonFormatter())
    .WriteTo.Seq("http://seq:5341")
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .CreateLogger();

// Usage — toujours des propriétés structurées, jamais de string interpolation
Log.Warning("Paiement échoué {TransactionId} pour {UserId}", txId, userId);
```

**Winston (Node.js) :**
```js
const logger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'payment-api', version: '2.1.0' },
  transports: [new winston.transports.Console()]
});
logger.error('Payment failed', { transactionId: txId, userId, amount });
```

### 7. Centralisation — choix d'infrastructure

| Stack | Quand choisir | Complexité |
|---|---|---|
| **ELK** (Elasticsearch + Filebeat + Kibana) | Volume > 10 GB/jour, full-text search | Haute |
| **Grafana Loki + Promtail** | Déjà sur Grafana/Prometheus, volume modéré | Moyenne |
| **Application Insights** (Azure) | App Azure, SDK .NET/Node/Python | Faible |
| **CloudWatch Logs Insights** | Infra AWS Lambda/ECS/EC2 | Faible |
| **Seq** | Dev/staging .NET, budget limité | Très faible |

### 8. Alertes sur les logs

```kql
// Application Insights — alerter si error rate > 1% sur 5 min
requests
| where timestamp > ago(5m)
| summarize failed=countif(success==false), total=count()
| where (failed * 100 / total) > 1
```

```yaml
# Grafana Loki alert rule
- alert: HighErrorRate
  expr: sum(rate({app="api"} |= "ERROR" [5m])) > 10
  for: 2m
  annotations:
    summary: "Plus de 10 erreurs/s depuis 2 min"
```

---

## Garde-fous et anti-patterns

**Ne jamais faire :**
- Logger des mots de passe, tokens, numéros de carte, PII — même en debug.
- Utiliser `string.Format` ou interpolation dans les messages Serilog (perd la structure).
- Logger chaque itération d'une boucle sans rate limiting → log flooding → I/O saturation.
- Ignorer les `WARN` : ils signalent souvent les prémices d'une panne.
- Comparer des logs sur des fuseaux horaires différents sans normaliser en UTC.

**Pièges courants :**
- **Log rotation silencieuse** : le fichier actif est `/app.log`, mais l'erreur cherchée est dans `/app.log.1` de la veille.
- **Buffering async** : Serilog/NLog avec sink asynchrone peut perdre les derniers logs avant un crash — toujours configurer `flushToDiskInterval` ou `bufferedBatching: false` en prod critique.
- **Correlation ID absent** : sans traceId, la corrélation multi-service est impossible a posteriori. L'ajouter en middleware dès le début.
- **Timestamps locaux** : toujours écrire en UTC (`DateTimeOffset.UtcNow`), afficher en local uniquement dans l'UI.
- **Over-logging en INFO** : noie les vrais signaux ; réserver INFO aux events métier significatifs, pas aux HTTP 200 routiniers.

## Bonnes pratiques 2026

- **OpenTelemetry Logs** est désormais GA : privilégier `OTLP` comme protocole d'export pour unifier traces, métriques et logs dans un seul pipeline.
- **Log sampling** : en haute fréquence (> 10k req/s), logger 100% des ERROR/WARN, échantillonner les INFO à 10%.
- **Structured query first** : toujours préférer une requête KQL/LogQL/Lucene à un `grep` sur des fichiers bruts en production — plus rapide et moins risqué pour la charge I/O.
- **Retention tiered** : ERROR → 90 jours, INFO → 30 jours, DEBUG → 7 jours max. Réduire les coûts de stockage ELK/Loki de 60–70%.
- **Masking automatique** : intégrer un enrichisseur Serilog ou un Logstash filter qui masque les patterns PAN (cartes), IBAN, emails avant l'indexation.
