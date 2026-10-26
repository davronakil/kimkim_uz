# Security Policy

## Supported versions

Security fixes are accepted against the default branch (`main`) of this repository.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email the maintainer privately (GitHub profile contact for [@davronakil](https://github.com/davronakil)), or use GitHub’s private vulnerability reporting if enabled on the repository.

Include:

- Affected URL or API route
- Steps to reproduce (minimal)
- Impact assessment

We will acknowledge reports and coordinate a fix before any public disclosure.

## Hardening notes for operators

- Set `TELEGRAM_WEBHOOK_SECRET` and pass the same value as Telegram `setWebhook` `secret_token`
- Prefer `SUPERADMIN_TELEGRAM_IDS` (numeric Telegram user IDs) over the legacy username pin
- Keep `SESSION_SECRET` and `CRON_SECRET` long and random (≥32 characters)
- Restrict `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` by HTTP referrer in Google Cloud Console
- Never commit `.dev.vars`, Wrangler secrets, or bot tokens
