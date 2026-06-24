# Database Context

## Setup
- PostgreSQL via TypeORM 1.x
- Data source config: `apps/api/src/database/data-source.ts`
- Migrations: `apps/api/src/database/migrations/`
- Value transformers: `apps/api/src/database/transformers/` (e.g., DecimalTransformer for price fields)

## Migration Workflow
```bash
# Generate a new migration after changing entities
cd apps/api && npx typeorm migration:generate src/database/migrations/<Name> -d src/database/data-source.ts

# Run pending migrations
npx typeorm migration:run -d src/database/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/database/data-source.ts
```
Never use `synchronize: true` in production. Always generate and review migrations.

## Migration Naming Convention
Timestamp prefix + descriptive name:
`1781850000000-AddStatusLockedToProducts.ts`

## Known Schema (from migrations history)
Key tables and their evolution:
- `products` — core table; fields added over time: `exactId` (nullable), `category`, `stock`, notification timestamps, `pimTemplate`, `statusLocked`
- `categories` — hierarchical (likely adjacency list or closure table)
- `users` — role field (`buyer` | `admin`), OAuth fields
- Exact Online tokens stored separately (exact auth)

## Entity Locations
- `apps/api/src/products/entities/`
- `apps/api/src/categories/entities/`
- `apps/api/src/users/entities/`
- `apps/api/src/exact/entities/`

## Testing with Real DB
Tests use Testcontainers (`@testcontainers/postgresql`) to spin up a real PostgreSQL instance. Do NOT mock the database in tests.
