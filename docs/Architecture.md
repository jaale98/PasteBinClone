# Pastebin Clone — Architecture Document

**Status:** Draft | **Version:** 1.0 | **Date:** 2026-03-16 | **PRD Version:** 1.0

---

## 1. Stack Decision Summary

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Full-stack SSR + API routes in one deploy; dominant in ecosystem |
| Language | TypeScript | Default for Next.js; catches schema/type mismatches early |
| Database | PostgreSQL | Most common relational DB; best PaaS free-tier support |
| DB Host | Neon (serverless Postgres) | Vercel-native integration; generous free tier; connection pooling built in |
| ORM | Prisma | Standard Next.js/Postgres pairing; schema-first; strong migration tooling |
| Auth | Auth.js (NextAuth v5) | Native Next.js integration; handles sessions, cookies, CSRF; credentials provider for email/password |
| Password hashing | bcrypt | Industry standard |
| Email | Resend | Simple API; reliable free tier for transactional email |
| CAPTCHA | Cloudflare Turnstile | Free, no usage limits, non-intrusive, simple server-side verify |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Serverless-compatible (Vercel edge); free tier sufficient for hobby |
| Deployment | Vercel | Natural Next.js target; zero-config deploys |
| Styling | Tailwind CSS | Most common Next.js pairing |

---

## 2. System Architecture

```
Browser
  │
  ▼
Vercel Edge Network (TLS termination, routing)
  │
  ├── Next.js Server Components (SSR — paste view, home, tombstone)
  │
  └── Next.js API Routes / Route Handlers
        ├── /api/auth/[...nextauth]   Auth.js session management
        ├── /api/pastes               Create, read, update, delete
        └── /api/captcha              Turnstile verification (internal)
              │
              ├── Neon PostgreSQL     Primary data store
              └── Upstash Redis       Rate limit counters
```

**Why SSR for paste views:** Paste content is public and URL-addressable. Server-rendering means correct HTML is returned immediately — no client JS required to view a paste. This also means the tombstone page is handled server-side with the right HTTP semantics (200 with expired message, not a client-side redirect).

---

## 3. Data Model

### 3.1 Schema

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  pastes        Paste[]
}

model Paste {
  id               String    @id @default(cuid())
  slug             String    @unique
  title            String?
  content          String    // plain text, max 512KB enforced at API layer
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  expiresAt        DateTime?
  
  // Ownership — one of these is set, never both
  userId           String?
  User             User?     @relation(fields: [userId], references: [id])
  sessionOwnerId   String?   // anonymous session ID

  claimToken       String?   @unique  // null after claimed or for authenticated pastes
  
  historyPublic    Boolean   @default(false)
  
  versions         PasteVersion[]

  @@index([slug])
  @@index([userId])
  @@index([sessionOwnerId])
  @@index([expiresAt])    // for cleanup job queries
}

model PasteVersion {
  id        String   @id @default(cuid())
  pasteId   String
  Paste     Paste    @relation(fields: [pasteId], references: [id], onDelete: Cascade)
  content   String
  createdAt DateTime @default(now())
  editorId  String?  // userId or session ID — nullable (initial creation not versioned)

  @@index([pasteId, createdAt])
}
```

### 3.2 Design Notes

**Ownership is nullable dual-column, not a polymorphic type.** `userId` and `sessionOwnerId` are mutually exclusive. A check constraint or application-layer guard enforces this. When an anonymous paste is claimed, `sessionOwnerId` and `claimToken` are nulled, `userId` is set — in a single transaction.

**Versions are a separate table, not embedded.** Rolling 10-version cap is enforced at write time: insert new version, then delete oldest if count exceeds 10. This must be atomic — wrap both operations in a Prisma transaction. The initial paste creation does not create a version entry; versions represent edits only.

**`expiresAt` is a UTC timestamp.** Computed at creation or edit time from the selected interval. Never stored as an interval — always as an absolute datetime.

**Slug index is the hot path.** Every paste view hits `WHERE slug = ?`. The unique constraint doubles as the index.

---

## 4. Authentication & Sessions

### 4.1 Auth.js Configuration

Auth.js (NextAuth v5) with the Credentials provider handles email/password login. It issues a server-side session stored in an HttpOnly, Secure, SameSite=Lax cookie.

```
Session cookie name:  __Secure-authjs.session-token (Auth.js default)
Session strategy:     JWT (default for Credentials provider — no DB session table needed)
JWT TTL:              7 days (recommended — see rationale below)
```

**Session TTL rationale:** 24h is too short — users creating anonymous pastes and returning the next day lose ownership. 30d is longer than needed for a hobby project. 7 days is the Auth.js default and a reasonable middle ground for the anonymous claim use case.

### 4.2 Anonymous Session Tracking

Auth.js does not issue sessions to unauthenticated users. Anonymous ownership requires a separate mechanism:

- On anonymous paste creation, the server generates a random `sessionOwnerId` (a `cuid()`) and a `claimToken` (a `crypto.randomUUID()`).
- `sessionOwnerId` is stored in a separate non-auth HttpOnly cookie (`anon-session`) with the same 7-day TTL.
- `claimToken` is stored in the `Paste` row.
- On every edit/delete request from an anonymous user, the server reads `anon-session` and checks `WHERE sessionOwnerId = ? AND slug = ?`.

**Cookie spec for `anon-session`:**
```
HttpOnly: true
Secure: true
SameSite: Lax
Max-Age: 604800  // 7 days in seconds
Path: /
```

### 4.3 Paste Claiming

Triggered at login and registration:

1. Read `anon-session` cookie from the request.
2. If present, query `Paste WHERE sessionOwnerId = <anon-session value>`.
3. For each matching paste, in a single transaction:
   - Set `userId` = authenticated user ID
   - Null `sessionOwnerId` and `claimToken`
4. Clear the `anon-session` cookie.

This runs as part of the Auth.js `signIn` callback or in the registration route handler before returning the response.

### 4.4 Email Verification Flow

1. User registers → server creates account with `emailVerified = false`, generates a verification token (random 32 bytes, hex-encoded), stores a SHA-256 hash in an `EmailVerificationToken` table with 24h TTL.
2. Resend delivers an email with a verification link containing the token.
3. User clicks link → server verifies token against stored hash, checks expiry, sets `emailVerified = true` on the User row, deletes the token.
4. Login is blocked until `emailVerified = true` — the Auth.js `authorize` callback checks this field.
5. If the token expires, the user can request a new one from the login page (resend verification link).

```prisma
model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### 4.5 Password Reset Flow

1. User submits email → server generates a short-lived signed token (JWT, 1h TTL), stores a hash in a `PasswordResetToken` table.
2. Resend delivers an email with the reset link containing the token.
3. User clicks link → server verifies token against stored hash, checks expiry, allows password update.
4. Token is invalidated (deleted) after use.

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## 5. API Route Design

All data mutations go through Next.js Route Handlers (`app/api/`). Server Components handle read-only page rendering directly via Prisma.

| Method | Route | Auth Required | Description |
|---|---|---|---|
| POST | `/api/pastes` | No | Create paste |
| PATCH | `/api/pastes/[slug]` | Session or account | Edit paste content, expiry, slug, history visibility |
| DELETE | `/api/pastes/[slug]` | Session or account | Delete paste |
| POST | `/api/auth/register` | No | Create account + send verification email |
| POST | `/api/auth/verify-email` | No | Verify email with token |
| POST | `/api/auth/resend-verification` | No | Resend verification email |
| POST | `/api/auth/[...nextauth]` | — | Auth.js handler (login, logout, session) |
| POST | `/api/auth/forgot-password` | No | Initiate password reset |
| POST | `/api/auth/reset-password` | No | Complete password reset |

Paste views and the home page are Server Components — no API route, direct DB query at render time.

### 5.1 Ownership Check Pattern

Every mutating route runs this guard before executing:

```typescript
async function assertOwnership(slug: string, req: Request): Promise<Paste> {
  const paste = await prisma.paste.findUnique({ where: { slug } });
  if (!paste) throw new NotFoundError();

  const session = await auth(); // Auth.js — returns null if not logged in
  if (session?.user?.id && paste.userId === session.user.id) return paste;

  const anonSession = cookies().get('anon-session')?.value;
  if (anonSession && paste.sessionOwnerId === anonSession) return paste;

  throw new ForbiddenError();
}
```

---

## 6. Rate Limiting

Using Upstash Redis with `@upstash/ratelimit`. Runs inside Route Handlers before any business logic.

### 6.1 Recommended Defaults

| User Type | Window | Max Requests | Strategy |
|---|---|---|---|
| Anonymous (by IP) | 1 hour | 10 paste creations | Sliding window |
| Authenticated (by user ID) | 1 hour | 60 paste creations | Sliding window |

**Rationale:** 10/hr for anonymous is enough for legitimate use (it's a paste tool, not a bulk upload service) while making spam costly. 6x multiplier for authenticated users is a common starting point — tune up if it produces false positives.

### 6.2 CAPTCHA Integration

When a rate limit is breached, the API returns `HTTP 429` with a response body indicating CAPTCHA is required:

```json
{ "error": "rate_limited", "captchaRequired": true }
```

The client renders the Cloudflare Turnstile widget. On solve, the client resubmits the original request with the Turnstile token in an `X-Turnstile-Token` header. The server verifies the token against Cloudflare's API before processing the request and resetting the rate limit counter for that key.

Turnstile verification endpoint: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`

---

## 7. Paste Lifecycle Implementation

### 7.1 Creation

```
POST /api/pastes
  1. Check rate limit (IP for anon, userId for auth)
  2. If rate limited → 429 + captchaRequired
  3. Validate: content present, content ≤ 512KB, slug format if custom
  4. If custom slug → check uniqueness
  5. Generate slug if not provided
  6. If anonymous: generate sessionOwnerId + claimToken
  7. Write Paste row
  8. If anonymous: set anon-session cookie (if not already set)
  9. Return { slug, url }
```

### 7.2 Editing & Version History

```
PATCH /api/pastes/[slug]
  1. assertOwnership()
  2. Validate changes
  3. Begin Prisma transaction:
     a. If content changed:
        - Insert PasteVersion { pasteId, content: OLD content, editorId }
        - Count versions for this paste
        - If count > 10: delete oldest (ORDER BY createdAt ASC LIMIT 1)
     b. Update Paste row with new values
  4. Commit
```

Note: the version snapshot captures the **pre-edit** content, so version history reads as a changelog of what the paste used to say.

### 7.3 Slug Changes

Slug changes are a field update on the Paste row. The unique constraint on `slug` handles collision. Old URLs return 404 immediately — no redirect table.

### 7.4 Expiry & Tombstone

Paste view page (Server Component):

```
GET /[slug]
  1. Query paste by slug
  2. If not found → 404
  3. If expiresAt is set AND expiresAt < now() → render tombstone (HTTP 200)
  4. Otherwise → render paste view
```

Tombstone is a 200, not a 404 or 410 — this matches the PRD and avoids SEO implications of signaling permanent removal.

### 7.5 Expiry Cleanup Job

Expired pastes are not deleted at read time — they render tombstones. A background job handles actual deletion:

- **Implementation:** Vercel Cron Job (free tier, minimum 1/day) hitting an internal API route `/api/cron/cleanup`
- **Logic:** `DELETE FROM pastes WHERE expiresAt < NOW() - INTERVAL '1 day'`
- **Delay:** 1-day grace period before deletion — gives users who load a tombstone a brief window where the data still exists if they need to contact support.
- **Auth:** Cron route protected by a `CRON_SECRET` env var checked against the `Authorization` header Vercel sends.

---

## 8. Page & Component Structure

```
app/
  page.tsx                  Home — paste creation form
  [slug]/
    page.tsx                Paste view or tombstone (Server Component)
    edit/
      page.tsx              Edit form (Server Component, ownership-gated)
    versions/
      page.tsx              Version history (Server Component, visibility-gated)
  auth/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  api/
    pastes/
      route.ts              POST create
      [slug]/
        route.ts            PATCH, DELETE
    auth/
      [...nextauth]/route.ts
      register/route.ts
      forgot-password/route.ts
      reset-password/route.ts
    cron/
      cleanup/route.ts
  components/
    PasteForm.tsx           Shared create/edit form
    TurnstileWidget.tsx     Cloudflare Turnstile wrapper
```

---

## 9. Environment Variables

```bash
# Database
DATABASE_URL=                  # Neon connection string (pooled)
DATABASE_URL_UNPOOLED=         # Neon direct connection (for migrations)

# Auth.js
AUTH_SECRET=                   # Random 32-byte secret for JWT signing
AUTH_URL=                      # e.g. https://yourdomain.com

# Email
RESEND_API_KEY=

# Cloudflare Turnstile
TURNSTILE_SITE_KEY=            # Public — used on client
TURNSTILE_SECRET_KEY=          # Private — used server-side only

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cron
CRON_SECRET=                   # Random secret for cron route auth
```

---

## 10. Open Questions Resolved

| Item | Decision |
|---|---|
| Session cookie TTL | 7 days — Auth.js JWT default; balances anonymous claim UX with security |
| CAPTCHA provider | Cloudflare Turnstile — free, no usage cap, non-intrusive |
| Rate limit thresholds | 10/hr anonymous, 60/hr authenticated (sliding window, by IP / user ID) |
| Slug character set | Alphanumeric + hyphens, 3–50 characters, enforced at API layer with regex |
| Tombstone cleanup | Vercel Cron 1/day, 1-day grace period post-expiry before deletion |
| 512KB cap enforcement | API layer only — validate `Buffer.byteLength(content, 'utf8') <= 524288` |

---

## 11. Deferred / Out of Scope

| Item | Notes |
|---|---|
| CDN / edge caching | Not needed at hobby scale; add Cloudflare proxy later if needed |
| Full-text search | Non-goal in v1 |
| Paste encryption | Non-goal in v1 |
| API keys / public API | Non-goal in v1 |
| Abuse reporting | Non-goal in v1; revisit if deployed publicly |

---

*End of Document — v1.0 Draft*
