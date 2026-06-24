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

## Agents Available
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
- Conventional commits format
- No comments unless the WHY is non-obvious

## Agent Rules
The main agent must never write or edit source files directly. All implementation goes through `@coder`, all planning through `@architect`. The main agent may read files, run bash commands, spawn agents, and answer questions.

## Pre-Implementation Checklist
Before spawning `@coder`, confirm:
- [ ] Is the spec complete enough to start without back-and-forth? If not, spawn `@architect` first.
- [ ] Does this touch a schema, API contract, or new package? `@architect` must approve first.
- [ ] Is `main` clean — no uncommitted changes that would conflict?
- [ ] Have you read the relevant module doc (see "How to Load Module Context")?
- [ ] Does this task touch shared conventions or styles? Check existing patterns first.

## Monorepo Commands
Run from repo root:
```
npm run dev          # start both api and web
npm run build        # build all apps
npm run lint         # lint all apps
npm run check-types  # tsc across all apps
npm run format       # prettier (ts, tsx, md)
```
