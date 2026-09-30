import { getEnv } from "@/lib/cloudflare";
import { transcodeAlbumImage } from "@/lib/album/images";
import { extensionForMime, sniffMedia } from "@/lib/album/sniff";

type TelegramOk = {
  ok: boolean;
  description?: string;
  result?: { file_path?: string; file_size?: number };
};

export type TelegramOutboundFile = {
  bytes: ArrayBuffer;
  filename: string;
  kind: "photo" | "document";
};

async function telegramForm(method: string, form: FormData) {
  const env = await getEnv();
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    body: form,
  });
  const data = (await response.json()) as TelegramOk;
  if (!data.ok) {
    console.error(`Telegram ${method} failed:`, data.description);
  }
  return data.ok;
}

export async function downloadTelegramFile(fileId: string): Promise<ArrayBuffer | null> {
  const env = await getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const metaResponse = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const meta = (await metaResponse.json()) as TelegramOk;
  const path = meta.result?.file_path;
  if (!meta.ok || !path) return null;
  if ((meta.result?.file_size ?? 0) > 20 * 1024 * 1024) return null;

  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
  if (!fileResponse.ok) return null;
  return fileResponse.arrayBuffer();
}

/** Telegram albums accept JPEG. Transcode when we can; otherwise send the file as a document. */
export async function prepareTelegramPhoto(
  bytes: ArrayBuffer,
  mime: string,
): Promise<TelegramOutboundFile> {
  const sniffed = sniffMedia(new Uint8Array(bytes));
  if (sniffed.kind === "image" && sniffed.mime === "image/jpeg") {
    return { bytes, filename: "photo.jpg", kind: "photo" };
  }
  if (mime === "image/jpeg") {
    return { bytes, filename: "photo.jpg", kind: "photo" };
  }

  const jpeg = await transcodeAlbumImage(bytes, {
    maxEdge: 2560,
    format: "image/jpeg",
    quality: 90,
  });
  if (jpeg) {
    return { bytes: jpeg.bytes, filename: "photo.jpg", kind: "photo" };
  }

  const ext = sniffed.kind === "image" ? extensionForMime(sniffed.mime) : "img";
  return { bytes, filename: `photo.${ext}`, kind: "document" };
}

export async function sendTelegramPhoto(
  chatId: number | string,
  file: TelegramOutboundFile,
  caption?: string,
) {
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("photo", new Blob([file.bytes], { type: "image/jpeg" }), file.filename);
  if (caption) {
    form.set("caption", caption);
    form.set("parse_mode", "HTML");
  }
  return telegramForm("sendPhoto", form);
}

export async function sendTelegramDocument(
  chatId: number | string,
  file: TelegramOutboundFile,
  caption?: string,
) {
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("document", new Blob([file.bytes], { type: "application/octet-stream" }), file.filename);
  if (caption) {
    form.set("caption", caption);
    form.set("parse_mode", "HTML");
  }
  return telegramForm("sendDocument", form);
}

export async function sendTelegramMediaGroup(
  chatId: number | string,
  files: TelegramOutboundFile[],
  caption?: string,
) {
  if (files.length < 2 || files.length > 10) return false;
  const media = files.map((file, index) => ({
    type: "photo" as const,
    media: `attach://photo${index}`,
    ...(index === 0 && caption ? { caption, parse_mode: "HTML" as const } : {}),
  }));

  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("media", JSON.stringify(media));
  files.forEach((file, index) => {
    form.set(`photo${index}`, new Blob([file.bytes], { type: "image/jpeg" }), file.filename);
  });
  return telegramForm("sendMediaGroup", form);
}

export async function sendTelegramPhotoBatch(
  chatId: number | string,
  files: TelegramOutboundFile[],
  caption?: string,
) {
  if (files.length === 0) return;

  const mixed = files.some((file) => file.kind === "document");
  if (mixed || files.length === 1) {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const note = index === 0 ? caption : undefined;
      if (file.kind === "photo") await sendTelegramPhoto(chatId, file, note);
      else await sendTelegramDocument(chatId, file, note);
    }
    return;
  }

  const sent = await sendTelegramMediaGroup(chatId, files, caption);
  if (sent) return;

  for (let index = 0; index < files.length; index += 1) {
    await sendTelegramPhoto(chatId, files[index]!, index === 0 ? caption : undefined);
  }
}
