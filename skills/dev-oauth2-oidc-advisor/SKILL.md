---
name: dev-oauth2-oidc-advisor
description: Implémentation d'OAuth2, OpenID Connect, JWT et gestion des tokens pour sécuriser des APIs et applications web. À utiliser quand l'utilisateur configure de l'authentification, des tokens JWT, ou intègre un identity provider. Se déclenche aussi avec "OAuth2", "OIDC", "OpenID Connect", "JWT", "token", "refresh token", "identity provider", "Keycloak", "Azure AD", "Auth0".
---

# Conseiller OAuth2 / OIDC

## Workflow

1. **Identifier le flow** : Authorization Code, Client Credentials, Device Code, etc.
2. **Configurer l'IdP** : clients, scopes, claims.
3. **Implémenter** : middleware d'authentification, validation de tokens.
4. **Sécuriser** : rotation des secrets, expiration, révocation.

## Choisir le bon flow OAuth2

| Flow | Usage | Client |
|------|-------|--------|
| **Authorization Code + PKCE** | Apps web, SPA, mobile | Public |
| **Client Credentials** | Service-to-service, APIs | Confidentiel |
| **Device Code** | IoT, CLI, TV | Public |
| **Refresh Token** | Renouvellement silencieux | Tous |

### Ne plus utiliser
- ~~Implicit Flow~~ → remplacé par Authorization Code + PKCE
- ~~Resource Owner Password~~ → anti-pattern de sécurité

## Implémentation ASP.NET Core

### API protégée par JWT

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://auth.company.com";
        options.Audience = "payment-api";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidIssuers = new[] { "https://auth.company.com" }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("PaymentAdmin", policy =>
        policy.RequireClaim("role", "payment-admin"));

    options.AddPolicy("ReadPayments", policy =>
        policy.RequireClaim("scope", "payments:read"));
});
```

### Client Credentials (service-to-service)

```csharp
// Appel entre services avec token machine-to-machine
builder.Services.AddHttpClient("PaymentApi", client =>
{
    client.BaseAddress = new Uri("https://api.company.com");
})
.AddClientCredentialsTokenHandler(options =>
{
    options.Authority = "https://auth.company.com";
    options.ClientId = "order-service";
    options.ClientSecret = configuration["Auth:ClientSecret"];
    options.Scope = "payments:write";
});
```

### Extraction de claims

```csharp
[Authorize]
[ApiController]
public class PaymentController : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "PaymentAdmin")]
    public async Task<IActionResult> CreatePayment(CreatePaymentRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
        var tenantId = User.FindFirst("tenant_id")?.Value;

        // ...
    }
}
```

## Structure d'un JWT

```
Header.Payload.Signature

{
  "alg": "RS256",         // Algorithme de signature
  "typ": "JWT",
  "kid": "key-id-123"     // Key ID pour la rotation
}
.
{
  "iss": "https://auth.company.com",   // Issuer
  "sub": "user-123",                    // Subject (user ID)
  "aud": "payment-api",                 // Audience
  "exp": 1700000000,                    // Expiration
  "iat": 1699996400,                    // Issued at
  "scope": "payments:read payments:write",
  "role": "payment-admin",
  "tenant_id": "tenant-abc"
}
```

## Gestion des tokens

| Token | Durée de vie | Stockage |
|-------|-------------|----------|
| **Access Token** | 5-15 minutes | Mémoire (SPA), cookie HttpOnly (web) |
| **Refresh Token** | 7-30 jours | Cookie HttpOnly secure, rotation obligatoire |
| **ID Token** | 5-15 minutes | Mémoire, jamais envoyé à une API |

### Rotation des refresh tokens

```csharp
// Chaque utilisation d'un refresh token en génère un nouveau
// L'ancien est invalidé → détection de vol si réutilisé
```

## Bonnes pratiques

### À faire
- Toujours utiliser **HTTPS** pour les échanges de tokens
- Valider **tous** les champs du JWT (issuer, audience, expiration)
- Utiliser des **scopes granulaires** (`payments:read`, `payments:write`)
- Implémenter la **rotation des refresh tokens**
- Stocker les tokens côté client dans des **cookies HttpOnly Secure SameSite**
- Utiliser **RS256** (asymétrique) plutôt que HS256 pour les APIs publiques

### À éviter
- Stocker des tokens dans le localStorage (vulnérable au XSS)
- Des access tokens de longue durée (> 15 min)
- Mettre des données sensibles dans le payload JWT (pas chiffré)
- Faire confiance au token sans vérifier la signature
- Utiliser le même secret pour tous les environnements

## Règles
- Le flow Implicit est obsolète — toujours utiliser Authorization Code + PKCE.
- Les access tokens doivent expirer en moins de 15 minutes.
- Les refresh tokens doivent avoir une rotation activée.
- Valider issuer, audience et signature sur chaque requête.
