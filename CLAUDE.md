# ABMS — repo conventions

Full spec lives in `docs/build-prompt.md` (and the original conversation) —
treat it as the source of truth for scope. This file is the "how the code is
organized" cheat sheet.

## Module-key mirroring

Every business module has one `id` (`crm`, `inventory`, `sales`, `purchase`,
`customers`, `suppliers`, `accounts`, `reports`, `settings`) defined once in
`packages/shared/src/navigation.ts` (`NAV_MODULES`). That id must match:

- `apps/api/src/modules/<id>/`
- `apps/web/src/pages/<id>/`
- the route path in `apps/web/src/App.tsx`

When adding a module, wire all three plus an entry in `ROLE_MODULE_ACCESS`
(`packages/shared/src/permissions.ts`) — that's the single RBAC matrix both
the API `RolesGuard` and the web `Sidebar`/`ModuleRoute` read from.

## Auth / RBAC / audit (apps/api)

- Session auth is custom, not passport: `SessionService` (`common/session`)
  creates a `Session` row + signed `abms_sid` cookie on login; `SessionAuthGuard`
  resolves the cookie back to a `User` and sets `req.user`.
- `@Roles(Role.X, ...)` + `RolesGuard` gate resolvers. Admin always passes.
  `@CurrentUser()` reads `req.user` in a resolver.
- Audit trail is explicit, not a generic interceptor: call
  `AuditService.logCreate/logUpdate/logDelete` from inside a mutation resolver
  so before/after payloads are meaningful per-entity.
- `packages/shared`'s `Role`/`AuditAction`/etc. enums are for the frontend and
  guard decorators; the Prisma-generated enums (`@abms/database`) are what
  actually get written to the DB. Keep both in sync by hand if you add values
  (see the comment at the top of `schema.prisma`).

## Design tokens

`packages/ui/src/styles/globals.css` defines the Charcoal & Amber palette as
HSL CSS variables (light + dark). `packages/config/tailwind-preset.js` maps
Tailwind color names (`primary`, `sidebar`, `success`, etc.) to those
variables — never hardcode hex colors in component code, use the Tailwind
classes. The sidebar surface is intentionally the same dark charcoal in both
light and dark mode (fixed brand element, not theme-dependent).

## Where things stand

Pass 1 (done): infra, session auth/RBAC/audit, `packages/ui` primitives, web
app shell with routing + RBAC-gated nav for all 8 modules (placeholder pages).
Modules get real CRUD + cross-module automation (stock deduction on sales
confirm, ledger auto-posting, etc.) in later passes — see the plan history
for the intended order (Inventory/Customers/Suppliers → Sales/Purchase →
Accounts → CRM/Reports/Settings).

## Local dev

`./scripts/fast-start.sh` — brings up Postgres + MinIO via
`docker-compose.dev.yml`, runs Prisma generate/migrate/seed, then `pnpm dev`.
Seeded users (see `packages/database/prisma/seed.ts`): one per role, password
`ChangeMe123!` except the admin (`SEED_ADMIN_PASSWORD` in `.env`).
