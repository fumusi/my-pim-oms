# Exact Online Integration Context

## What It Does
Syncs product/item data between Exact Online ERP and the local PIM database. Exact Online is the source of truth for item master data; the PIM enriches it with additional fields.

## Module Location
`apps/api/src/exact/`

## Files
```
exact/
  exact-online-auth.service.ts   — OAuth2 token management (MSAL + Exact OAuth)
  exact-online-client.service.ts — Authenticated HTTP client wrapper for Exact REST API
  exact-sync.service.ts          — Main sync orchestration logic
  exact-sync.service.spec.ts     — Integration tests
  exact.controller.ts            — Endpoints to trigger sync manually
  exact.module.ts                — Module definition
  items.controller.ts            — Item-specific endpoints
  items.service.ts               — Item CRUD via Exact API
  items.service.spec.ts
  mappers/                       — Exact API response → local entity transforms
  types.ts                       — TypeScript types for Exact API responses
  utils/                         — Helper utilities
```

## Auth Flow
Exact Online uses OAuth2. The integration handles:
1. Initial authorization via redirect (admin triggers in UI)
2. Token storage (in DB or Redis)
3. Auto-refresh of access tokens before expiry
4. MSAL (`@azure/msal-node`) handles the Microsoft identity layer if applicable

## Sync Process
- `exact-sync.service.ts` fetches items from Exact Online REST API
- Mapper transforms Exact item format → Product entity
- Upsert logic: new items created, existing updated by `exactId`
- Product `exactId` field links local product to Exact item
- `status_locked` flag prevents local changes from being overwritten by sync

## Scheduled Sync
`products-schedule.service.ts` in the products module runs cron jobs that call the Exact sync service on a schedule. Config via env vars.

## Manual Sync
Admin can trigger sync via `POST /exact/sync` endpoint (requires admin role).

## Key Fields
- `product.exactId` — Exact Online item code, nullable (products can exist without Exact link)
- `product.statusLocked` — when true, sync won't overwrite status field

## Exact API Base URL
`https://start.exactonline.nl/api/v1/{division}/` — division number stored in env/config.

## Environment Variables
`EXACT_CLIENT_ID`, `EXACT_CLIENT_SECRET`, `EXACT_REDIRECT_URI`, `EXACT_DIVISION`
