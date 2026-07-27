# ABMS — Build Prompt (Source of Truth)

This document is the single source of truth for ABMS scope, architecture, and design.
It is reproduced verbatim from the spec provided by the client/product owner.

> Keep this file in sync if scope changes — code structure should mirror it exactly
> (module folders in `apps/api/src/modules/<name>` and `apps/web/src/pages/<name>`
> match the module list in section 4).

## 1. Product Overview

ABMS unifies CRM, Inventory, Sales, Purchase, Customers, Suppliers, Accounts,
Reports & Analytics, and Settings into one connected system — replacing the
disconnected spreadsheets/SaaS-tool sprawl small and mid-sized businesses run on.

Core principle: a transaction in one module automatically updates the others
(a sale deducts stock and posts to the ledger; a low-stock trigger can generate
a purchase order).

Target deployment: self-hosted on the client's own server (VPS or on-premise),
fully owned by the client, no recurring license fee. The data model is
multi-tenant (every business-data table is scoped by `organizationId`), so a
single deployment can host more than one client organization if needed — see
section 7.

## 2. Tech Stack & Architecture

- Monorepo tooling: Turborepo
- Frontend: React + Vite (`apps/web`)
- Backend: NestJS + GraphQL API (`apps/api`)
- AI/ML service (future-ready, optional for v1): Python FastAPI (`apps/ai-service`)
- Database: PostgreSQL, accessed via Prisma (`packages/database`)
- Auth: session-based, with RBAC (roles: Admin, Sales, Warehouse, Accountant, Purchase)
  and multi-tenant org isolation — see section 7
- File storage: local disk or self-hosted MinIO (S3-compatible)
- Shared UI: shadcn/ui-based component library (`packages/ui`)
- Deployment: Docker Compose on client-owned VPS, Nginx + Let's Encrypt for SSL

## 3. Core Cross-Module Requirements

- Real-time-feeling updates (refetch/revalidate on data change)
- Global search across contacts, products, orders, invoices
- Audit log: every create/update/delete stores user_id + timestamp + before/after
- Notifications: in-app + email (low stock, invoice overdue, deal won, approval needed)
- RBAC: Admin, Sales, Warehouse, Accountant, Purchase — each scoped to relevant modules
- Multi-user support with login/session management — first user signs up and
  creates the organization; every subsequent user is invited by email (no
  public signup after the first) — see section 7
- Responsive UI (desktop-first, usable on tablet/mobile), dark mode support

## 4. Modules

1. **CRM** — Contacts, Companies, Deals (Kanban), Tasks, Activity timeline
2. **Inventory** — Products, Warehouses, StockLedgerEntry, low-stock → PO suggestion
3. **Sales** — SalesOrder → stock deduction, Invoice, Payment, CreditNote
4. **Purchase** — PurchaseOrder → GRN → stock addition → SupplierBill
5. **Customers & Suppliers** — directories referenced (not duplicated) by Sales/Purchase
6. **Accounts** — LedgerEntry (auto-posted), Receivables/Payables aging, Expenses, P&L
7. **Reports & Analytics** — cross-module dashboards, CSV/PDF export
8. **Settings** — org profile, users/roles, approvals & workflows, tax, templates, security

See full field-level detail in the original spec message (reproduced in project memory /
conversation history) — this file tracks structure; detailed entity fields live in
`packages/database/prisma/schema.prisma` as the executable source of truth.

## 5. Data Flow

```
CRM Deal Won -> Sales Order -> Invoice -> Accounts Receivable
                    |
              Inventory stock deducted (on order confirm)

Inventory low stock -> Purchase Order -> Supplier Bill -> Accounts Payable
                    |
              Inventory stock added (on GRN confirm)
```

## 7. Auth & Onboarding

**Signup (first user only)** — `/signup` collects full name, email, password,
and organization name. On submit, the API creates a new `Organization` +
default `OrgSettings` row, then the submitting user as that organization's
first `User` with role `Admin`, and logs them straight in. There is no public
signup after this — every other account is invited.

**Invite (all subsequent users)** — Settings → Users & Teams → Invite User
(email + role). The API generates a random token, stores only its SHA-256
hash (`InviteToken.tokenHash`), and emails a link to `/invite/:token`. That
page calls the unauthenticated `inviteInfo` query to show "join {org} as
{role}" (or an expired/invalid message), then collects the user's name and a
password on a Set Password form — not a signup form, since email/org/role are
already fixed by the invite. Invite links expire after 7 days; Admins can
resend (rotates the token) or revoke pending invites from the same screen.

**Login** — `/login`, email + password, creates the existing signed
httpOnly session cookie (`SessionAuthGuard`/`SessionService` — unchanged by
this feature, no JWT introduced).

**Password reset** — `/forgot-password` requests a reset link (always
responds success, to avoid leaking which emails have accounts); the emailed
`/reset-password/:token` link lets the user set a new password, which also
invalidates their other active sessions.

**Multi-tenancy enforcement** — every business-data table carries
`organizationId`. Reads/writes against those tables are auto-scoped by a
Prisma Client Extension (`apps/api/src/common/tenancy/`) reading the current
session's org from request-scoped `AsyncLocalStorage` context — not by
manually filtering each query — so a forgotten filter fails closed
(`ForbiddenException`) rather than silently leaking cross-org data. Business
sequence numbers (`SO-0001`, `INV-0001`, `PO-0001`, `GRN-0001`, `BILL-0001`)
and `Product.sku` are unique per-organization, not globally.

**Email** — invite and password-reset links are sent via one SMTP server per
deployment (`SMTP_HOST`/`PORT`/`USER`/`PASS`/`FROM` env vars), matching the
self-hosted-per-client model — not a per-organization email configuration UI.
Local dev points at the `mailpit` container in `docker-compose.dev.yml`
(catch-all inbox at `http://localhost:8025`).

## 8. Design System — Charcoal & Amber

| Role | Hex |
|---|---|
| Sidebar/dark surface | `#1C1917` |
| Primary accent | `#B45309` |
| Page background | `#FAFAF9` |
| Card background | `#FFFFFF` |
| Border | `#E7E5E4` |
| Primary text | `#1C1917` |
| Secondary text | `#78716C` / `#57534E` |
| Success | `#059669` on `#D1FAE5` |
| Warning | `#D97706` on `#FEF3C7` |
| Danger | `#DC2626` on `#FEE2E2` |
| Info | `#2563EB` on `#DBEAFE` |

Layout: fixed left sidebar + top bar (search, notifications, user menu) + main content.
List screens: filter bar -> data table -> detail panel on row click.
Multi-step forms for complex creates. Sticky table headers, bulk actions, empty states with CTA.
