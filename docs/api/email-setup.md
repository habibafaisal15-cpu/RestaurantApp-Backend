# Email Setup (Password Reset)

Password reset emails are sent when `EMAIL_ENABLED=true` and SMTP credentials are configured.

## SendGrid (recommended)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Create an API key with **Mail Send** permission
3. Verify a sender email/domain in SendGrid
4. Add to `backend/.env`:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key_here
EMAIL_FROM=Restaurant Admin <noreply@yourdomain.com>
ADMIN_FRONTEND_URL=https://admin.yourdomain.com
```

## Gmail SMTP (testing only)

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Restaurant Admin <your@gmail.com>
ADMIN_FRONTEND_URL=http://localhost:5174
```

Use a [Google App Password](https://myaccount.google.com/apppasswords), not your regular password.

## Generic SMTP

Works with Mailgun, AWS SES SMTP, Outlook, etc. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` accordingly.

---

## Behaviour

| Environment | Email configured | API response |
|-------------|------------------|--------------|
| Production | Yes | Email sent with reset link — **no token in response** |
| Production | No | Generic message only — token never returned |
| Development | Yes | Email sent — no token in response |
| Development | No | Token returned if `EMAIL_DEV_RETURN_TOKEN=true` (default) |

---

## Reset link format

Email contains a link to your admin frontend:

```
{ADMIN_FRONTEND_URL}/reset-password?token={reset_token}
```

Frontend should read `token` from the URL and call:

```
POST /api/v1/auth/reset-password
{ "token": "...", "new_password": "..." }
```

---

## Test

```bash
POST /api/v1/auth/forgot-password
{ "email": "admin@restaurant.com" }
```

Check response for `"email_sent": true` and the admin inbox for the reset email.
