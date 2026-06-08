import * as openNextWorker from "./.open-next/worker.js";

async function runReminders(env) {
  const secret = env.CRON_SECRET;
  if (!secret) return;

  const base = (env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(/\/$/, "");
  await fetch(`${base}/api/cron/event-reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

const worker = {
  fetch: openNextWorker.default.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
};

export default worker;
