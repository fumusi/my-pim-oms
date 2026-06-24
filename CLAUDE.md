# my-pim-oms — Project Context

## What This Is
PIM (Product Information Management) + OMS (Order Management System) monorepo. Products are sourced from Exact Online ERP and managed/enriched locally. Users can browse and purchase products; admins manage the catalogue, Exact sync, and users.

## Monorepo Structure
```
apps/
  api/    — NestJS backend (port 3000)
  web/    — React frontend (port 5173 via Vite)
packages/ — shared types/config
```
Turborepo manages builds. Root `npm run dev` starts both.

## Tech Stack
| Layer | Tech |
|---|---|
| API | NestJS 11, TypeORM 1, PostgreSQL, Redis, class-validator, zod |
| Auth | JWT (httpOnly cookie) + Microsoft OAuth (MSAL) |
| Frontend | React 19, TanStack Router, TanStack Query, Redux Toolkit, Bootstrap 5, react-hook-form + zod |
| ERP sync | Exact Online REST API (OAuth2 via MSAL) |
| Mail | NestJS Mailer + nodemailer |
| Scheduling | @nestjs/schedule (cron jobs) |
| Testing | Jest + Testcontainers (real PostgreSQL) |
| Build | Turbo, Vite 8, TypeScript 5/6 |

## Roles & Permissions
- **buyer** — read-only access + "purchase later" list
- **admin** — full catalogue management, Exact sync control, user management

## API Modules
`auth` `users` `products` `categories` `exact` `mail` `redis` `health` `common`

Each module follows standard NestJS structure: `*.module.ts` `*.controller.ts` `*.service.ts` `dto/` `entities/`

## Frontend Structure
`pages/` `components/` `hooks/` `services/` `store/` `layouts/` `utils/`
Global state in Redux (`authSlice`, `langSlice`). Server state via TanStack Query.

## Agents Available
Use these agents via the Agent tool or by asking the orchestrator:
- `orchestrator` — task coordinator, entry point for complex work
- `architect` — proposes architecture options, waits for user approval before proceeding
- `coder` — implements approved specs
- `reviewer` — reviews code, reports findings without modifying

## How to Load Module Context
When working on a specific area, add to your prompt:
- API work → `@.claude/docs/api.md`
- Frontend work → `@.claude/docs/web.md`
- Exact Online sync → `@.claude/docs/exact.md`
- Database/migrations → `@.claude/docs/database.md`

## Key Conventions
- TypeORM migrations for all schema changes (never `synchronize: true` in prod)
- DTOs validated with class-validator + nestjs-zod at controller level
- No mock DB in tests — Testcontainers spins real PostgreSQL
- Commits follow conventional commits format
- No comments unless the WHY is non-obvious
