import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "@/types";

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as CloudflareEnv;
}

export async function getDb(): Promise<D1Database> {
  const env = await getEnv();
  return env.DB;
}

export async function getMediaBucket(): Promise<R2Bucket> {
  const env = await getEnv();
  return env.MEDIA;
}

export async function runInBackground(task: Promise<unknown>) {
  try {
    const { ctx } = await getCloudflareContext({ async: true });
    ctx.waitUntil(task);
  } catch {
    void task.catch((error) => console.error("Background task failed:", error));
  }
}
