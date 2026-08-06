# Admin Authentication

JWT-based auth for all `/api/v1/delivery/*` admin routes.

## Default admin (after seed)

| Field | Value |
|-------|-------|
| Email | `admin@restaurant.com` |
| Password | `Admin@123` |

Override via `.env`:
```env
ADMIN_DEFAULT_EMAIL=admin@restaurant.com
ADMIN_DEFAULT_PASSWORD=Admin@123
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=24h
```

---

## Login

```
POST /api/v1/auth/login
```

```json
{
  "email": "admin@restaurant.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": "24h",
    "admin": {
      "id": "...",
      "full_name": "Restaurant Admin",
      "email": "admin@restaurant.com",
      "role": "admin"
    }
  }
}
```

---

## Use token on admin requests

Add header to all `/delivery/*` calls:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Get current admin

```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

---

## Change password (logged in)

```
POST /api/v1/auth/change-password
Authorization: Bearer <token>
```

```json
{
  "current_password": "Admin@123",
  "new_password": "MyNewSecurePass1"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

---

## Forgot password

```
POST /api/v1/auth/forgot-password
```

```json
{
  "email": "admin@restaurant.com"
}
```

Always returns the same message (does not reveal if email exists):

```json
{
  "success": true,
  "data": {
    "message": "If an account exists for this email, a password reset link has been sent.",
    "expires_in_minutes": 30,
    "email_sent": true
  }
}
```

When email is configured (`EMAIL_ENABLED=true`), the reset link is emailed — **token is never returned**.

In development without email, `reset_token` may be included if `EMAIL_DEV_RETURN_TOKEN=true`.

See [email-setup.md](./email-setup.md) for SendGrid/SMTP configuration.

---

## Reset password (with token from forgot-password)

```
POST /api/v1/auth/reset-password
```

```json
{
  "token": "abc123...",
  "new_password": "MyNewSecurePass1"
}
```

Token expires after **30 minutes**.

**Response:**
```json
{
  "success": true,
  "data": { "message": "Password reset successfully" }
}
```

---

## Protected routes

All routes under `/api/v1/delivery/*` require a valid token:

- Dashboard, orders, status updates, rider assign, menu availability

**Public (no auth):**
- `/api/v1/storefront/*` — customer app
- `/api/v1/track/*` — order tracking
- `/api/v1/auth/login`
- `/api/v1/health`

---

## Errors

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired token |
| `FORBIDDEN` | 403 | Account disabled |

---

## Frontend integration

```js
// Login
const { data } = await axios.post('/api/v1/auth/login', { email, password });
localStorage.setItem('admin_token', data.data.token);

// Authenticated requests
axios.defaults.headers.common.Authorization = `Bearer ${localStorage.getItem('admin_token')}`;
```
