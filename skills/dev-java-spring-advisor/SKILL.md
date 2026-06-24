---
name: dev-java-spring-advisor
description: Développement Java avec Spring Boot, Spring Security et l'écosystème Spring. Se déclenche avec "Java", "Spring Boot", "Spring", "JPA", "Hibernate", "Maven", "Gradle", "Spring Security", "microservices Java".
---

# Java Spring Advisor

## Workflow

### 1. Initialisation du projet

```bash
# Spring Initializr CLI (Spring Boot 3.x, Java 21)
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.3.0 \
  -d groupId=com.example \
  -d artifactId=myapp \
  -d javaVersion=21 \
  -d dependencies=web,data-jpa,security,actuator,validation,flyway \
  -o myapp.zip && unzip myapp.zip
```

Structure des profils :
```
src/main/resources/
  application.yml          # valeurs communes
  application-dev.yml      # dev local (H2, logs DEBUG)
  application-prod.yml     # prod (connexion pool, logs INFO)
```

Typer la configuration avec `@ConfigurationProperties` plutôt que `@Value` :
```java
@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(String apiUrl, Duration timeout, int maxRetries) {}
```

### 2. Architecture — Critères de choix

| Contexte | Approche recommandée |
|---|---|
| API CRUD simple | Couches Controller → Service → Repository |
| Domaine métier riche | Hexagonale (ports/adapters) + DDD |
| Gros projet (>5 équipes) | Multi-modules Maven par bounded context |
| Microservices | 1 module = 1 deployable, API contract-first OpenAPI |

Organisation par **feature** (pas par couche technique) dans les projets moyens/grands :
```
com.example.payment/
  PaymentController.java
  PaymentService.java
  PaymentRepository.java
  PaymentDto.java         # record Java 21
  Payment.java            # entité JPA
```

### 3. Data access — JPA & transactions

**Problème N+1** — détecter et corriger :
```java
// Mauvais : génère N+1 requêtes
List<Order> orders = orderRepo.findAll();
orders.forEach(o -> o.getItems().size()); // lazy load en boucle

// Correct : fetch join explicite
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.status = :status")
List<Order> findWithItems(@Param("status") OrderStatus status);

// Ou via @EntityGraph
@EntityGraph(attributePaths = {"items", "customer"})
List<Order> findByStatus(OrderStatus status);
```

Règles `@Transactional` :
- Toujours sur la méthode `public` du Service, jamais sur le Repository
- `@Transactional(readOnly = true)` sur les lectures → flush mode OFF + optimisations Hibernate
- Propagation `REQUIRES_NEW` uniquement si isolation réelle nécessaire (audit, log d'erreur)

Migration de schéma avec Flyway :
```
db/migration/
  V1__create_orders.sql
  V2__add_payment_status.sql
```

### 4. REST API

Handler d'erreur global :
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleNotFound(EntityNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        var pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setProperty("errors", ex.getBindingResult().getFieldErrors()
            .stream().map(e -> e.getField() + ": " + e.getDefaultMessage()).toList());
        return pd;
    }
}
```

DTO avec record Java 21 + validation :
```java
public record CreateOrderRequest(
    @NotBlank String customerId,
    @NotEmpty List<@Valid OrderItemRequest> items,
    @PositiveOrZero BigDecimal discount
) {}
```

Documentation OpenAPI (SpringDoc) :
```yaml
# application.yml
springdoc:
  api-docs.path: /api-docs
  swagger-ui.path: /swagger-ui.html
  show-actuator: false
```

### 5. Spring Security (Spring Boot 3.x)

Configuration minimale JWT Resource Server :
```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

Sécurisation par méthode :
```java
@PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
public UserDto getUser(String userId) { ... }
```

**CORS** : configurer via `CorsConfigurationSource` bean, pas via `@CrossOrigin` sur chaque contrôleur.

### 6. Messaging

RabbitMQ — pattern listener avec retry :
```java
@RabbitListener(queues = "payment.queue",
    containerFactory = "retryContainerFactory")
public void handlePayment(PaymentEvent event) {
    paymentService.process(event);
}
```

Kafka — configuration producer idempotent :
```yaml
spring.kafka.producer:
  enable-idempotence: true
  acks: all
  retries: 3
```

Dead-letter queue : configurer `x-dead-letter-exchange` sur la queue principale + consumer séparé sur la DLQ pour replay manuel.

### 7. Testing — Pyramide

```
E2E (WireMock + Testcontainers)  ← peu nombreux, lents
Integration (@SpringBootTest)     ← couverture des flux critiques
Slice (@WebMvcTest, @DataJpaTest) ← rapides, ciblés
Unit (JUnit 5 + Mockito)          ← majoritaires
```

Test slice REST :
```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mvc;
    @MockBean OrderService orderService;

    @Test
    void createOrder_returns201() throws Exception {
        given(orderService.create(any())).willReturn(new OrderDto("123"));
        mvc.perform(post("/orders")
                .contentType(APPLICATION_JSON)
                .content("""{"customerId":"C1","items":[]}"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("123"));
    }
}
```

Testcontainers (PostgreSQL) :
```java
@Testcontainers
@SpringBootTest
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }
}
```

### 8. Observabilité

```yaml
management:
  endpoints.web.exposure.include: health,info,prometheus,metrics
  endpoint.health.show-details: when-authorized
  metrics.export.prometheus.enabled: true
```

Corréler logs + traces :
```java
// Micrometer Tracing auto-injecte traceId/spanId dans MDC si Zipkin/OTLP est configuré
// Ajouter dans logback-spring.xml :
// %X{traceId} %X{spanId}
```

Virtual threads (Java 21 + Spring Boot 3.2+) pour améliorer le throughput I/O-bound :
```yaml
spring.threads.virtual.enabled: true
```

---

## Anti-patterns & pièges

| Piège | Conséquence | Correction |
|---|---|---|
| `@Autowired` sur champ | Tests unitaires impossibles sans contexte Spring | Injection par constructeur (`final` + `@RequiredArgsConstructor`) |
| `@Transactional` sur méthode `private` | Transaction silencieusement ignorée (proxy CGLIB) | Déplacer sur méthode `public` ou extraire dans un autre bean |
| Appel interne `this.method()` transactionnel | Bypass du proxy → pas de transaction | Injecter le bean lui-même ou restructurer |
| Entité JPA exposée dans le Controller | Couplage fort, risque de lazy init exception | Toujours mapper vers DTO avant de sérialiser |
| `FetchType.EAGER` par défaut sur `@OneToMany` | Full table join à chaque chargement | Garder `LAZY` + fetch join explicite quand nécessaire |
| `@SpringBootTest` pour tout | Suite de tests lente (contexte complet) | Préférer `@WebMvcTest` / `@DataJpaTest` slices |
| Secrets dans `application.yml` commités | Fuite de credentials | Variables d'environnement ou Spring Cloud Config / Vault |
| Ignorer `readOnly = true` | Flush inutile + dirty checking sur toutes les entités | `@Transactional(readOnly = true)` sur toutes les méthodes de lecture |

## Bonnes pratiques 2026

- **Java 21 LTS** : records pour DTOs/Value Objects, sealed classes pour hiérarchies fermées, pattern matching dans les `switch`, virtual threads activés par défaut en Spring Boot 3.2+.
- **Spring Boot 3.3.x** : `ProblemDetail` (RFC 7807) pour les erreurs REST, `@HttpExchange` pour les clients HTTP déclaratifs (remplace Feign dans les nouveaux projets).
- **GraalVM Native Image** : vérifier la compatibilité des librairies avec `spring-aot-maven-plugin`; tester en CI avec `./mvnw -Pnative test`.
- **Observabilité** : préférer OpenTelemetry (OTLP) à Zipkin pour ne pas se lier à un backend; Micrometer 1.12+ supporte OTLP nativement.
- **Sécurité** : scanner régulièrement les dépendances avec `./mvnw dependency-check:check` (OWASP) ou Dependabot; ne jamais logger les JWT ni les payloads contenant des PII.


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
