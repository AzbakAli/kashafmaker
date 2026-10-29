import type { LayoutToken } from "./types";
import { decodePngRgba, encodePng, contrastRgba, downscaleRgba } from "./image-utils";

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
  terminate: () => Promise<void>;
  setParameters?: (params: Record<string, unknown>) => Promise<void>;
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
  const prepared = await prepareImage(image);
  const recognized = await worker.recognize(prepared);
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

async function prepareImage(image: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(image)
      .rotate() // Automatically autorotates phone camera photos based on EXIF
      .flatten({ background: "#ffffff" }) // Ensure transparent backgrounds become pure white
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .png()
      .toBuffer();
  } catch {
    try {
      const decoded = decodePngRgba(image);
      if (!decoded) return image;
      const downscaled = downscaleRgba(decoded.width, decoded.height, decoded.rgba, 2200);
      const contrasted = contrastRgba(downscaled.rgba, 1.25);
      return encodePng(downscaled.width, downscaled.height, contrasted);
    } catch {
      return image;
    }
  }
}

async function getWorker(): Promise<TesseractWorker> {
  if (!globalForOcr.kashafTesseractWorker) {
    globalForOcr.kashafTesseractWorker = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const options = { langPath: process.cwd(), gzip: false, logger: () => undefined };
      let worker: any;
      try {
        worker = await createWorker("eng+ara", 1, options);
      } catch {
        worker = await createWorker("eng", 1, options);
      }
      try {
        if (worker.setParameters) {
          await worker.setParameters({
            tessedit_pageseg_mode: PSM?.AUTO ?? 3,
            preserve_interword_spaces: "1",
          });
        }
      } catch {
        // Continue with default parameters if setParameters fails
      }
      return worker as TesseractWorker;
    })();
  }
  try {
    return await globalForOcr.kashafTesseractWorker;
  } catch (error) {
    globalForOcr.kashafTesseractWorker = undefined;
    throw error;
  }
}
