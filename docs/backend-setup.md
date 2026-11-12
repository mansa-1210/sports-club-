# Backend setup

## Runtime

The deployable app is the Next.js 16 App Router in `app/`. It uses the connected Neon Postgres database through a shared `pg` pool and Drizzle ORM. Neon Auth handles email/password authentication and its managed auth tables; the club profile and business tables are in `public`.

The original root-level PHP and static files are preserved. They are not the new application runtime; the Vercel project should build the repository root as a Next.js app.

## Environment

The connected project supplies these values:

- `DATABASE_URL` — Neon Postgres connection string.
- `NEON_AUTH_BASE_URL` — Neon Auth service URL.
- `NEON_AUTH_COOKIE_SECRET` — Neon Auth cookie signing secret.
- `SPORTS_CLUB_ADMIN_EMAIL` — email address allowed to receive the first administrator role.

Do not commit `.env*` files. The app uses same-origin `/api/auth` routes for browser auth calls. Development cookies use `SameSite=None` for the embedded v0 preview; production uses the hosted auth SDK's first-party cookie defaults.

## Schema and seed data

The schema was applied to the connected Neon branch through the Neon integration. `database/schema.sql` records the idempotent DDL for the club-owned tables and indexes. Neon Auth's managed tables are intentionally omitted. `database/seed.sql` contains only sports and membership plans already shown on the original homepage; it does not create sample members, registrations, programmes, events, or payment records.

When replaying on a fresh branch, apply the statements in `database/schema.sql`, then `database/seed.sql`. Keep SQL statements separate when using the Neon MCP. Both files use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` where appropriate.

## First administrator

Set `SPORTS_CLUB_ADMIN_EMAIL` to the intended administrator email in the Vercel project environment, then create an email/password account with that exact address. The authenticated profile is provisioned with the `admin` role on first request. Other role changes are available only inside the protected `/admin` workspace, and the last administrator cannot demote themselves.

Coach accounts are linked by the account email entered on the coach profile. Set the matching member role to `coach` in the admin workspace to grant the protected `/coach` workspace.

## Membership payments

Membership applications are stored as `pending_payment`. The club can activate one only after recording an `offline_verified` payment status and an optional external reference. There is no checkout integration, no card-data collection, and no code path that claims to have charged a member.

## Local development and deployment

Install from the lockfile and run the `dev` script. `typecheck` validates the TypeScript project; `build` is the separate production validation. The Vercel project should use the repository root as its Next.js root directory. Existing `sports-images/` source files remain intact; the app serves copies from `public/sports-images/`.
