---
name: dev-oauth2-oidc-advisor
description: Implémentation d'OAuth2, OpenID Connect, JWT et gestion des tokens pour sécuriser des APIs et applications web. À utiliser quand l'utilisateur configure de l'authentification, des tokens JWT, ou intègre un identity provider. Se déclenche aussi avec "OAuth2", "OIDC", "OpenID Connect", "JWT", "token", "refresh token", "identity provider", "Keycloak", "Azure AD", "Auth0".
---

# Conseiller OAuth2 / OIDC

## Workflow en 5 étapes

1. **Qualifier le contexte** : type de client (SPA, mobile, service, CLI), confidentialité du secret, présence d'un utilisateur humain ou non.
2. **Choisir le flow** : voir tableau ci-dessous — la mauvaise sélection est la source d'erreur #1.
3. **Configurer l'IdP** : clients, redirect URIs, scopes, claims mapping.
4. **Implémenter côté serveur** : middleware de validation JWT, politiques d'autorisation.
5. **Durcir** : rotation des secrets, expiration courte, révocation, PKCE obligatoire.

---

## Choisir le bon flow

| Flow | Quand l'utiliser | Type client |
|------|-----------------|-------------|
| **Authorization Code + PKCE** | App web, SPA, mobile — utilisateur présent | Public ou confidentiel |
| **Client Credentials** | Service-to-service, daemon, batch | Confidentiel uniquement |
| **Device Code** | IoT, CLI, smart TV — pas de navigateur | Public |
| **Refresh Token** | Renouvellement silencieux de l'access token | Tous |

**Règle décisive** : y a-t-il un utilisateur humain qui s'authentifie ?
- Oui → Authorization Code + PKCE (toujours)
- Non → Client Credentials

**Flows à bannir définitivement**
- ~~Implicit Flow~~ → remplacé par Authorization Code + PKCE
- ~~Resource Owner Password Credentials~~ → expose le mot de passe au client, impossible à MFA

---

## Implémentation ASP.NET Core

### API protégée par JWT Bearer

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://auth.company.com";      // Auto-découverte OIDC
        options.Audience  = "payment-api";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer    = true,
            ValidateAudience  = true,
            ValidateLifetime  = true,
            ClockSkew         = TimeSpan.FromSeconds(30),    // Tolérance horaire minimale
            ValidIssuers      = ["https://auth.company.com"] // Whitelist explicite
        };
        // Événement de débogage pratique
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                ctx.Response.Headers.Append("WWW-Authenticate-Detail", ctx.Exception.Message);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("PaymentAdmin", p => p.RequireClaim("role", "payment-admin"));
    options.AddPolicy("ReadPayments",  p => p.RequireClaim("scope", "payments:read"));
});
```

### Client Credentials — appel service-to-service

```csharp
// Avec Duende.AccessTokenManagement ou Microsoft.Extensions.Http.OAuth2
builder.Services.AddClientCredentialsTokenManagement()
    .AddClient("payment-api", client =>
    {
        client.TokenEndpoint = "https://auth.company.com/connect/token";
        client.ClientId      = "order-service";
        client.ClientSecret  = config["Auth:ClientSecret"]; // Depuis Key Vault, pas appsettings
        client.Scope         = "payments:write";
    });

builder.Services.AddHttpClient<IPaymentClient, PaymentClient>()
    .AddClientCredentialsTokenHandler("payment-api");
```

### Extraction de claims dans un controller

```csharp
[Authorize(Policy = "PaymentAdmin")]
[HttpPost("payments")]
public IActionResult CreatePayment(CreatePaymentRequest request)
{
    var sub      = User.FindFirstValue(ClaimTypes.NameIdentifier); // "sub"
    var roles    = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
    var tenantId = User.FindFirstValue("tenant_id");               // Claim custom
    var scopes   = User.FindFirstValue("scope")?.Split(' ') ?? [];
    // ...
}
```

---

## Structure d'un JWT — anatomie rapide

```
eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xMjMifQ   ← Header (Base64url)
.eyJpc3MiOiJodHRwczovL2F1dGguY29tcGFueS5jb20iLCAic3ViIjoidXNlci0xMjMiLCAiYXVkIjoicGF5bWVudC1hcGkiLCAiZXhwIjoxNzAwMDAwMDAwLCAiaWF0IjoxNjk5OTk2NDAwLCAic2NvcGUiOiJwYXltZW50czpyZWFkIiwicm9sZSI6InBheW1lbnQtYWRtaW4iLCJ0ZW5hbnRfaWQiOiJ0ZW5hbnQtYWJjIn0=   ← Payload
.SIGNATURE   ← Signature RS256 (vérifiée avec la clé publique de l'IdP via JWKS)
```

Claims obligatoires à valider : `iss`, `aud`, `exp`, `iat`, `nbf` (si présent).
`kid` permet la rotation de clés sans downtime (JWKS endpoint).

---

## Gestion des tokens

| Token | Durée recommandée | Stockage côté client |
|-------|------------------|----------------------|
| **Access Token** | 5–15 min | Mémoire JS (SPA) ou cookie HttpOnly Secure SameSite=Strict |
| **Refresh Token** | 7–30 jours | Cookie HttpOnly Secure SameSite=Strict **uniquement** |
| **ID Token** | 5–15 min | Mémoire — jamais envoyé à une API tierce |

### Rotation des refresh tokens (Keycloak / Auth0 / Entra)

```
Flux : Client → POST /token (grant_type=refresh_token, token=RT1)
               ← { access_token, refresh_token: RT2, expires_in }

RT1 est immédiatement invalidé.
Si RT1 est réutilisé → détection de vol → révocation de toute la famille de tokens.
```

Activer dans Keycloak : *Realm Settings → Tokens → Revoke Refresh Token = ON*.

---

## Intégration Identity Providers

### Keycloak — déclarer un client confidentiel (CLI)

```bash
kcadm.sh create clients -r myrealm \
  -s clientId=order-service \
  -s 'protocol=openid-connect' \
  -s 'publicClient=false' \
  -s 'serviceAccountsEnabled=true' \
  -s 'standardFlowEnabled=false' \
  -s 'directAccessGrantsEnabled=false'
```

### Azure Entra ID — token via Client Credentials

```bash
curl -X POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token \
  -d "grant_type=client_credentials" \
  -d "client_id={clientId}" \
  -d "client_secret={secret}" \
  -d "scope=https://api.company.com/.default"
```

### Déboguer un JWT immédiatement

```bash
# Décoder sans vérifier la signature (debug uniquement)
echo "{JWT}" | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Vérifier la signature via JWKS
jwt decode --jwks https://auth.company.com/.well-known/jwks.json {JWT}
```

---

## Garde-fous / Anti-patterns / Pièges

### Pièges courants

| Piège | Symptôme | Correction |
|-------|----------|------------|
| `ClockSkew` trop large (> 5 min) | Tokens expirés acceptés | Garder ≤ 30 secondes |
| Audience non validée | N'importe quelle API accepte le token | `ValidateAudience = true` + `Audience` explicite |
| Secret partagé entre envs | Compromis prod via dev | Secrets distincts par environnement, rotation trimestrielle |
| Token dans localStorage | Exfiltrable via XSS | Cookie HttpOnly obligatoire |
| Données sensibles dans le payload | PII exposée (Base64 ≠ chiffrement) | Ne mettre que des identifiants opaques dans le JWT |
| RS256 → HS256 downgrade | Validation contournée si secret devinable | Forcer l'algorithme côté serveur, refuser `alg:none` |
| Access token de longue durée | Surface d'attaque élevée | Max 15 min, refresh token pour la durée de session |
| Pas de révocation | Token volé valide jusqu'à expiration | Implémenter token introspection ou liste de révocation |

### Checklist sécurité avant mise en production

- [ ] HTTPS strict sur toutes les redirect URIs
- [ ] PKCE activé pour tous les clients publics
- [ ] `state` et `nonce` validés (protection CSRF/replay)
- [ ] Rotation refresh tokens activée
- [ ] Scopes granulaires (principe du moindre privilège)
- [ ] RS256 ou ES256 — jamais HS256 pour APIs multi-services
- [ ] JWKS endpoint utilisé (rotation de clés sans redéploiement)
- [ ] Secrets stockés en Key Vault (pas en appsettings.json)
- [ ] Logging des événements d'authentification (échecs inclus)

---

## Bonnes pratiques 2026

- **DPoP (Demonstrating Proof of Possession)** : lier l'access token à une clé privée côté client — standard RFC 9449, supporté par Entra ID et Keycloak 24+. Protège contre le vol de token Bearer.
- **PAR (Pushed Authorization Requests)** : envoyer les paramètres d'autorisation via POST avant la redirection — protège contre la falsification d'URL (RFC 9126).
- **FAPI 2.0** : profil de sécurité renforcé pour open banking / fintech — impose PAR + DPoP + MTLS.
- **Token Exchange (RFC 8693)** : impersonation ou délégation entre services sans exposer le token original.
- Préférer **opaque tokens + introspection** si révocation immédiate requise ; préférer **JWT** si performance critique et révocation tolérée.


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
