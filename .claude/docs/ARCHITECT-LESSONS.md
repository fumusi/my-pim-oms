# Architect Lessons

Decisions, patterns, and anti-patterns learned while working on this codebase.
Updated by the architect agent after each planning session.

## Decisions & Rationale

### AuditLog Module (2026-06-30)
- Chose `@Global()` module registration for `AuditLogModule` to avoid requiring every consumer module (`ProductsModule`, `OrdersModule`, etc.) to list it in their `imports` array. Since `AuditLogModule` imports no feature module, circular dependency risk is zero.
- `performedBy` is always a `string` (user email or `'system'`). It is extracted from `req.user.email` in the controller and passed down to the service — consistent with the existing `updatedBy` pattern already present in `ProductsService.create()` and `ProductsService.update()`.
- `changedFields` uses `{ field: { old, new } }` format only for `update` actions. For `create`, `delete`, `archive`, and `status_change`, the entity snapshot or transition detail goes in `metadata` instead. This keeps `changedFields` semantically unambiguous.
- `AuditLogService.log()` swallows save errors (try/catch + Logger.error) so audit failures never surface to the API caller.
- Bulk operations (`bulkArchive`, `bulkRemove`, `bulkUpdateStatus`) log one audit entry per successfully processed item, not one entry for the batch.

## Proven Patterns

- DTOs use `createZodDto` from `nestjs-zod` (not `class-validator` decorators). All query/body DTOs follow this pattern.
- Validation pipe is `ZodValidationPipe` (global, set in `main.ts`).
- `performedBy` / `updatedBy` flows: controller extracts `req.user.email` → passes as string arg to service method. Services never access `Request` directly.
- Migration class names include timestamp suffix: `CreateAuditLogs1782750000000`. The `name` property matches.
- Migration timestamps for manually authored files: increment by 9000000 from the last existing timestamp to avoid collisions.
- Entity column names use snake_case via `name:` option in `@Column()` decorator; TypeScript property names are camelCase.
- Unit tests (service layer) use `jest.fn()` mocks — Testcontainers is reserved for integration tests only.

## Anti-Patterns

- Do not use `synchronize: true` — migrations only.
- Do not inject `Request` into services — keep services framework-agnostic.
- Do not let audit failures throw to callers — logging is a side-effect and must never break the primary operation.
- Do not add `AuditLogModule` to the `imports` array of individual feature modules when it is already `@Global()` — only `AppModule` needs to import it.
