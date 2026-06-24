# API Context — apps/api

## Entry Points
- `src/main.ts` — bootstrap, global pipes, cookie-parser, helmet, CORS
- `src/app.module.ts` — root module, imports all feature modules

## Module Map
```
src/
  auth/         — JWT strategy, Microsoft OAuth (MSAL), login/register/refresh
  users/        — User entity, CRUD, role management
  products/     — Product entity, CRUD, import (xlsx), notifications, scheduled jobs
  categories/   — Category entity, hierarchical tree
  exact/        — Exact Online OAuth2 client, item sync, mapper, webhook/poll
  mail/         — Email templates, transactional mail via nodemailer
  redis/        — Redis client wrapper (ioredis), caching, session helpers
  health/       — Health check endpoint
  common/       — Shared decorators, guards, interceptors, pipes, utils
  database/     — TypeORM data-source, migrations, value transformers
```

## Auth Flow
1. Login with email+password → JWT pair (access + refresh) set as httpOnly cookies
2. Microsoft OAuth → MSAL redirect → `OAuthCallback` → same JWT pair
3. Guards: `JwtAuthGuard` (default), `RolesGuard` for role-based endpoints
4. Refresh: `POST /auth/refresh` reads refresh token cookie, issues new access token

## Database
- TypeORM `DataSource` configured in `src/database/data-source.ts`
- Migrations in `src/database/migrations/` — run via `typeorm migration:run`
- Value transformers in `src/database/transformers/` (e.g., decimal→number)
- Never use `synchronize: true` outside local dev

## Products Module Deep Dive
- `products.service.ts` — main CRUD + business logic
- `products.service.spec.ts` — integration tests with Testcontainers
- `import/` — xlsx import pipeline
- `notification/` — product status change notifications
- `products-schedule.service.ts` — cron jobs (e.g., auto-sync with Exact)
- `dto/` — CreateProductDto, UpdateProductDto, filter DTOs
- `entities/` — Product entity with relations to Category, User

## Exact Module
See `@.claude/docs/exact.md` for full Exact Online integration details.

## Validation Pattern
```typescript
// Controller level — always use DTOs with class-validator decorators
@Post()
async create(@Body() dto: CreateProductDto) { ... }

// DTOs use class-validator + nestjs-zod
@IsString() @IsNotEmpty() name: string;
```

## Testing Pattern
- Testcontainers: spins real PostgreSQL for integration tests
- No mocks for DB — real queries against real schema
- `products.service.spec.ts` is the reference implementation

## Environment Variables
Managed via `@nestjs/config`. Key vars: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `EXACT_CLIENT_ID`, `EXACT_CLIENT_SECRET`, `AZURE_CLIENT_ID` (MSAL)
