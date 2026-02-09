# Authentication System

## Overview

Cookie-based auth designed to prevent XSS. Auth tokens live **exclusively** in HttpOnly cookies — JavaScript never touches them.

```
┌─────────────────────────────────────────────────────────┐
│                   STORAGE STRATEGY                      │
├────────────────────┬────────────────────────────────────┤
│  HttpOnly Cookies  │  accessToken (JWT, 15m)            │
│  (backend-managed) │  refreshToken (7d, rotated)        │
│                    │  → httpOnly + sameSite + secure     │
│                    │  → JS cannot read/steal these      │
├────────────────────┼────────────────────────────────────┤
│  localStorage      │  userName, userEmail,              │
│  (client-managed)  │  userRole, userProfilePic          │
│                    │  → UI display only, validated by   │
│                    │    /auth/me on every page load     │
├────────────────────┼────────────────────────────────────┤
│  Non-HttpOnly      │  userRole (duplicate)              │
│  Cookie            │  → Next.js SSR route guard         │
└────────────────────┴────────────────────────────────────┘
```

---

## Login Flow

```
 Browser                                    Backend
 ───┬───                                    ───┬───
    │                                          │
    │  POST /api/auth/admin/login              │
    │  { email, password, device_id }          │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  Validate credentials + check ADMIN role │
    │                                          │
    │  Generate JWT accessToken (15m)          │
    │  Generate refreshToken (7d)              │
    │  Hash refreshToken → store in DB         │
    │                                          │
    │  Response body: { access_token, user }   │
    │  Set-Cookie: accessToken  (HttpOnly)     │
    │  Set-Cookie: refreshToken (HttpOnly)     │
    │ ◄─────────────────────────────────────── │
    │                                          │
    │  Client-side:                            │
    │    localStorage ← userName, userEmail,   │
    │                    userRole, profilePic  │
    │    cookie ← userRole (for SSR guard)     │
    │    redirect → /dashboard                 │
    ▼                                          ▼
```

---

## How Requests Are Authenticated

```
 Browser                                    Backend
 ───┬───                                    ───┬───
    │                                          │
    │  GET /api/admin/users                    │
    │  Cookie: accessToken=<jwt> (auto)        │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  JWT Strategy extracts token from:       │
    │    1. Authorization header (mobile app)  │
    │    2. accessToken cookie  (admin CMS) ✓  │
    │                                          │
    │  Verify JWT signature + expiry           │
    │  Load user from DB via userId in JWT     │
    │                                          │
    │  200 OK                                  │
    │ ◄─────────────────────────────────────── │
    ▼                                          ▼
```

- `withCredentials: true` on axios → browser auto-attaches HttpOnly cookies
- JS never reads/attaches the token → **immune to XSS**

---

## Refresh Token: How It Works

### Token Rotation + Reuse Detection

Every refresh **rotates** the token and tracks a `token_family`:

```
Login     → RT-1 issued (family: F1, active)
Refresh 1 → RT-1 revoked, RT-2 issued (family: F1)
Refresh 2 → RT-2 revoked, RT-3 issued (family: F1)

⚠️ Attacker replays stolen RT-1:
   → RT-1 is already revoked
   → REUSE DETECTED
   → ALL tokens in family F1 revoked
   → User must re-login
```

### Refresh Flow (accessToken expired)

```
 Browser                                    Backend
 ───┬───                                    ───┬───
    │                                          │
    │  API request → 401 (accessToken expired) │
    │ ◄─────────────────────────────────────── │
    │                                          │
    │  Axios interceptor catches 401           │
    │  Queues all pending requests             │
    │                                          │
    │  POST /api/auth/refresh                  │
    │  Cookie: refreshToken=RT-1 (auto)        │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  Backend:                                │
    │    1. Hash RT-1, look up in DB           │
    │    2. Verify not revoked + not expired   │
    │    3. Revoke RT-1                        │
    │    4. Generate new AT-2 + RT-2           │
    │    5. Store RT-2 (same token_family)     │
    │                                          │
    │  Set-Cookie: accessToken=AT-2 (HttpOnly) │
    │  Set-Cookie: refreshToken=RT-2 (HttpOnly)│
    │ ◄─────────────────────────────────────── │
    │                                          │
    │  Retry failed request + all queued ones  │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  200 OK (success)                        │
    │ ◄─────────────────────────────────────── │
    ▼                                          ▼
```

### Force Logout (refreshToken expired/revoked)

```
 Browser                                    Backend
 ───┬───                                    ───┬───
    │                                          │
    │  POST /api/auth/refresh                  │
    │  Cookie: refreshToken=<expired>          │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  401 Unauthorized                        │
    │ ◄─────────────────────────────────────── │
    │                                          │
    │  forceLogout():                          │
    │    Clear localStorage                    │
    │    Clear userRole cookie                 │
    │    window.location → /login              │
    ▼                                          ▼
```

**User is force-logged out whenever the refreshToken expires (default 7 days) or is revoked.**

---

## Page Load: Session Validation

On every protected page load, the auth store validates the session:

```
 Browser                                    Backend
 ───┬───                                    ───┬───
    │                                          │
    │  Page loads → ProtectedShell mounts      │
    │  hydrate() reads localStorage            │
    │  (userName, userRole → render UI fast)    │
    │                                          │
    │  validateSession() → GET /api/auth/me    │
    │  Cookie: accessToken=<jwt> (auto)        │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  ┌─── accessToken valid ────────────┐    │
    │  │  200 OK { name, email, role, … } │    │
    │  │  Update store from backend data  │    │
    │  │  User continues normally         │    │
    │  └──────────────────────────────────┘    │
    │                                          │
    │  ┌─── accessToken expired ──────────┐    │
    │  │  401 → interceptor refreshes     │    │
    │  │  New cookies set → retry getMe   │    │
    │  │  200 OK → user continues         │    │
    │  └──────────────────────────────────┘    │
    │                                          │
    │  ┌─── both tokens expired ──────────┐    │
    │  │  401 → refresh fails → 401       │    │
    │  │  forceLogout() → redirect /login │    │
    │  └──────────────────────────────────┘    │
    ▼                                          ▼
```

---

## SSR Route Protection (Server-Side)

Next.js server layout protects routes **before** any HTML is sent:

```
 Browser                          Next.js Server
 ───┬───                          ──────┬───────
    │                                   │
    │  GET /dashboard                   │
    │  Cookie: userRole, accessToken    │
    │ ────────────────────────────────► │
    │                                   │
    │  getServerAuth() checks:          │
    │    ✓ userRole === ADMIN?          │
    │    ✓ accessToken cookie exists?   │
    │                                   │
    │  Both? → Render dashboard         │
    │  No?   → 307 Redirect → /login   │
    │                                   │
    │  SSR fetches (dashboard data):    │
    │  Forward all cookies to backend   │
    │  → accessToken (path=/) included  │
    │  → Backend validates JWT          │
    │  → Returns analytics data         │
    ▼                                   ▼
```

**Why `accessToken` path is `/` (not `/api`):**
The accessToken cookie needs `path: '/'` so the browser sends it to **both**:
- `localhost:3001/api/*` — backend API calls
- `localhost:3000/dashboard` — Next.js SSR, which forwards it to backend

If path were `/api`, the browser wouldn't send it to the Next.js server, and all SSR data fetches would fail with 401.

---

## Logout

```
 Browser                                    Backend
 ───┬───                                    ───┬───
    │                                          │
    │  POST /api/auth/logout                   │
    │  Cookie: accessToken=<jwt>               │
    │ ───────────────────────────────────────►  │
    │                                          │
    │  Delete ALL refresh tokens for user      │
    │  Log audit event                         │
    │  Set-Cookie: accessToken=; Max-Age=0     │
    │  Set-Cookie: refreshToken=; Max-Age=0    │
    │                                          │
    │  200 OK                                  │
    │ ◄─────────────────────────────────────── │
    │                                          │
    │  Clear localStorage                      │
    │  Clear userRole cookie                   │
    │  Redirect → /login                       │
    ▼                                          ▼
```

---

## Cookie Configuration

| Cookie | HttpOnly | SameSite | Path | Max-Age | Purpose |
|--------|----------|----------|------|---------|---------|
| `accessToken` | ✅ Yes | Strict/Lax | `/` | ~15m (JWT_EXPIRES_IN) | Auth for all API requests + SSR forwarding |
| `refreshToken` | ✅ Yes | Strict/Lax | `/` | ~7d (REFRESH_TOKEN_EXPIRES_IN) | Token refresh + SSR auth checks |
| `userRole` | ❌ No | Lax | `/` | 7d | SSR route guard |

---

## Security Summary

| Threat | Mitigation |
|--------|-----------|
| XSS steals tokens | HttpOnly cookies — JS cannot access |
| Manual `localStorage.setItem('userRole', 'ADMIN')` | `/auth/me` validation fails without valid accessToken cookie |
| CSRF | `SameSite=Strict` (prod) on all auth cookies |
| Stolen refresh token replay | Token rotation + reuse detection → revoke entire family |
| Session expires | Auto-refresh via interceptor; forceLogout if refresh fails |
| User away > 7 days | refreshToken expired → forceLogout on next page load |

---

## Key Files

| File | What it does |
|------|-------------|
| `backend/src/auth/auth.controller.ts` | Sets/clears HttpOnly cookies, login/refresh/logout endpoints |
| `backend/src/auth/auth.service.ts` | JWT generation, refresh token rotation, reuse detection |
| `backend/src/auth/strategies/jwt.strategy.ts` | Extracts JWT from cookie OR Authorization header |
| `admin-cms/services/api.ts` | Axios with `withCredentials: true`, 401 interceptor, refresh + forceLogout |
| `admin-cms/lib/store.ts` | Zustand auth store — hydrate, validateSession via /auth/me |
| `admin-cms/lib/server-auth.ts` | SSR route guard — checks userRole + accessToken cookies |
| `admin-cms/app/(protected)/layout.tsx` | Server layout — redirects unauthenticated to /login |
| `admin-cms/app/(protected)/dashboard/page.tsx` | SSR data fetching — forwards cookies to backend |
