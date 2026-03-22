# Pastebin Clone — Architecture for Noobs

A plain-English walkthrough of how this entire application works, from the moment a user opens their browser to what happens inside the database. No assumptions beyond knowing what a website is.

---

## Table of Contents

1. [What Does This App Do?](#1-what-does-this-app-do)
2. [The Big Picture](#2-the-big-picture)
3. [The Technology Stack (and Why Each Piece Exists)](#3-the-technology-stack-and-why-each-piece-exists)
4. [How the Files Are Organized](#4-how-the-files-are-organized)
5. [The Database — Where Everything Is Stored](#5-the-database--where-everything-is-stored)
6. [What Happens When... (User Flows)](#6-what-happens-when-user-flows)
7. [Security — How We Keep Things Safe](#7-security--how-we-keep-things-safe)
8. [The Cleanup Job — Automated Maintenance](#8-the-cleanup-job--automated-maintenance)
9. [Third-Party Services — The External Dependencies](#9-third-party-services--the-external-dependencies)
10. [Glossary](#10-glossary)

---

## 1. What Does This App Do?

Pastebin Clone is a website where anyone can paste some text, get a unique link, and share that link with others. Think of it like a sticky note you put on the internet — anyone with the link can read it.

You don't need an account to create a paste. But if you make an account, you get extra abilities like editing your pastes later, setting custom URLs, and managing when your pastes expire.

---

## 2. The Big Picture

Here's what happens at a high level when someone uses the app:

```
User's Browser
     |
     |  (types a URL or clicks a link)
     |
     v
Vercel (our hosting provider)
     |
     |  (receives the request, figures out what to do)
     |
     v
Next.js Application (our code)
     |
     ├── Need to SHOW a page?  --> Server Component renders HTML
     |                              |
     |                              v
     |                         Neon Database (reads paste data)
     |
     ├── Need to DO something? --> API Route handles it
     |   (create paste, login,      |
     |    delete, edit, etc.)        ├── Neon Database (stores/updates data)
     |                               ├── Upstash Redis (checks rate limits)
     |                               ├── Resend (sends emails)
     |                               └── Cloudflare Turnstile (verifies CAPTCHAs)
     |
     v
Response sent back to browser
```

The key idea: the browser sends requests, our application processes them using various external services, and sends back either a web page or a data response.

---

## 3. The Technology Stack (and Why Each Piece Exists)

Think of building a web app like building a house. You need different materials and tools for different jobs. Here's what we use and why:

### Next.js — The Framework

**What it is:** A framework for building websites with JavaScript/TypeScript. It runs on both the server (the computer hosting the website) and the client (the user's browser).

**Why we use it:** It lets us write the entire application — the pages people see AND the behind-the-scenes logic — in one project. Instead of having a separate "backend" and "frontend," it's all together. When someone visits a paste URL, Next.js can render the page on the server and send the finished HTML to the browser, which is fast.

**Key concept — Server Components vs. Client Components:**
- **Server Components** run on the server only. They can talk directly to the database. The user's browser never sees this code. We use these for pages that just need to display data (like viewing a paste).
- **Client Components** run in the browser. They handle interactive things like forms, buttons, and showing/hiding elements. We use these for the paste creation form, login form, delete button, etc. You can spot them because they start with `"use client"` at the top of the file.

### TypeScript — The Language

**What it is:** JavaScript with added type safety. Instead of just writing `let name = "Jack"`, you can write `let name: string = "Jack"`, which tells the computer "this should always be text, never a number."

**Why we use it:** It catches mistakes before the code runs. If you accidentally try to use a number where text is expected, TypeScript tells you immediately instead of letting the bug reach users.

### PostgreSQL (via Neon) — The Database

**What it is:** A database — the place where all the data lives. Every paste, every user account, every version history entry is stored here as rows in tables (like a spreadsheet).

**Why PostgreSQL:** It's the most popular and reliable open-source database in the world. It's been around for decades and handles everything from tiny hobby projects to massive enterprise applications.

**Why Neon specifically:** Neon is a cloud-hosted version of PostgreSQL that's designed for modern serverless applications. It has a generous free tier and integrates neatly with Vercel (our hosting). The key benefit is "serverless" — it scales automatically and you don't have to manage a database server yourself.

### Prisma — The ORM (Object-Relational Mapper)

**What it is:** A tool that lets us talk to the database using TypeScript code instead of writing raw SQL queries.

**Without Prisma, you'd write:**
```sql
SELECT * FROM "Paste" WHERE slug = 'abc123';
```

**With Prisma, you write:**
```typescript
prisma.paste.findUnique({ where: { slug: 'abc123' } });
```

**Why we use it:** It's safer (less chance of SQL injection attacks), more readable, and it auto-generates TypeScript types from our database schema so we get autocomplete and error checking.

### Auth.js (NextAuth v5) — Authentication

**What it is:** A library that handles all the complicated parts of user login: creating sessions, managing cookies, protecting routes, and so on.

**Why we use it:** Authentication is surprisingly complex to build from scratch. You need to handle password hashing, session tokens, cookie security flags, CSRF protection, and more. Auth.js does all of this and is specifically designed for Next.js.

**How it works in our app:** We use the "Credentials" provider, which means email + password login (as opposed to "Sign in with Google" or similar). When a user logs in, Auth.js creates a JWT (JSON Web Token) — an encrypted piece of data — and stores it in a cookie in their browser. On every subsequent request, Auth.js reads that cookie to know who the user is.

### bcrypt — Password Hashing

**What it is:** A one-way encryption algorithm for passwords.

**Why "one-way":** When a user creates a password like `hunter2`, we don't store `hunter2` in the database. We run it through bcrypt, which produces something like `$2b$12$LJ3m4ys...` — a scrambled version that can never be turned back into the original password. When the user logs in later, we bcrypt the password they type and compare the scrambled versions. This means even if someone steals the database, they can't see anyone's actual password.

### Resend — Email Delivery

**What it is:** A service that sends emails on our behalf.

**Why we use it:** Sending emails from a web application is harder than it sounds. You need proper authentication (SPF, DKIM records), you need to avoid spam filters, and you need a reliable delivery pipeline. Resend handles all of this. We just call their API with "send this email to this person" and they take care of the rest.

**What we send:** Two types of emails:
1. **Verification emails** — When you register, we send a link to confirm you own that email address.
2. **Password reset emails** — When you forget your password, we send a link to set a new one.

### Cloudflare Turnstile — CAPTCHA

**What it is:** A "prove you're human" challenge, like those "click all the traffic lights" boxes, but less annoying. Turnstile is often invisible — it runs in the background and only shows a challenge if it's suspicious.

**Why we use it:** To prevent bots from flooding the service with spam pastes. It's only triggered when a user hits the rate limit (see below), not on every request.

### Upstash Redis — Rate Limiting

**What it is:** Redis is an extremely fast in-memory data store. Upstash is a cloud-hosted version of Redis.

**Why we use it:** We use it to count how many pastes a user has created recently. Think of it as a tally counter — every time you create a paste, we increment your count. If your count exceeds the limit (10 per hour for anonymous users, 60 per hour for logged-in users), we block the request and ask you to solve a CAPTCHA. The counter resets over time using a "sliding window" — it's not a hard reset every hour, but a gradual decrease.

**Why Redis and not the main database?** Speed. Rate limiting needs to be checked on every single paste creation request, and it needs to be fast. Redis operates entirely in memory (RAM), making it orders of magnitude faster than querying PostgreSQL for this kind of counter operation.

### Tailwind CSS — Styling

**What it is:** A CSS framework that lets you style elements by adding class names directly in the HTML. Instead of writing a separate CSS file with `.big-red-button { color: red; font-size: 20px; }`, you write `className="text-red-500 text-xl"` right on the element.

**Why we use it:** It's fast to work with and keeps styles co-located with the components they affect. It's the most popular styling approach in the Next.js ecosystem.

### Vercel — Hosting/Deployment

**What it is:** The cloud platform that runs our application and makes it available on the internet.

**Why we use it:** Vercel is made by the same company that makes Next.js, so the integration is seamless. You push code to GitHub, Vercel automatically builds and deploys it. It also provides the cron job infrastructure we use for cleanup tasks.

---

## 4. How the Files Are Organized

The project follows Next.js App Router conventions. Here's the structure with explanations:

```
PasteBinClone/
│
├── auth.ts                     ← Auth.js configuration (who can log in, how sessions work)
├── prisma.config.ts            ← Tells Prisma how to connect to the database
├── prisma/
│   └── schema.prisma           ← Defines the database structure (what tables exist, what columns they have)
├── vercel.json                 ← Vercel configuration (cron job schedule)
│
├── docs/
│   ├── prd.md                  ← Product Requirements Document (what the app should do)
│   └── architecture.md         ← Technical architecture document (how it's built)
│
├── src/
│   ├── lib/                    ← Shared utility code used across the app
│   │   ├── db.ts               ← Database connection setup (creates the Prisma client)
│   │   ├── anon-session.ts     ← Helpers for anonymous user session cookies
│   │   ├── email.ts            ← Functions that send emails via Resend
│   │   ├── rate-limit.ts       ← Rate limiter configuration (Upstash Redis)
│   │   └── turnstile.ts        ← Cloudflare Turnstile token verification
│   │
│   ├── generated/prisma/       ← Auto-generated database client code (don't edit this)
│   │
│   └── app/                    ← All the pages and API routes
│       │
│       ├── layout.tsx          ← The root layout — wraps every page (header, providers)
│       ├── page.tsx            ← Home page (paste creation form)
│       ├── not-found.tsx       ← Custom 404 page
│       ├── globals.css         ← Global styles
│       │
│       ├── [slug]/             ← Dynamic route — the [slug] part is the paste's unique ID
│       │   ├── page.tsx        ← Paste view page (or tombstone if expired)
│       │   ├── edit/
│       │   │   └── page.tsx    ← Edit paste page (only visible to owner)
│       │   └── versions/
│       │       └── page.tsx    ← Version history page
│       │
│       ├── auth/               ← Authentication pages (what users see)
│       │   ├── login/page.tsx
│       │   ├── register/page.tsx
│       │   ├── verify-email/page.tsx
│       │   ├── forgot-password/page.tsx
│       │   └── reset-password/page.tsx
│       │
│       ├── api/                ← API routes (behind-the-scenes logic, not visible pages)
│       │   ├── pastes/
│       │   │   ├── route.ts            ← POST: create a new paste
│       │   │   └── [slug]/
│       │   │       └── route.ts        ← PATCH: edit a paste, DELETE: delete a paste
│       │   ├── auth/
│       │   │   ├── [...nextauth]/route.ts      ← Auth.js handles login/logout
│       │   │   ├── register/route.ts           ← Create new account
│       │   │   ├── verify-email/route.ts       ← Verify email address
│       │   │   ├── resend-verification/route.ts ← Resend verification email
│       │   │   ├── forgot-password/route.ts    ← Send password reset email
│       │   │   └── reset-password/route.ts     ← Set new password
│       │   └── cron/
│       │       └── cleanup/route.ts    ← Automated expired paste deletion
│       │
│       └── components/         ← Reusable UI pieces
│           ├── Header.tsx      ← Navigation bar (logo, login/logout links)
│           ├── Providers.tsx   ← Wraps the app with session context
│           ├── PasteForm.tsx   ← The form for creating/editing pastes
│           ├── DeleteButton.tsx ← Delete button with confirmation step
│           └── TurnstileWidget.tsx ← CAPTCHA widget
```

### How Next.js Routing Works

The file system IS the routing. The folder structure maps directly to URLs:

| File Path | URL |
|---|---|
| `app/page.tsx` | `https://yoursite.com/` |
| `app/[slug]/page.tsx` | `https://yoursite.com/abc123` (any paste URL) |
| `app/[slug]/edit/page.tsx` | `https://yoursite.com/abc123/edit` |
| `app/auth/login/page.tsx` | `https://yoursite.com/auth/login` |
| `app/api/pastes/route.ts` | `https://yoursite.com/api/pastes` (not a page — an API endpoint) |

The `[slug]` in brackets means "this part of the URL is dynamic." When someone visits `/xK3pQ`, Next.js passes `xK3pQ` as the `slug` parameter to the page component.

---

## 5. The Database — Where Everything Is Stored

The database has six tables. Think of each table as a spreadsheet:

### Users Table

Stores everyone who has created an account.

| Column | What It Stores | Example |
|---|---|---|
| id | Unique identifier (auto-generated) | `cm5abc123def` |
| email | Their email address | `jack@example.com` |
| passwordHash | Their password (scrambled, not readable) | `$2b$12$LJ3m4ys...` |
| emailVerified | Have they clicked the verification link? | `true` or `false` |
| createdAt | When they signed up | `2026-03-22 14:30:00` |

### Pastes Table

Every paste that's been created.

| Column | What It Stores | Example |
|---|---|---|
| id | Unique identifier | `cm5xyz789ghi` |
| slug | The short URL code | `xK3pQ` |
| title | Optional title | `My Shopping List` |
| content | The actual text content | `Buy milk, eggs, bread` |
| createdAt | When it was created | `2026-03-22 14:30:00` |
| updatedAt | When it was last edited | `2026-03-22 15:00:00` |
| expiresAt | When it should expire (if set) | `2026-03-29 14:30:00` or empty |
| userId | Which account owns it (if logged in) | `cm5abc123def` or empty |
| sessionOwnerId | Which anonymous session owns it | `cm5sess456` or empty |
| claimToken | Token for transferring to an account | `a1b2c3d4-...` or empty |
| historyPublic | Can anyone see version history? | `false` |

**Important rule:** A paste is owned by EITHER a `userId` (logged-in user) OR a `sessionOwnerId` (anonymous user), never both. When an anonymous user creates an account and claims their pastes, the `sessionOwnerId` gets cleared and `userId` gets set.

### PasteVersion Table

Every time someone edits a paste, the OLD content is saved here as a version. This lets you see what a paste used to say.

| Column | What It Stores |
|---|---|
| id | Unique identifier |
| pasteId | Which paste this version belongs to |
| content | What the paste said BEFORE this edit |
| createdAt | When this edit happened |
| editorId | Who made the edit |

Maximum 10 versions per paste. When the 11th edit happens, the oldest version is deleted.

### EmailVerificationToken Table

When someone registers, we generate a random token and store its hash here. When they click the link in their email, we check the token against this table.

| Column | What It Stores |
|---|---|
| id | Unique identifier |
| userId | Which user this token is for |
| tokenHash | Scrambled version of the token (not the actual token) |
| expiresAt | When this token stops working (24 hours after creation) |

### PasswordResetToken Table

Same concept as verification tokens, but for password resets. Expires after 1 hour.

### Why We Store Hashes, Not Tokens

For both verification and password reset tokens, we store a **hash** (scrambled version) in the database, not the actual token. The actual token only exists in the email link. This is a security measure — if someone gets access to the database, they can't use the stored hashes to verify accounts or reset passwords. They'd need the original tokens, which only exist in the user's email inbox.

---

## 6. What Happens When... (User Flows)

### Someone Creates a Paste (Not Logged In)

1. User types text into the form on the home page and clicks "Create Paste"
2. Browser sends a `POST` request to `/api/pastes` with the text content
3. **Rate limit check:** The server asks Upstash Redis "how many pastes has this IP address created in the last hour?" If more than 10, the request is rejected with a CAPTCHA challenge.
4. **Validation:** Is there content? Is it under 512KB?
5. **Slug generation:** The server generates a random 6-character code like `xK3pQ` using cryptographically secure random bytes
6. **Anonymous ownership setup:** Since the user isn't logged in, the server generates:
   - A `sessionOwnerId` — a random ID to identify this browser session
   - A `claimToken` — a token that will let this paste be transferred to an account later
7. **Database write:** The paste is saved to the Pastes table
8. **Cookie set:** If this is the user's first paste, the `sessionOwnerId` is stored in a cookie called `anon-session` in their browser (valid for 7 days)
9. **Response:** The server returns the paste URL, and the browser redirects to it

### Someone Views a Paste

1. User navigates to `yoursite.com/xK3pQ`
2. Next.js matches this to `app/[slug]/page.tsx` with `slug = "xK3pQ"`
3. The **Server Component** queries the database: "find the paste where slug = xK3pQ"
4. **Not found?** Show the 404 page
5. **Expired?** Show the tombstone page — "This paste has expired" with the expiry date. The content is NOT shown.
6. **Active?** Show the paste content. The server also checks if the current user is the owner (by checking the auth session cookie or the anon-session cookie). If they are the owner, the Edit and Delete buttons are shown.
7. The finished HTML is sent to the browser. No JavaScript is needed just to view a paste — it's fully server-rendered.

### Someone Registers an Account

1. User fills in email, password, and confirm password on the register page
2. **Client-side validation:** Passwords match? At least 8 characters?
3. Browser sends `POST /api/auth/register` with the email and password
4. **Server-side validation:** Email format? Password length?
5. **Password hashing:** The password is run through bcrypt (12 rounds of scrambling) to produce a hash
6. **Database write:** A new User row is created with `emailVerified: false`
7. **Verification token:** A random 32-byte token is generated. Its SHA-256 hash is stored in the EmailVerificationToken table (expires in 24 hours). The original (unhashed) token is put into a URL.
8. **Email sent:** Resend delivers an email with a link like `yoursite.com/auth/verify-email?token=abc123...`
9. **Response:** "Check your email" message shown. The user is NOT logged in yet.

### Someone Verifies Their Email

1. User clicks the link in their email
2. Browser loads `auth/verify-email?token=abc123...`
3. The page automatically sends `POST /api/auth/verify-email` with the token
4. Server hashes the token with SHA-256 and looks it up in the EmailVerificationToken table
5. **Not found or expired?** Show an error
6. **Valid?** In a single database transaction (all-or-nothing):
   - Set `emailVerified = true` on the User
   - Delete the token from EmailVerificationToken
7. "Email verified! You can now log in."

### Someone Logs In

1. User enters email and password on the login page
2. Auth.js receives the credentials
3. **Database lookup:** Find the user by email
4. **Password check:** bcrypt the entered password and compare to the stored hash
5. **Verification check:** Is `emailVerified` true? If not, reject with "EMAIL_NOT_VERIFIED" — the login page shows a warning with a "Resend verification email" button
6. **Success:** Auth.js creates a JWT containing the user's ID, signs it with AUTH_SECRET, and stores it in a secure cookie. The cookie is:
   - `HttpOnly` — JavaScript in the browser can't read it (prevents XSS attacks)
   - `Secure` — Only sent over HTTPS
   - `SameSite=Lax` — Not sent with cross-site requests (prevents CSRF attacks)
   - Valid for 7 days
7. **Paste claiming:** Auth.js checks for the `anon-session` cookie. If found, all pastes belonging to that anonymous session are transferred to the logged-in user's account. The `anon-session` cookie is cleared.
8. Browser redirects to wherever the user came from (or home)

### Someone Edits a Paste

1. Owner clicks "Edit" on a paste they own
2. Browser loads the edit page, which shows the current content in a form
3. User makes changes and clicks "Save Changes"
4. Browser sends `PATCH /api/pastes/xK3pQ` with the new content
5. **Ownership check:** Server verifies the request is from the paste's owner (by checking the auth session or anon-session cookie)
6. **Database transaction** (all operations succeed or all fail):
   - The OLD content is saved as a new PasteVersion entry
   - If there are now more than 10 versions, the oldest is deleted
   - The Paste row is updated with the new content
7. User is redirected back to the paste view

### Someone Resets Their Password

1. User clicks "Forgot password?" on the login page
2. Enters their email → `POST /api/auth/forgot-password`
3. Server looks up the user. Whether found or not, it always says "If an account exists, we sent a link." (This prevents attackers from discovering which emails have accounts.)
4. If the user exists: generate a token, hash it, store in PasswordResetToken (1 hour expiry), email the link via Resend
5. User clicks the link → lands on the reset password page
6. Enters new password → `POST /api/auth/reset-password` with the token and new password
7. Server verifies the token, hashes the new password with bcrypt, updates the User row, deletes the token
8. "Password updated. You can now log in."

---

## 7. Security — How We Keep Things Safe

### Rate Limiting

Without rate limiting, a bot could create thousands of pastes per second, filling the database with junk. The rate limiter counts requests per user:

- **Anonymous users:** 10 paste creations per hour (tracked by IP address)
- **Logged-in users:** 60 paste creations per hour (tracked by user ID)

These counters live in Redis because it's extremely fast — we can't afford to slow down every request with a database query just to check a counter.

When the limit is hit, the user gets a 429 (Too Many Requests) response and a CAPTCHA appears. If they solve it, their request goes through — the CAPTCHA token is sent in a special HTTP header (`X-Turnstile-Token`), the server verifies it with Cloudflare's API, and bypasses the rate limit for that one request.

### Password Security

- Passwords are hashed with bcrypt (12 rounds) — even if the database is leaked, passwords can't be recovered
- Password reset tokens and email verification tokens are stored as SHA-256 hashes — the actual tokens only exist in email links
- Tokens are single-use and time-limited (1 hour for password reset, 24 hours for email verification)

### Cookie Security

All cookies use security flags:
- `HttpOnly` — Can't be read by JavaScript (protects against XSS)
- `Secure` — Only sent over HTTPS (protects against network eavesdropping)
- `SameSite=Lax` — Not sent with cross-site form submissions (protects against CSRF)

### Ownership Enforcement

Every action that modifies a paste (edit, delete) goes through an ownership check. The server never trusts the client — it always verifies that the request is coming from the paste's actual owner by checking session tokens.

### Input Validation

- Paste content is capped at 512KB (server-side enforcement — client-side validation can be bypassed)
- Email format is validated
- Passwords must be at least 8 characters
- Custom slugs are restricted to alphanumeric characters and hyphens

---

## 8. The Cleanup Job — Automated Maintenance

When a paste expires, it doesn't get deleted immediately. Instead, it stays in the database and shows a "tombstone" page — "This paste has expired." This gives a 1-day grace period in case someone needs to contact support about their expired data.

A **cron job** (a scheduled task) runs once per day at 3:00 AM UTC. It's configured in `vercel.json` and hits our internal API route `POST /api/cron/cleanup`. This route:

1. Checks that the request includes the correct `CRON_SECRET` (so random people can't trigger it)
2. Deletes all pastes where `expiresAt` is more than 24 hours ago
3. PasteVersion rows are automatically deleted along with their parent paste (thanks to `onDelete: Cascade` in the database schema)

---

## 9. Third-Party Services — The External Dependencies

| Service | What We Use It For | Dashboard URL |
|---|---|---|
| **Neon** | Hosting our PostgreSQL database | https://console.neon.tech |
| **Resend** | Sending verification and password reset emails | https://resend.com/dashboard |
| **Upstash** | Redis for rate limiting counters | https://console.upstash.com |
| **Cloudflare Turnstile** | CAPTCHA challenges when rate limited | https://dash.cloudflare.com |
| **Vercel** | Hosting the application and running cron jobs | https://vercel.com/dashboard |
| **GitHub** | Storing the source code | https://github.com |

### Environment Variables

These are secret values stored in a `.env.local` file (never committed to source control). They tell the application how to connect to each service:

| Variable | What It's For |
|---|---|
| `DATABASE_URL` | Connection string for Neon PostgreSQL |
| `AUTH_SECRET` | Secret key for signing JWT session tokens |
| `AUTH_URL` | The app's URL (used in email links) |
| `RESEND_API_KEY` | API key for sending emails |
| `EMAIL_FROM` | The "from" address on emails |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile public key (used in the browser) |
| `TURNSTILE_SECRET_KEY` | Turnstile private key (used on the server) |
| `UPSTASH_REDIS_REST_URL` | Connection URL for Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Authentication token for Upstash Redis |
| `CRON_SECRET` | Secret that authenticates the cleanup cron job |

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **API route** | A URL endpoint that doesn't return a web page — it returns data (usually JSON). Used for creating, editing, and deleting things. |
| **bcrypt** | A password hashing algorithm. Turns passwords into irreversible scrambled text. |
| **CAPTCHA** | A challenge that verifies you're a human, not a bot. |
| **Client Component** | A React component that runs in the user's browser. Handles interactive features like forms and buttons. |
| **Cookie** | A small piece of data the server stores in the user's browser. Used to remember who you are between page loads. |
| **CRON job** | A task that runs on a schedule (like "every day at 3 AM"). |
| **CRUD** | Create, Read, Update, Delete — the four basic data operations. |
| **CSRF** | Cross-Site Request Forgery — an attack where a malicious site tricks your browser into making requests to another site you're logged into. |
| **cuid** | A type of unique ID that's collision-resistant and URL-safe. |
| **Hash** | The output of a one-way function. You can turn input into a hash, but you can't turn a hash back into the original input. |
| **HTTP status codes** | Numbers that indicate what happened. 200 = success, 201 = created, 400 = bad request, 401 = unauthorized, 404 = not found, 429 = too many requests, 500 = server error. |
| **JWT** | JSON Web Token — an encrypted chunk of data (like a user ID) stored in a cookie to maintain a login session. |
| **ORM** | Object-Relational Mapper — a tool that lets you interact with a database using your programming language instead of raw SQL. |
| **Rate limiting** | Restricting how many requests a user can make in a given time period. |
| **Server Component** | A React component that runs on the server only. Can access the database directly. Faster because no JavaScript is sent to the browser. |
| **Serverless** | A cloud computing model where you don't manage servers. The cloud provider runs your code on demand and scales automatically. |
| **Session** | The concept of "being logged in." Maintained through a cookie that the server checks on each request. |
| **Slug** | The short code in a paste's URL (e.g., `xK3pQ` in `yoursite.com/xK3pQ`). |
| **SQL** | Structured Query Language — the language used to talk to relational databases. |
| **SSR** | Server-Side Rendering — generating the HTML on the server before sending it to the browser. |
| **Token** | A random string used for one-time actions (email verification, password reset). Usually sent in a URL. |
| **Tombstone** | A placeholder page shown for expired pastes. Shows the title and expiry date but not the content. |
| **Transaction** | A group of database operations that either ALL succeed or ALL fail. Prevents partial updates that could leave data in a broken state. |
| **XSS** | Cross-Site Scripting — an attack where malicious JavaScript is injected into a website. |

---

*End of Document*
