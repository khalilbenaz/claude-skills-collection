---
name: websocket-designer
description: Conception de systèmes temps réel avec WebSocket — SignalR, Socket.io, scaling horizontal et stratégies de reconnexion. Se déclenche avec "WebSocket", "temps réel", "SignalR", "Socket.io", "real-time", "push notifications". Also triggers on "WebSocket design", "real-time updates", "SignalR or Socket.io scaling".
---

# WebSocket Designer

## 1. Choisir le bon protocole temps réel

| Besoin | Solution recommandée | Raison |
|---|---|---|
| Bidirectionnel, faible latence | WebSocket natif / SignalR / Socket.io | Full-duplex sur une seule connexion TCP |
| Serveur → client uniquement | SSE (Server-Sent Events) | Plus simple, traversée proxy meilleure |
| Polling toléré, contraintes infra | Long polling | Fonctionne partout sans port spécial |
| < 1 000 connexions simultanées | WebSocket natif | Pas besoin de lib externe |
| Stack .NET | SignalR | Négociation automatique + fallback intégré |
| Stack Node.js | Socket.io | Rooms, namespaces, reconnexion built-in |

**Règle décisive** : si un proxy ou load balancer ne supporte pas l'upgrade HTTP→WS, préfère SSE ou assure-toi que le backplane est configuré avant de commencer.

---

## 2. Concevoir le protocole de messages

Définis un contrat JSON structuré avant d'écrire une ligne de code.

```jsonc
// Enveloppe standard
{
  "type": "CHAT_MESSAGE",       // action discriminante
  "channel": "room:42",         // scope / destinataire
  "payload": { "text": "..." }, // données métier
  "correlationId": "uuid-v4",   // pour ack / replay
  "ts": 1719230400000           // timestamp epoch ms
}
```

Types d'événements minimum à définir :
- `SUBSCRIBE` / `UNSUBSCRIBE` — gestion des canaux
- `ACK` — acquittement d'un message critique
- `ERROR` — retour d'erreur structuré `{ code, message }`
- `PING` / `PONG` — heartbeat applicatif

---

## 3. Implémenter le serveur

### SignalR (.NET 8)

```csharp
// Program.cs
builder.Services.AddSignalR(o => {
    o.MaximumReceiveMessageSize = 32 * 1024; // 32 KB max
    o.EnableDetailedErrors = app.Environment.IsDevelopment();
});
app.MapHub<ChatHub>("/hubs/chat");

// ChatHub.cs
[Authorize]
public class ChatHub : Hub
{
    public async Task SendMessage(string channel, string text)
    {
        // Vérifier l'autorisation sur le canal
        if (!await _authService.CanWriteAsync(Context.UserIdentifier, channel))
            throw new HubException("Forbidden");

        await Clients.Group(channel).SendAsync("ReceiveMessage", new {
            From = Context.UserIdentifier,
            Text = text,
            Ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }

    public override async Task OnConnectedAsync()
    {
        // Rejoindre les canaux de l'utilisateur dès la connexion
        var channels = await _channelService.GetUserChannelsAsync(Context.UserIdentifier);
        foreach (var ch in channels)
            await Groups.AddToGroupAsync(Context.ConnectionId, ch);

        await base.OnConnectedAsync();
    }
}
```

### Socket.io (Node.js / TypeScript)

```typescript
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

const io = new Server(httpServer, {
  cors: { origin: process.env.ALLOWED_ORIGIN },
  maxHttpBufferSize: 32 * 1024, // 32 KB
  pingTimeout: 20_000,
  pingInterval: 10_000,
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const user = await verifyJwt(token); // lance une erreur si invalide
  socket.data.user = user;
  next();
});

io.on("connection", async (socket) => {
  const { userId } = socket.data.user;
  const channels = await getChannels(userId);
  socket.join(channels);

  socket.on("CHAT_MESSAGE", async ({ channel, text }) => {
    if (!channels.includes(channel)) return socket.emit("ERROR", { code: 403 });
    io.to(channel).emit("CHAT_MESSAGE", { from: userId, text, ts: Date.now() });
  });
});
```

---

## 4. Implémenter le client avec reconnexion robuste

```typescript
// Reconnexion avec exponential backoff + jitter (vanilla WS)
function createWebSocketClient(url: string) {
  let ws: WebSocket;
  let attempt = 0;
  const MAX_DELAY = 30_000;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      attempt = 0;
      // Rejouer les messages en attente
      drainQueue();
    };

    ws.onmessage = (e) => handleMessage(JSON.parse(e.data));

    ws.onclose = (e) => {
      if (e.code === 1000) return; // fermeture propre
      const delay = Math.min(1_000 * 2 ** attempt + Math.random() * 500, MAX_DELAY);
      attempt++;
      setTimeout(connect, delay);
    };
  }

  connect();
  return { send: (msg: object) => ws.send(JSON.stringify(msg)) };
}
```

**SignalR client** : utilise `withAutomaticReconnect([0, 2000, 5000, 10000, 30000])` — les intervalles sont en ms.

---

## 5. Scaler horizontalement

### Redis backplane SignalR

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis("redis:6379,abortConnect=false", o => {
        o.Configuration.ChannelPrefix = RedisChannel.Literal("myapp");
    });
```

### Redis adapter Socket.io

```typescript
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

const pub = createClient({ url: "redis://redis:6379" });
const sub = pub.duplicate();
await Promise.all([pub.connect(), sub.connect()]);
io.adapter(createAdapter(pub, sub));
```

**Points clés** :
- Active les **sticky sessions** sur le load balancer pendant la phase de handshake HTTP (upgrade WS). Après l'upgrade, la connexion TCP est persistante — les sticky sessions ne sont plus nécessaires si le backplane est en place.
- Si tu utilises Nginx : `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`

---

## 6. Sécurité

- **Authentification** : JWT via `Authorization: Bearer` header lors du handshake (query string acceptable mais éviter en prod — visible dans les logs).
- **Autorisation** : vérifier les droits à chaque message, pas seulement à la connexion.
- **Rate limiting** : limiter le nombre de messages par connexion/seconde côté serveur.
- **Taille des messages** : impose un maximum (32 KB recommandé) pour éviter les attaques par saturation mémoire.
- **Validation** : parse et valide le payload à chaque réception (zod, FluentValidation...).

---

## 7. Monitoring

Métriques essentielles à exposer (Prometheus / OpenTelemetry) :

| Métrique | Seuil d'alerte typique |
|---|---|
| `ws_connections_active` | > 80 % de la capacité max |
| `ws_messages_per_second` | pic anormal × 3 |
| `ws_reconnect_rate` | > 5 % des clients/min |
| `ws_message_latency_p99` | > 500 ms |
| `ws_errors_total` | toute augmentation soudaine |

---

## Anti-patterns et pièges

- **Broadcast global sans filtrage** : envoyer un message à tous les clients connectés au lieu d'un groupe/canal = charge inutile et fuite de données.
- **Stocker l'état en mémoire du processus** : si plusieurs instances, les clients sur des pods différents ne voient pas le même état. Utilise Redis ou une base partagée.
- **Oublier le heartbeat** : les proxys et équilibreurs de charge coupent les connexions TCP inactives après 60-90 s par défaut. Implémente un ping/pong applicatif toutes les 30 s.
- **Authentification uniquement au handshake** : un token peut expirer en cours de session. Vérifie périodiquement ou à chaque action sensible.
- **Omettre le fallback** : certains réseaux d'entreprise bloquent les WebSockets. SignalR et Socket.io gèrent le fallback automatiquement — ne le désactive pas.
- **Ignorer la backpressure** : si le client est lent à consommer, le buffer serveur grossit. Limite la file et déconnecte les clients trop lents.
- **Protocole non documenté** : traite le contrat de messages comme une API — versionne-le, documente chaque type d'événement.
