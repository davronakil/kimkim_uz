const WASM_URL = "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm";
const FONT_URL = "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-700-normal.woff";

let wasmReady: Promise<void> | null = null;
let fontData: Uint8Array | null = null;

async function loadResvg() {
  const { initWasm, Resvg } = await import("@resvg/resvg-wasm");
  return { initWasm, Resvg };
}

async function ensureWasm(initWasm: (module: Promise<ArrayBuffer>) => Promise<void>) {
  if (!wasmReady) {
    wasmReady = initWasm(
      fetch(WASM_URL).then((response) => {
        if (!response.ok) throw new Error("Failed to load resvg wasm");
        return response.arrayBuffer();
      }),
    );
  }
  await wasmReady;
}

async function ensureFont() {
  if (fontData) return fontData;
  const response = await fetch(FONT_URL);
  if (!response.ok) throw new Error("Failed to load Inter font");
  fontData = new Uint8Array(await response.arrayBuffer());
  return fontData;
}

export async function svgToPng(svg: string): Promise<Uint8Array | null> {
  try {
    const { initWasm, Resvg } = await loadResvg();
    await ensureWasm(initWasm);
    const font = await ensureFont();

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
      font: {
        fontBuffers: [font],
        defaultFontFamily: "Inter",
        sansSerifFamily: "Inter",
      },
    });

    const rendered = resvg.render();
    const png = rendered.asPng();
    rendered.free();
    resvg.free();
    return png;
  } catch (error) {
    console.error("resvg PNG conversion failed:", error);
    return null;
  }
}
