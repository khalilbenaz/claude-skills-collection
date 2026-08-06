---
name: nestjs-guide
description: Développement backend NestJS avec modules, controllers, providers, pipes, guards et interceptors. Se déclenche avec "NestJS", "Nest.js", "module NestJS", "controller NestJS", "decorator NestJS". Also triggers on "NestJS module", "Nest guards and interceptors", "dependency injection in Nest".
---

# Guide NestJS

## 1. Bootstrap du projet

```bash
npm i -g @nestjs/cli
nest new my-api --strict          # TypeScript strict activé d'emblée
cd my-api
nest g resource users             # CRUD complet : module + controller + service + dto + entity
```

Choix d'ORM :
| Cas | ORM recommandé |
|-----|----------------|
| Relations complexes, legacy DB | TypeORM |
| DX moderne, migrations auto | Prisma |
| Multi-DB, unit-of-work strict | MikroORM |

## 2. Structure modulaire

```
src/
  app.module.ts          ← racine
  core/                  ← CoreModule (logger, config, DB)
  shared/                ← SharedModule (guards, pipes, interceptors réutilisables)
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    dto/
      create-user.dto.ts
      update-user.dto.ts
    entities/
      user.entity.ts
```

Règle : un feature module déclare et exporte ce dont les autres ont besoin. Ne rien exporter par défaut.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],   // seulement si d'autres modules en ont besoin
})
export class UsersModule {}
```

## 3. Controllers et DTOs

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOneOrFail(id);
  }
}
```

DTO avec validation :
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

Active le pipe global dans `main.ts` :
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,          // strip propriétés non décorées
    forbidNonWhitelisted: true,
    transform: true,          // cast automatique (string → number, etc.)
  }),
);
```

## 4. Services et injection de dépendances

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async findOneOrFail(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
```

Custom provider (ex : client externe) :
```typescript
{
  provide: 'PAYMENT_CLIENT',
  useFactory: (cfg: ConfigService) =>
    new PaymentClient(cfg.get('PAYMENT_API_KEY')),
  inject: [ConfigService],
}
```

## 5. Guards et authentification JWT

```typescript
// auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return roles.some((r) => user.roles?.includes(r));
  }
}

// usage
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id', ParseUUIDPipe) id: string) { ... }
```

Config Passport JWT dans `JwtStrategy` :
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get('JWT_SECRET'),
    });
  }
  validate(payload: JwtPayload) { return payload; }
}
```

## 6. Interceptors et gestion des erreurs

Interceptor de logging/transform :
```typescript
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, { data: T; timestamp: string }>
{
  intercept(ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => ({ data, timestamp: new Date().toISOString() })),
    );
  }
}
```

Exception filter global :
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    ctx.getResponse().status(status).json({
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.message
        : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
```

Enregistrement dans `main.ts` :
```typescript
app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalInterceptors(new TransformInterceptor());
```

## 7. Configuration et variables d'environnement

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
  }),
}),
```

## 8. Tests

```typescript
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: createMock<Repository<User>>() },
      ],
    }).compile();
    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('throws NotFoundException when user not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOneOrFail('abc')).rejects.toThrow(NotFoundException);
  });
});
```

Test e2e :
```bash
npm run test:e2e   # utilise supertest + app.init()
```

## 9. Anti-patterns et pièges

| Anti-pattern | Problème | Correction |
|---|---|---|
| Logique métier dans le controller | Couplage HTTP/métier | Déplacer dans le service |
| `any` sur les corps de requête | Bypass de validation | DTO + `ValidationPipe` obligatoire |
| Module circulaire | Erreur runtime | `forwardRef(() => ModuleB)` ou refactorer |
| Pas de `whitelist: true` | Propriétés injectées silencieuses | Toujours activer |
| `new Service()` manuel | Échappe au DI, non testable | Injecter via constructeur |
| Secrets hardcodés | Fuite de sécurité | `ConfigService` + `.env` validé par Joi |
| N+1 queries | Perf dégradée | `relations` dans `findOne` ou QueryBuilder |
| Pas de graceful shutdown | Requêtes coupées | `app.enableShutdownHooks()` |

## 10. Bonnes pratiques 2026

- **Versioning API** : `app.enableVersioning({ type: VersioningType.URI })` + `@Version('2')` sur le controller.
- **Rate limiting** : `@nestjs/throttler` global + override par route avec `@Throttle()`.
- **Swagger automatique** : `@nestjs/swagger` + `PluginOptions` dans `nest-cli.json` pour inférer les types sans décorateurs redondants.
- **Health checks** : `@nestjs/terminus` — exposer `/health` avec checks DB, Redis, mémoire.
- **Logging structuré** : remplacer le logger par défaut par `pino` via `nestjs-pino` (JSON en prod, pretty en dev).
- **Sécurité** : `helmet()`, CORS strict, `express-rate-limit`, et jamais `app.enableCors()` sans `origin` explicite.
- **Docker** : image multi-stage, `node:20-alpine`, copier uniquement `dist/` + `node_modules` pruned.
