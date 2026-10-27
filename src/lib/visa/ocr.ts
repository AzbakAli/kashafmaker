import type { LayoutToken } from "./types";
import { decodePngRgba, encodePng, rotateRgba } from "./image-utils";

type TesseractWord = {
  text?: string;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
};

type TesseractWorker = {
  recognize: (
    image: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ) => Promise<{ data: { text: string; words?: TesseractWord[]; confidence?: number } }>;
  detect: (image: Buffer | Uint8Array) => Promise<{ data: { orientation_degrees?: number } }>;
  terminate: () => Promise<void>;
};

const globalForOcr = globalThis as typeof globalThis & {
  kashafTesseractWorker?: Promise<TesseractWorker>;
};

export interface OcrPageResult {
  text: string;
  tokens: LayoutToken[];
  meanConfidence: number;
}

export async function ocrImageBuffer(image: Buffer): Promise<OcrPageResult> {
  const worker = await getWorker();
  const prepared = await prepareImage(worker, image);
  const recognized = await worker.recognize(prepared, { rotateAuto: true });
  const words = recognized.data.words || [];
  const tokens: LayoutToken[] = words
    .filter((word) => (word.text || "").trim())
    .map((word) => ({
      text: (word.text || "").trim(),
      x: word.bbox?.x0 ?? 0,
      y: word.bbox?.y0 ?? 0,
      width: Math.max(1, (word.bbox?.x1 ?? 0) - (word.bbox?.x0 ?? 0)),
      height: Math.max(1, (word.bbox?.y1 ?? 0) - (word.bbox?.y0 ?? 0)),
    }));

  return {
    text: recognized.data.text || tokens.map((t) => t.text).join(" "),
    tokens,
    meanConfidence: recognized.data.confidence ?? 0,
  };
}

export async function ocrImages(images: Buffer[]): Promise<OcrPageResult> {
  const pages: OcrPageResult[] = [];
  for (const image of images.slice(0, 2)) {
    pages.push(await ocrImageBuffer(image));
  }
  return {
    text: pages.map((p) => p.text).join("\n"),
    tokens: pages.flatMap((p, index) =>
      p.tokens.map((token) => ({ ...token, y: token.y + index * 2000 }))
    ),
    meanConfidence: pages.length
      ? pages.reduce((sum, page) => sum + page.meanConfidence, 0) / pages.length
      : 0,
  };
}

async function prepareImage(worker: TesseractWorker, image: Buffer) {
  try {
    const detected = await worker.detect(image);
    const degrees = normalizeRotation(detected.data.orientation_degrees);
    if (!degrees) return image;
    const decoded = decodePngRgba(image);
    if (!decoded) return image;
    const rotated = rotateRgba(decoded.width, decoded.height, decoded.rgba, degrees);
    return encodePng(rotated.width, rotated.height, rotated.rgba);
  } catch {
    return image;
  }
}

async function getWorker() {
  if (!globalForOcr.kashafTesseractWorker) {
    globalForOcr.kashafTesseractWorker = (async () => {
      const { createWorker } = await import("tesseract.js");
      const options = { langPath: process.cwd(), gzip: false, logger: () => undefined };
      try {
        return (await createWorker("eng+ara", 1, options)) as unknown as TesseractWorker;
      } catch {
        return (await createWorker("eng", 1, options)) as unknown as TesseractWorker;
      }
    })();
  }
  try {
    return await globalForOcr.kashafTesseractWorker;
  } catch (error) {
    globalForOcr.kashafTesseractWorker = undefined;
    throw error;
  }
}

function normalizeRotation(value?: number): 90 | 180 | 270 | null {
  if (!value) return null;
  const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) return normalized;
  return null;
}
