# CLAUDE.md

## Project Overview

Pastebin Clone — lightweight paste service with anonymous and authenticated paste creation, editing, deletion, expiry, version history, and paste claiming. See `docs/prd.md` and `docs/architecture.md` for full specs.

## Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Database:** Neon (serverless Postgres) via Prisma 7
- **Auth:** Auth.js (NextAuth v5) — Credentials provider, JWT sessions, 7-day TTL
- **Email:** Resend
- **CAPTCHA:** Cloudflare Turnstile
- **Rate limiting:** Upstash Redis + @upstash/ratelimit
- **Styling:** Tailwind CSS
- **Deployment target:** Vercel

## Key Architectural Decisions

- **Prisma 7 breaking change:** Connection URLs (`url`, `directUrl`) must be in `prisma.config.ts`, NOT in `prisma/schema.prisma`. The schema only declares `provider`.
- **Prisma config loads `.env.local`:** Uses `dotenv.config({ path: ".env.local" })` instead of `dotenv/config` (which only loads `.env`).
- **Prisma client output:** Generated to `src/generated/prisma` (gitignored). Run `npx prisma generate` after schema changes.
- **Prisma singleton:** `src/lib/db.ts` uses `globalThis` pattern to avoid multiple clients during Next.js hot reload.
- **Auth.ts lives at project root** (not in src/) — this is the NextAuth v5 convention. Exports `auth`, `signIn`, `signOut`, `handlers`.
- **Anonymous ownership:** Dual-column (`userId` / `sessionOwnerId`), never both. Anonymous pastes get a `claimToken` (crypto.randomUUID) and `sessionOwnerId` (cuid2). The `anon-session` cookie stores the sessionOwnerId.
- **Expiry stored as absolute UTC timestamp**, never as an interval.
- **Slug generation:** 6-char random alphanumeric from crypto.randomBytes. Unique constraint on DB enforces no collisions.
- **512KB content limit** enforced at API layer via `Buffer.byteLength(content, 'utf8')`.

## Project Structure

```
auth.ts                          # Auth.js config (project root)
prisma.config.ts                 # Prisma config with Neon URLs
prisma/schema.prisma             # Data model
src/
  generated/prisma/              # Prisma client (gitignored)
  lib/
    db.ts                        # Prisma singleton
    anon-session.ts              # Anonymous session cookie helpers
    email.ts                     # Resend email helper (password reset)
  app/
    page.tsx                     # Home — paste creation form
    [slug]/
      page.tsx                   # Paste view / tombstone (Server Component)
      edit/
        page.tsx                 # Edit form (Server Component, ownership-gated)
      versions/
        page.tsx                 # Version history (Server Component, visibility-gated)
    auth/
      login/page.tsx             # Login form (Client Component)
      register/page.tsx          # Registration form (Client Component)
      forgot-password/page.tsx   # Request password reset (Client Component)
      reset-password/page.tsx    # Set new password with token (Client Component)
    components/
      PasteForm.tsx              # Client component — create/edit form
      DeleteButton.tsx           # Client component — delete with confirmation
    api/
      auth/
        [...nextauth]/route.ts   # Auth.js handlers
        register/route.ts        # POST registration
        forgot-password/route.ts # POST initiate reset (sends email via Resend)
        reset-password/route.ts  # POST complete reset (validates token, updates password)
      pastes/
        route.ts                 # POST paste creation
        [slug]/
          route.ts               # PATCH edit, DELETE paste
docs/
  architecture.md                # Full architecture spec
  prd.md                         # Product requirements
```

## Patterns

- **API routes** handle all mutations. Server Components do read-only DB queries directly.
- **Client components** use `"use client"` directive and fetch API routes. Server components are the default.
- **Imports:** Use `@/` alias for `src/` paths. Auth import from root uses relative path (depth varies by file location, e.g. `../../../auth` from `[slug]/page.tsx`).
- **Error handling in API routes:** Prisma `PrismaClientKnownRequestError` with `error.code === "P2002"` for unique constraint violations.
- **Cookie spec for anon-session:** HttpOnly, Secure, SameSite=Lax, Max-Age=604800, Path=/.
- **Paste claiming:** On login (Auth.js `signIn` callback) and registration (register route), anonymous pastes matching `anon-session` are transferred to the authenticated user and the cookie is cleared.

## Commands

- `npx prisma generate` — regenerate Prisma client after schema changes
- `npx prisma db push` — push schema to Neon (no migrations)
- `npm run dev` — start dev server with Turbopack

## Workflow

- Commit after each discrete task
- Push to GitHub after each task
- Always read `docs/architecture.md` before implementing features
