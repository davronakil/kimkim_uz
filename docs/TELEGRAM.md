# Telegram integration

KimKim uses Telegram for auth, notifications, and a trilingual bot (`@kimkimuzbot`).

## Auth

| Method | Where | Notes |
|--------|-------|-------|
| Login via bot | `/login`, invite pages | “Continue in Telegram” opens `t.me/bot?start=login_…`. The bot confirms a one-time challenge; the original tab claims it, or `/login?verify=` waits for an extra tap so previews cannot spend it. |
| Mini App | Opened inside Telegram | `PUT /api/auth/telegram` with `initData` (auto, via `TelegramWebAppBootstrap`) |

The web app passes `app_locale` on login so the user's language matches the page URL (`/en`, `/uz`, `/ru`).

Sign-in no longer uses Telegram’s Login Widget (the button that asks for a phone number). The only web path is **Continue in Telegram**, which deep-links into `@kimkimuzbot`. After `/start login_<id>`, the bot replies with **Open KimKim**. That return URL is gated: nothing is spent until Continue is tapped. The originating browser tab also polls and finishes sign-in without a second click.

| Start param | Meaning |
|-------------|---------|
| `login_<id>` | Web sign-in challenge (`login_challenges`) |

## Webhook

- **URL:** `https://kimkim.uz/api/telegram/webhook`
- **Handler:** `src/lib/telegram/handler.ts`
- Set once: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://kimkim.uz/api/telegram/webhook`

All bot text goes out through `sendTelegramMessage` (`src/lib/telegram/bot.ts`), which disables
link previews. Bot replies carry their own buttons, so a preview card adds nothing but a remote
image fetch and an extra layout pass on the client. Pass `link_preview: true` if a message ever
needs one.

### Register bot commands

The hourly cron refreshes commands, and only calls `setMyCommands` for the scopes whose list
actually changed — every successful write invalidates the bot's cached info on every client.

To refresh manually (unconditional write):

```bash
npm run bot:commands
```

Requires `CRON_SECRET` in `.dev.vars` (same value as production Wrangler secret).

Commands deliberately do **not** register on `/start`. That path used to fire six sequential
`setMyCommands` calls on every start, making the bot's slowest webhook the very first tap a new
user makes.

## Bot commands (DM)

Available in **English**, **Oʻzbek**, and **Русский** (Telegram menu follows user language).

| Command | Description |
|---------|-------------|
| `/create` | Guided event flow: title → date → description → location |
| `/expense` | Log an expense (equal split among members) |
| `/events` | Upcoming events with links |
| `/album` | Add photos to an event, or receive everyone else's |
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

### Shared album

1. `/album` — pick an event (upcoming, or one from the last 120 days)
2. Send one or several photos, then `/done`
3. **Save others' photos** sends everyone else's pictures back into the chat

A deep link `t.me/<bot>?start=album_<eventId>` opens that event's album directly. In a linked group, `/album` shows the count and a button into the private chat. Video is not accepted yet.

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

Invite messages show **I'm coming** / **Can't make it** (locale-specific). Callbacks handled in `src/lib/telegram/callbacks.ts`; RSVPs stored in `event_rsvps`.

## Group commands (organizer only)

| Command | Description |
|---------|-------------|
| `/link INVITE_CODE` | Connect this group (or this forum topic) to an event |
| `/unlink` | Disconnect group |
| `/event` | Show linked event |
| `/album` | Album count and a private-chat link to add photos |

In groups with **topics** (forum groups), send `/link` inside the topic KimKim should use. The bot stores that topic’s `message_thread_id` and posts joins, schedule changes, and reminders there instead of General. Linking from General, or from a group without topics, keeps the previous whole-group behavior.

Re-linking from another topic overwrites the stored destination. If the topic is later deleted, posts fall back to the group (Telegram “message thread not found”).

Group announcements: member joins, schedule changes, reminders (24h / 1h). Reminder dedup uses `event_group_reminder_logs`.

## DM notifications

Sent when the user has started the bot (`telegram_chat_id` on `users`):

- New comment / reply
- New expense
- Photos added to the shared album
- Member joined
- Event updated (title, time, location, description)
- Reminders (24h and 1h before start)

Hourly cron: `GET /api/cron/event-reminders` with `Authorization: Bearer $CRON_SECRET`.

## Troubleshooting

### Telegram freezes when tapping START (reported on iPhone)

A bot cannot hang a Telegram client through the Bot API — there is no call that blocks the UI
thread — so a full app freeze that needs a force-quit is a client-side bug. What a bot *can* do is
hand the client an unusually heavy first frame, and the START tap is the worst moment for that: the
client is tearing down the intro screen, building the input bar and command panel, and rendering the
bot's first message all at once.

Everything on that path that we control has been trimmed:

| Was | Now |
|-----|-----|
| `/start` fired six sequential `setMyCommands` calls, each one invalidating cached bot info on every client mid-animation | commands refresh on the hourly cron, and only when the list changed |
| the welcome text contains `KimKim.uz`, which Telegram autolinks and previews — a card plus a 1200×630 generated image to fetch and lay out | previews disabled for all bot messages |
| a slow webhook let Telegram re-deliver `/start` and double the work | webhooks over 3s log a warning with the command and update id |

Checks that live in BotFather rather than this repo, worth ruling out next:

- **Bot intro picture/video** (`/setdescription` media). The intro video autoplays on the empty chat
  and is dismissed by the START tap; a clip with odd dimensions or an unusual codec is the single
  most common cause of this exact symptom. Removing it is the cheapest bisect.
- **Animated bot avatar** — same decoder, same risk.
- **Menu button** set to a Web App, which makes the client warm a webview alongside the START tap.

To confirm it is client-side, have the reporter try the same bot on Telegram for Android/desktop and
on an older iOS build. Reproducing only on one client family on one OS version, with the bot
answering normally in the logs, means it belongs in a [Telegram iOS issue](https://github.com/TelegramMessenger/Telegram-iOS/issues).

## Key files

```
src/lib/telegram/
├── handler.ts          # Webhook entry
├── callbacks.ts        # Inline buttons (RSVP, lang, expense picker)
├── flows/              # create-event, log-expense, list-events, album, group-messages
├── group.ts            # Group link + announcements
├── notifications.ts    # DM + reminder delivery
├── i18n.ts             # Bot strings (en / uz / ru)
└── sessions.ts         # bot_sessions for multi-step flows
```
