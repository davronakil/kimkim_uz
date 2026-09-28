# Telegram integration

KimKim uses Telegram for auth, notifications, and a trilingual bot (`@kimkimuzbot`).

## Auth

| Method | Where | Notes |
|--------|-------|-------|
| Continue in Telegram | `/login`, invite pages | Opens `t.me/bot?start=login_…`. The bot confirms a one-time `login_challenges` row; the original tab polls and claims it. If the user lands on `/login?verify=`, they tap Continue so previews cannot spend the challenge. |
| Mini App | Opened inside Telegram | `PUT /api/auth/telegram` with `initData` (auto, via `TelegramWebAppBootstrap`) |

The web app passes `app_locale` on login so the user's language matches the page URL (`/uz`, `/en`, `/ru`).

There is no Telegram Login Widget (the phone-number iframe). Web sign-in is the bot deep link only.

| Start param | Meaning |
|-------------|---------|
| `login_<id>` | Web sign-in challenge (`login_challenges`) |
| `join_CODE` / `{locale}_join_CODE` | Invite join |
| `{locale}_join_CODE_ref_USER` | Invite join with referrer |

## Webhook

- **URL:** `https://kimkim.uz/api/telegram/webhook`
- **Handler:** `src/lib/telegram/handler.ts`
- Set once: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://kimkim.uz/api/telegram/webhook`

### Register bot commands

Commands auto-register on `/start`. To refresh manually:

```bash
npm run bot:commands
```

Requires `CRON_SECRET` in `.dev.vars` matching the production Wrangler secret.

## Bot commands (DM)

Available in **English**, **Oʻzbek**, and **Русский** (Telegram menu follows user language).

| Command | Description |
|---------|-------------|
| `/create` | Guided event flow: title → date → description → location |
| `/expense` | Log an expense (equal split among members) |
| `/events` | Upcoming events with links |
| `/help` | Command reference |
| `/cancel` | Stop current flow |
| `/lang en` / `/lang uz` / `/lang ru` | Set language (or use inline picker on `/start`) |

Natural phrases also work: `create event`, `event yarat`, `xarajat qo'sh`, etc.

### Create flow

1. Title (min 2 chars)
2. Date/time — `tomorrow 19:00`, `ertaga 19:00`, `завтра 19:00`, `15.06.2026 19:00`
3. Description — or `skip`
4. Location — place name, Telegram location pin, or `skip`

### Expense flow

1. `/expense` — picks event if you're in several
2. Send `AMOUNT description` — e.g. `150000 choyxona`

### Invite deep links

| Link pattern | Language |
|--------------|----------|
| `t.me/bot?start=join_CODE` | From Telegram profile / saved preference |
| `t.me/bot?start=en_join_CODE` | English |
| `t.me/bot?start=uz_join_CODE` | Uzbek |
| `t.me/bot?start=ru_join_CODE` | Russian |
| `t.me/bot?start=en_join_CODE_ref_USER` | English with invite referrer tracking |

The web invite panel generates locale-prefixed links automatically and includes a referrer id for attribution.

### RSVP inline buttons

Invite messages show **I'm coming** / **Maybe** / **Can't make it** (locale-specific). Callbacks in `src/lib/telegram/callbacks.ts`; rows in `event_rsvps` (`going` / `maybe` / `declined`). Extra guests are set on the web RSVP panel (`additional_guest_count`).

## Group commands (organizer only)

| Command | Description |
|---------|-------------|
| `/link INVITE_CODE` | Connect this group (or this forum topic) to an event |
| `/unlink` | Disconnect group |
| `/event` | Show linked event |

In groups with **topics** (forum groups), send `/link` inside the topic KimKim should use. The bot stores that topic’s `message_thread_id` and posts joins, schedule changes, and reminders there instead of General. Linking from General, or from a group without topics, keeps whole-group behavior.

Re-linking from another topic overwrites the stored destination. If the topic is later deleted, posts fall back to the group (Telegram “message thread not found”).

Group announcements: member joins, schedule changes, reminders (24h / 1h). Reminder dedup uses `event_group_reminder_logs`.

## DM notifications

Sent when the user has started the bot (`telegram_chat_id` on `users`):

- New comment / reply
- New expense
- Member joined
- Event updated (title, time, location, description)
- Reminders (24h and 1h before start)

Hourly cron: `GET /api/cron/event-reminders` with `Authorization: Bearer $CRON_SECRET`.

## Key files

```
src/lib/auth/
├── login-challenge.ts  # Web sign-in via t.me/bot?start=login_…
└── session.ts          # JWT cookie sessions

src/lib/telegram/
├── handler.ts          # Webhook entry
├── bot.ts              # sendMessage (includes forum message_thread_id)
├── callbacks.ts        # Inline buttons (RSVP, lang, expense picker)
├── register-commands.ts
├── flows/              # create-event, log-expense, list-events, group-messages
├── group.ts            # Group / topic link + announcements
├── notifications.ts    # DM + reminder delivery
├── i18n.ts             # Bot strings (en / uz / ru)
└── sessions.ts         # bot_sessions for multi-step flows
```
