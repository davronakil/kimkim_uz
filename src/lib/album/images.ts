import { getEnv } from "@/lib/cloudflare";

type TranscodedImage = {
  bytes: ArrayBuffer;
  mime: string;
  width: number;
  height: number;
};

function streamFrom(bytes: ArrayBuffer) {
  return new Response(bytes).body;
}

/** Cloudflare Images binding, when the worker actually has it. Local dev often does not. */
export async function transcodeAlbumImage(
  bytes: ArrayBuffer,
  options: { maxEdge: number; format: "image/webp" | "image/jpeg"; quality: number },
): Promise<TranscodedImage | null> {
  try {
    const env = await getEnv();
    const images = env.IMAGES;
    if (!images?.input || !images.info) return null;

    const input = streamFrom(bytes);
    if (!input) return null;

    const result = await images
      .input(input)
      .transform({ width: options.maxEdge, fit: "scale-down" })
      .output({ format: options.format, quality: options.quality });

    const out = await new Response(result.image()).arrayBuffer();
    if (out.byteLength === 0) return null;

    let width = 0;
    let height = 0;
    const infoStream = streamFrom(out);
    if (infoStream) {
      try {
        const info = await images.info(infoStream);
        if ("width" in info) {
          width = info.width;
          height = info.height;
        }
      } catch {
        // Dimensions are optional; the bytes are still usable.
      }
    }

    return {
      bytes: out,
      mime: result.contentType() || options.format,
      width,
      height,
    };
  } catch (error) {
    console.error("Album image transcode failed:", error);
    return null;
  }
}

export async function readAlbumImageSize(bytes: ArrayBuffer) {
  try {
    const env = await getEnv();
    if (!env.IMAGES?.info) return null;
    const input = streamFrom(bytes);
    if (!input) return null;
    const info = await env.IMAGES.info(input);
    if (!("width" in info)) return null;
    return { width: info.width, height: info.height };
  } catch {
    return null;
  }
}
