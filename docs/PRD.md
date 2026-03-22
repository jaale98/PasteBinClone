# Pastebin Clone — Product Requirements Document

**Status:** Draft | **Version:** 1.0 | **Date:** 2026-03-16 | **Author:** Jack

---

## 1. Overview

A lightweight pastebin service allowing any visitor to create and view plain-text pastes without an account. Registered users gain ownership capabilities including editing, deletion, expiry management, custom slugs, and version history. The product is intentionally minimal: no syntax highlighting, no public listing, no social features.

---

## 2. Goals & Non-Goals

### Goals

- Allow frictionless anonymous paste creation and viewing.
- Provide session-based ownership for anonymous users with a path to account claim.
- Give registered users full lifecycle control over their pastes.
- Keep the surface area small — ship a working core, not a feature platform.

### Non-Goals (v1)

- Syntax highlighting or rich text formatting.
- Public paste listing or global search.
- OAuth / social login.
- API access or developer keys.
- User profiles or paste dashboards beyond basic account functionality.
- Burn-after-read or custom datetime expiry.

---

## 3. Users & Authentication

### User Types

| User Type | Capabilities |
|---|---|
| Anonymous visitor | Create pastes, view pastes, edit/delete own pastes within same browser session, set expiry at creation time |
| Authenticated user | All anonymous capabilities plus: edit/delete any owned paste, change expiry post-creation, use custom slugs, change slugs, view and control version history visibility, claim anonymous pastes created in current session |

### Authentication

- Email and password only (v1).
- Standard flows: register, email verification, login, logout, password reset via email.
- Email verification required before login is permitted. On registration, a verification email is sent via Resend. Unverified accounts cannot authenticate.
- Sessions managed server-side with secure, HttpOnly cookies.

---

## 4. Anonymous Ownership & Paste Claiming

### Session-Based Ownership

When an anonymous user creates a paste, the server generates a cryptographically random claim token associated with that paste. The token is stored server-side and recorded in the user's session cookie. Within the same session, the user can edit or delete that paste. If the session expires or the cookie is cleared, the paste becomes permanently immutable to that user — no recovery mechanism.

### Claiming Pastes on Account Creation or Login

At account creation or login, the server inspects the active session for claim tokens. Any pastes associated with those tokens are transferred to the new or existing account. Transferred pastes become fully owned by the account and subject to all authenticated-user capabilities. Claim tokens are invalidated upon transfer.

Claim tokens remain redeemable for the lifetime of the session cookie. No separate claim expiry is tracked.

---

## 5. Paste Lifecycle

### Creation

- Available to all users, no account required.
- Required field: paste content (plain text, 512 KB hard cap — enforced server-side, error returned if exceeded).
- Optional fields at creation: title, expiry interval, custom slug (account required for custom slug).
- On submit, a short random slug is generated if no custom slug is provided.
- The paste URL is returned. For anonymous users, the claim token is written to the session.

### Viewing

- Any user with the URL can view any paste.
- All pastes are unlisted — not discoverable except by direct URL.
- Expired pastes render a tombstone page (paste title if set, expiry time, "This paste has expired" message). They do not 404.
- Version history visibility on a paste is controlled by the owner (see Section 7).

### Editing

- Requires session ownership (anonymous) or account ownership (authenticated).
- Edit UI and expiry management are a unified surface — the same edit form contains both the paste content and the expiry controls.
- Editing creates a new version entry (see Section 7).
- Custom slugs can be changed post-creation by authenticated owners. Changing a slug does not redirect the old URL — old URLs become dead.

### Deletion

- Requires session ownership or account ownership.
- Permanent. No soft delete or recovery.
- Deleted paste URL returns 404.

---

## 6. Expiry

### Options

| Option | Notes |
|---|---|
| Never (default) | Paste persists indefinitely until manually deleted |
| 10 minutes | |
| 1 hour | |
| 24 hours | |
| 7 days | |
| 30 days | |

### Rules

- Any user can set expiry at creation time.
- Changing or removing expiry after creation requires account ownership.
- Expiry is stored as an absolute UTC timestamp computed at paste creation or edit time.
- Expired pastes are not deleted — they render a tombstone. Cleanup (actual deletion) is a background job and is best-effort.

---

## 7. Version History

- Every edit creates a new version entry: timestamp, content snapshot, editor identity (anonymous session ID or user ID).
- Maximum of 10 versions retained per paste. When the 11th version is created, the oldest is dropped.
- Version history is read-only — individual versions cannot be restored, only viewed.
- Visibility is controlled by the paste owner:
  - **Public:** any visitor with the paste URL can view version history.
  - **Owner only:** only the owning account (or session, for anonymous pastes) can view history.
- Default visibility: owner only.
- Anonymous pastes with public history expose history to any visitor for the lifetime of the session, then become owner-only once ownership lapses (session expires with no claim).

---

## 8. Slugs & URLs

- Default: server-generated random short slug (e.g. `/xK3pQ`). Collision-resistant, URL-safe alphanumeric characters.
- Custom slugs: available to authenticated users at creation or post-creation edit. Alphanumeric and hyphens only, 3–50 characters, globally unique.
- Slug changes do not create redirects. Old URLs go dead immediately.
- Slug uniqueness is enforced at the database level.

---

## 9. Rate Limiting

| Rule | Anonymous Users | Authenticated Users |
|---|---|---|
| Paste creation | Lower threshold (TBD) | Higher threshold (TBD) |
| On limit breach | CAPTCHA challenge — request blocked until solved | CAPTCHA challenge — request blocked until solved |
| View requests | Not rate limited (v1) | Not rate limited (v1) |

Specific rate limit thresholds (requests per minute/hour) to be determined during technical design. Anonymous limits should be conservative enough to prevent trivial spam without degrading normal use.

---

## 10. UI Surfaces

### Home Page

A paste creation form. No recent pastes, no stats, no marketing copy beyond a minimal product name/description. The form is the product.

### Paste View Page

Paste content, title (if set), creation timestamp, expiry (if set). Owner controls (edit, delete) shown only to the owning session or account. Version history link shown if history is public or viewer is owner.

### Tombstone Page

Shown for expired pastes. Displays paste title (if set), expiry timestamp, and a clear "This paste has expired" message. Does not display content.

### Edit Page

Unified form: paste content editor + expiry selector + custom slug field (authenticated users) + version history visibility toggle (authenticated users). Accessible only to owning session or account.

### Auth Pages

Register, login, password reset. Standard flows. After login/registration, user is redirected to their prior context (e.g. the paste they were viewing, or home).

---

## 11. Open Questions & Deferred Decisions

| Item | Notes |
|---|---|
| Rate limit thresholds | Exact req/min or req/hr numbers deferred to technical design |
| CAPTCHA provider | Not selected — hCaptcha or Cloudflare Turnstile recommended over reCAPTCHA |
| Slug character set & length | Proposed: alphanumeric + hyphens, 3–50 chars. Needs confirmation. |
| Session cookie TTL | Determines claim window for anonymous users. Needs a value. |
| Tombstone cleanup job | Expired paste deletion is background/best-effort. Frequency TBD. |
| 512 KB cap applies to all users | Assumed uniform. Could differentiate by account status in future. |

---

*End of Document — v1.0 Draft*
