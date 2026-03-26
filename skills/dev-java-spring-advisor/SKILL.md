---
name: dev-java-spring-advisor
description: Développement Java avec Spring Boot, Spring Security et l'écosystème Spring. Se déclenche avec "Java", "Spring Boot", "Spring", "JPA", "Hibernate", "Maven", "Gradle", "Spring Security", "microservices Java".
---

# Java Spring Advisor

## Workflow

1. **Setup Spring Boot** : Générer le projet via Spring Initializr (start.spring.io) avec les bonnes dépendances, structurer les profils (`application.yml`, `application-dev.yml`, `application-prod.yml`), utiliser `@ConfigurationProperties` pour typer la configuration, comprendre l'auto-configuration (`@EnableAutoConfiguration`), configurer les beans conditionnels (`@ConditionalOnProperty`, `@ConditionalOnMissingBean`).

2. **Architecture** : Structurer en couches classiques (Controller → Service → Repository), appliquer l'architecture hexagonale (ports/adapters) pour les domaines complexes, organiser par feature plutôt que par couche dans les gros projets, structurer les projets multi-modules Maven/Gradle (api, domain, infrastructure), appliquer les principes DDD (Aggregate, Value Object, Domain Event) avec Spring.

3. **Data access** : Utiliser Spring Data JPA avec des repositories (`JpaRepository<T, ID>`), optimiser les requêtes N+1 avec `@EntityGraph` et fetch joins, écrire des queries complexes avec `@Query` JPQL ou QueryDSL, gérer les transactions avec `@Transactional` (propagation, isolation), migrer le schéma avec Flyway ou Liquibase (versioning des migrations en SQL).

4. **REST APIs** : Créer des endpoints avec `@RestController` et `@RequestMapping`, valider les inputs avec Bean Validation (`@Valid`, `@NotNull`, `@Size`), centraliser la gestion d'erreurs avec `@ControllerAdvice` et `@ExceptionHandler`, implémenter HATEOAS avec Spring HATEOAS, documenter avec SpringDoc OpenAPI (génération auto du swagger.json).

5. **Spring Security** : Configurer la `SecurityFilterChain` (remplace `WebSecurityConfigurerAdapter`), implémenter l'authentification JWT (filtre custom + `UserDetailsService`), configurer OAuth2 Resource Server (`@EnableResourceServer`, `JwtDecoder`), sécuriser les méthodes avec `@PreAuthorize("hasRole('ADMIN')")`  et `@Secured`, configurer CORS et CSRF correctement selon le contexte.

6. **Messaging** : Intégrer RabbitMQ avec Spring AMQP (`@RabbitListener`, `RabbitTemplate`), produire/consommer Kafka avec Spring Kafka (`@KafkaListener`, `KafkaTemplate`), utiliser Spring Cloud Stream pour l'abstraction du broker (changeable sans modifier le code métier), gérer les dead-letter queues et retry policies, implémenter les Saga patterns pour la consistance distribuée.

7. **Testing** : Tester les unités avec JUnit 5 (`@Test`, `@BeforeEach`) et Mockito (`@Mock`, `@InjectMocks`), tester les endpoints avec MockMvc (`@WebMvcTest`, `perform().andExpect()`), faire des tests d'intégration avec `@SpringBootTest` + TestRestTemplate, utiliser Testcontainers pour les dépendances réelles (PostgreSQL, Redis, Kafka) en tests, simuler les APIs externes avec WireMock.

8. **Observabilité** : Exposer les métriques et health checks via Spring Boot Actuator (`/actuator/health`, `/actuator/metrics`), instrumenter avec Micrometer (compteurs, timers, gauges → Prometheus), implémenter le distributed tracing avec Micrometer Tracing + Zipkin/Jaeger (trace/span IDs), corréler les logs avec MDC (`MDC.put("traceId", ...)`) pour la recherche dans Kibana/Loki.

## Règles

- Écrire du Java moderne (Java 21+) : utiliser les records pour les DTOs et Value Objects, le pattern matching (`instanceof Pattern`), les sealed classes pour les hiérarchies fermées, et les virtual threads (Project Loom) pour la haute concurrence.
- Utiliser l'injection par constructeur (jamais `@Autowired` sur le champ) ; cela facilite les tests unitaires sans contexte Spring et rend les dépendances explicites.
- Ne jamais laisser des `@Transactional` sur des méthodes privées ou des appels depuis la même classe ; comprendre les proxies CGLIB et leurs limitations.
- Préférer les DTOs (Data Transfer Objects) aux entités JPA dans les couches Controller/Service ; ne jamais exposer les entités directement dans les réponses REST.
- Expliquer les décisions d'architecture : pourquoi cette couche, pourquoi cette relation entre entités, pourquoi ce niveau de transaction — le code Spring peut devenir une boîte noire sans documentation des intentions.
