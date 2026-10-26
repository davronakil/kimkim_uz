import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, imports = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: (name) => name in imports ? imports[name] : require(name),
    console, setTimeout, clearTimeout, AbortController, Response, ...globals,
  }, { filename: path });
  return exports;
}

test('network timeout aborts the request and does not wait indefinitely', async () => {
  const { fetchWithTimeout } = load('src/lib/fetch-with-timeout.ts', {}, {
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });
  await assert.rejects(fetchWithTimeout('/api/auth/me', {}, 10), /aborted/);
});

test('timeout also bounds a stalled response body', async () => {
  const { fetchWithTimeout } = load('src/lib/fetch-with-timeout.ts', {}, {
    fetch: async (_url, { signal }) => ({
      arrayBuffer: () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('body aborted')));
      }),
    }),
  });
  await assert.rejects(fetchWithTimeout('/api/auth/me', {}, 10), /body aborted/);
});

test('atomic user upsert keeps identity, saved language, chat, and photo', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE users (
    id TEXT PRIMARY KEY, telegram_id TEXT UNIQUE, username TEXT, first_name TEXT,
    last_name TEXT, photo_url TEXT, language_code TEXT, telegram_chat_id TEXT,
    updated_at TEXT DEFAULT (datetime('now')))`);
  let sequence = 0;
  const { upsertTelegramUser } = load('src/lib/auth/session.ts', {
    '@/lib/cloudflare': { getDb: async () => ({
      prepare: (sql) => ({ bind: (...values) => ({ first: async () => db.prepare(sql).get(...values) }) }),
    }) },
    '@/lib/locale': { resolveLocaleFromTelegramCode: (code) => code || 'uz' },
    'next/headers': {}, jose: {}, nanoid: { nanoid: () => `user-${++sequence}` },
  });
  const input = { telegram_id: '123', first_name: 'First', language_code: 'en' };
  const [first, second] = await Promise.all([upsertTelegramUser(input), upsertTelegramUser(input)]);
  assert.equal(first.id, second.id);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, 1);
  await upsertTelegramUser({ ...input, appLocale: 'ru', photo_url: 'photo' });
  db.prepare('UPDATE users SET telegram_chat_id = ?').run('123');
  const updated = await upsertTelegramUser({ ...input, first_name: 'Updated' });
  assert.equal(updated.id, first.id);
  assert.equal(updated.language_code, 'ru');
  assert.equal(updated.telegram_chat_id, '123');
  assert.equal(updated.photo_url, 'photo');
  assert.equal(updated.first_name, 'Updated');
  db.close();
});

function startup({ existing = false, ready = false, failFirst = false, brokenBridge = false, miniApp = true } = {}) {
  let effect, cleanup, calls = 0, refreshes = 0, readyCalls = 0, expandCalls = 0;
  const timers = new Map();
  let timerId = 0;
  const script = new EventTarget();
  script.remove = () => {};
  const win = new EventTarget();
  if (miniApp) win.TelegramWebviewProxy = {};
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  doc.querySelector = () => existing ? script : null;
  doc.createElement = () => { script.dataset = {}; return script; };
  doc.head = { appendChild: () => {} };
  const bridge = (kind) => () => {
    if (kind === 'ready') readyCalls++;
    if (kind === 'expand') expandCalls++;
    if (brokenBridge) throw new Error('unsupported');
  };
  const installSDK = () => {
    win.Telegram = {
      WebApp: { initData: 'signed-data', ready: bridge('ready'), expand: bridge('expand') },
    };
  };
  if (ready) installSDK();
  const { TelegramWebAppBootstrap } = load('src/components/auth/telegram-webapp-bootstrap.tsx', {
    '@/lib/pwa/telegram-webview': {
      telegramWebApp: () => win.Telegram?.WebApp,
      isTelegramMiniApp: () => typeof win.TelegramWebviewProxy !== 'undefined'
        || Boolean(win.Telegram?.WebApp?.initData),
    },
    react: { useEffect: (fn) => { effect = fn; } },
    '@/i18n/navigation': { useRouter: () => ({ refresh: () => { refreshes++; } }) },
    '@/lib/fetch-with-timeout': { fetchWithTimeout: async (url) => {
      calls++;
      if (failFirst && calls === 1) throw new Error('offline');
      return { ok: url !== '/api/auth/me', status: url === '/api/auth/me' ? 401 : 200 };
    } },
  }, {
    window: win, document: doc, Event,
    console: { warn: () => {} },
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  TelegramWebAppBootstrap();
  cleanup = effect();
  return {
    script, win, installSDK,
    get calls() { return calls; }, get refreshes() { return refreshes; },
    get readyCalls() { return readyCalls; }, get expandCalls() { return expandCalls; },
    retry: () => { for (const [id, t] of timers) if (t.ms === 1500) { timers.delete(id); t.fn(); break; } },
    cleanup: () => cleanup(),
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('startup waits for an existing SDK script instead of missing login', async () => {
  const app = startup({ existing: true });
  assert.equal(app.calls, 0);
  app.installSDK();
  app.script.dispatchEvent(new Event('load'));
  await flush();
  assert.equal(app.calls, 2);
  assert.equal(app.refreshes, 1);
  app.cleanup();
});

test('temporary login failure retries without reopening the app', async () => {
  const app = startup({ ready: true, failFirst: true });
  await flush();
  app.retry();
  await flush();
  assert.equal(app.calls, 3);
  assert.equal(app.refreshes, 1);
  app.cleanup();
});

test('unsupported client bridge methods do not prevent sign-in', async () => {
  const app = startup({ ready: true, brokenBridge: true });
  await flush();
  assert.equal(app.refreshes, 1);
  app.cleanup();
});

test('auto-login calls ready but never expand (avoids iOS Start race)', async () => {
  const app = startup({ ready: true });
  await flush();
  assert.equal(app.readyCalls, 1);
  assert.equal(app.expandCalls, 0);
  assert.equal(app.refreshes, 1);
  app.cleanup();
});

test('bootstrap stays idle outside a Mini App shell', async () => {
  const app = startup({ miniApp: false });
  await flush();
  assert.equal(app.calls, 0);
  app.cleanup();
});

test('unmount removes script listeners and prevents stale login', async () => {
  const app = startup({ existing: true });
  app.cleanup();
  app.installSDK();
  app.script.dispatchEvent(new Event('load'));
  await flush();
  assert.equal(app.calls, 0);
});

test('ensureCommandsMenuButton clears a default web_app menu button', async () => {
  const calls = [];
  const { ensureCommandsMenuButton } = load('src/lib/telegram/menu-button.ts', {
    '@/lib/cloudflare': { getEnv: async () => ({ TELEGRAM_BOT_TOKEN: 'token' }) },
    '@/lib/fetch-with-timeout': {
      fetchWithTimeout: async (url, init) => {
        const method = String(url).split('/').pop();
        calls.push({ method, body: JSON.parse(init.body || '{}') });
        if (method === 'getChatMenuButton') {
          return Response.json({
            ok: true,
            result: { type: 'web_app', text: 'Events', web_app: { url: 'https://kimkim.uz/uz/events' } },
          });
        }
        return Response.json({ ok: true, result: true });
      },
    },
  });
  const result = await ensureCommandsMenuButton();
  assert.equal(result.written, true);
  assert.equal(result.previous, 'web_app');
  assert.equal(calls.at(-1)?.method, 'setChatMenuButton');
  assert.deepEqual(calls.at(-1)?.body, { menu_button: { type: 'commands' } });
});

test('ensureCommandsMenuButton is a no-op when already commands', async () => {
  const methods = [];
  const { ensureCommandsMenuButton } = load('src/lib/telegram/menu-button.ts', {
    '@/lib/cloudflare': { getEnv: async () => ({ TELEGRAM_BOT_TOKEN: 'token' }) },
    '@/lib/fetch-with-timeout': {
      fetchWithTimeout: async (url) => {
        methods.push(String(url).split('/').pop());
        return Response.json({ ok: true, result: { type: 'commands' } });
      },
    },
  });
  const result = await ensureCommandsMenuButton();
  assert.equal(result.written, false);
  assert.deepEqual(methods, ['getChatMenuButton']);
});

test('/start resets an unfinished event flow and sends the welcome message', async () => {
  const path = 'src/lib/telegram/handler.ts';
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const imports = Object.fromEntries([...source.matchAll(/from "(@[^\"]+)"/g)].map((m) => [m[1], {}]));
  const actions = [];
  Object.assign(imports, {
    '@/lib/auth/session': { upsertTelegramUser: async () => ({ id: 'user' }) },
    '@/lib/auth/login-challenge': { parseLoginStartParam: () => null },
    '@/lib/telegram/chat': { linkTelegramChat: async () => {} },
    '@/lib/telegram/bot': {
      parseStartParam: () => null,
      buildAppUrl: (path) => `https://kimkim.uz${path}`,
      sendTelegramMessage: async (_chat, text) => actions.push(text),
    },
    '@/lib/telegram/flows/album': { parseAlbumStartParam: () => null },
    '@/lib/telegram/group': { isGroupChatType: () => false },
    '@/lib/telegram/locale': { parseJoinStartParam: () => null, resolveBotLocale: () => 'uz' },
    '@/lib/telegram/intents': load('src/lib/telegram/intents.ts'),
    '@/lib/telegram/i18n': { t: () => ({ welcome: 'Welcome' }) },
    '@/lib/telegram/sessions': {
      getBotSession: async () => ({ flow: 'create_event', step: 'title', locale: 'uz' }),
      clearBotSession: async () => actions.push('reset'),
    },
  });
  const { handleTelegramUpdate } = load(path, imports);
  await handleTelegramUpdate({
    update_id: 1, message: { from: { id: 123, first_name: 'First' }, chat: { id: 123, type: 'private' }, text: '/start' },
  });
  assert.deepEqual(actions, ['reset', 'Welcome']);
});

test('webhook allows retries for failed plain /start, without replaying expense writes', async () => {
  const webhookSecret = 'test-webhook-secret';
  const { POST } = load('src/app/api/telegram/webhook/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/cloudflare': { getEnv: async () => ({ TELEGRAM_WEBHOOK_SECRET: webhookSecret }) },
    '@/lib/security/timing-safe': {
      timingSafeEqualString: (a, b) => a === b,
    },
    '@/lib/telegram/register-commands': {},
    '@/lib/telegram/handler': { handleTelegramUpdate: async () => { throw new Error('temporary failure'); } },
  }, { console: { error: () => {} } });
  const send = (text, headers = {}) => POST({
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => ({
      update_id: 1, message: { from: { id: 123 }, chat: { id: 123, type: 'private' }, text },
    }),
  });
  assert.equal((await send('/start')).status, 401);
  const authHeaders = { 'x-telegram-bot-api-secret-token': webhookSecret };
  assert.equal((await send('/start', authHeaders)).status, 503);
  assert.equal((await send('/start@kimkimuzbot', authHeaders)).status, 503);
  assert.equal((await send('/expense', authHeaders)).status, 200);
  assert.equal((await send('/start album_example', authHeaders)).status, 200);
});
