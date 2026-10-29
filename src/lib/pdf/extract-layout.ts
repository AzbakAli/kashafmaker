import { loadPdfJs } from "./extract-text";
import type { LayoutToken } from "@/lib/visa/types";
import { encodePng, pixelsToRgba, preprocessRgbaToPng } from "@/lib/visa/image-utils";

type PdfImage = {
  data?: Uint8Array;
  width?: number;
  height?: number;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{
    items: Array<{ str?: string; transform?: number[]; width?: number; height?: number }>;
  }>;
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>;
  objs: { get: (name: string, callback: (value: unknown) => void) => void; has?: (name: string) => boolean };
  commonObjs?: { get: (name: string, callback: (value: unknown) => void) => void; has?: (name: string) => boolean };
};

export interface PdfLayout {
  text: string;
  tokens: LayoutToken[];
  pageCount: number;
}

export async function extractPdfLayout(data: Uint8Array): Promise<PdfLayout> {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    useWorkerFetch: false,
  }).promise;

  const tokens: LayoutToken[] = [];
  const pages: string[] = [];
  const maxPages = Math.min(pdf.numPages, 3);

  for (let i = 1; i <= maxPages; i++) {
    const page = (await pdf.getPage(i)) as PdfPage;
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const pageTokens: LayoutToken[] = [];
    for (const item of content.items) {
      const text = (item.str || "").trim();
      if (!text || !item.transform) continue;
      pageTokens.push({
        text,
        x: item.transform[4],
        y: viewport.height - item.transform[5] + (i - 1) * (viewport.height + 40),
        width: item.width || Math.abs(item.transform[0]) || 8,
        height: item.height || Math.abs(item.transform[3]) || 10,
      });
    }
    tokens.push(...pageTokens);
    pages.push(pageTokens.map((token) => token.text).join(" "));
  }

  return {
    text: pages.join("\n"),
    tokens,
    pageCount: pdf.numPages,
  };
}

export async function extractPdfEmbeddedImages(data: Uint8Array): Promise<Buffer[]> {
  // 1. Direct PDF stream extraction via pdf-lib & sharp (instant, catches 99% of scanned PDFs)
  const directImages = await extractDirectPdfImages(data);
  if (directImages.length > 0) {
    return directImages;
  }

  // 2. Fallback to PDF.js operator list
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    useWorkerFetch: false,
  }).promise;

  const images: Buffer[] = [];
  const maxPages = Math.min(pdf.numPages, 2);

  for (let i = 1; i <= maxPages; i++) {
    const page = (await pdf.getPage(i)) as PdfPage;
    const ops = await page.getOperatorList();
    const names = new Set<string>();
    for (let n = 0; n < ops.fnArray.length; n++) {
      const fn = ops.fnArray[n];
      // pdf.js OPS: paintXObject (66), paintJpegXObject (82), paintImageMaskXObject (83), paintImageXObject (85), paintInlineImageXObject (86), etc.
      if ((fn === 66 || (fn >= 81 && fn <= 89)) && Array.isArray(ops.argsArray[n])) {
        const arg0 = (ops.argsArray[n] as unknown[])[0];
        if (arg0) names.add(String(arg0));
      }
    }
    for (const name of names) {
      const img = (await getObject(page, name)) as PdfImage | undefined;
      if (!img?.data || !img.width || !img.height) continue;
      if (img.width < 80 || img.height < 80) continue;
      try {
        const { width, height, rgba } = pixelsToRgba({
          data: img.data,
          width: img.width,
          height: img.height,
        });
        images.push(preprocessRgbaToPng(width, height, rgba));
      } catch {
        try {
          images.push(encodePng(img.width, img.height, pixelsToRgba({
            data: img.data,
            width: img.width,
            height: img.height,
          }).rgba));
        } catch {
          // Skip undecodable embedded images.
        }
      }
      if (images.length >= 2) return images;
    }
  }

  return images;
}

async function getObject(page: PdfPage, name: string): Promise<unknown> {
  const fromObjs = await new Promise<unknown>((resolve) => {
    const timer = setTimeout(() => resolve(undefined), 800);
    try {
      page.objs.get(name, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
    } catch {
      clearTimeout(timer);
      resolve(undefined);
    }
  });

  if (fromObjs) return fromObjs;

  if (page.commonObjs?.get) {
    return new Promise<unknown>((resolve) => {
      const timer = setTimeout(() => resolve(undefined), 800);
      try {
        page.commonObjs!.get(name, (value) => {
          clearTimeout(timer);
          resolve(value);
        });
      } catch {
        clearTimeout(timer);
        resolve(undefined);
      }
    });
  }

  return undefined;
}

async function extractDirectPdfImages(data: Uint8Array): Promise<Buffer[]> {
  try {
    const { PDFDocument, PDFName } = await import("pdf-lib");
    const sharp = (await import("sharp")).default;
    const doc = await PDFDocument.load(data, { ignoreEncryption: true });
    const images: Buffer[] = [];
    const maxDimension = 2200;

    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (obj && "dict" in obj && obj.dict) {
        const dict = (obj as unknown as { dict: { get: (name: unknown) => { toString: () => string } | undefined } }).dict;
        const subtype = dict.get(PDFName.of("Subtype"))?.toString();
        const contents = (obj as unknown as { contents?: Uint8Array }).contents;

        if (subtype === "/Image" && contents && contents.length > 500) {
          const filter = dict.get(PDFName.of("Filter"))?.toString();
          const w = Number(dict.get(PDFName.of("Width"))?.toString()) || 0;
          const h = Number(dict.get(PDFName.of("Height"))?.toString()) || 0;

          // Skip tiny icons, stamps, or bullets (< 100px)
          if (w > 0 && h > 0 && (w < 100 || h < 100)) continue;

          try {
            if (filter === "/DCTDecode" || (!filter && contents[0] === 0xff && contents[1] === 0xd8)) {
              // Direct JPEG stream!
              const buf = await sharp(Buffer.from(contents))
                .rotate()
                .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                .grayscale()
                .normalize()
                .png()
                .toBuffer();
              images.push(buf);
            } else if (filter === "/FlateDecode") {
              const { inflateSync } = await import("node:zlib");
              try {
                const uncompressed = inflateSync(Buffer.from(contents));
                if (w > 0 && h > 0) {
                  const channels = uncompressed.length >= w * h * 4 ? 4 : uncompressed.length >= w * h * 3 ? 3 : 1;
                  const buf = await sharp(uncompressed.subarray(0, w * h * channels), {
                    raw: { width: w, height: h, channels },
                  })
                    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                    .grayscale()
                    .normalize()
                    .png()
                    .toBuffer();
                  images.push(buf);
                }
              } catch {
                const buf = await sharp(Buffer.from(contents))
                  .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                  .grayscale()
                  .normalize()
                  .png()
                  .toBuffer();
                images.push(buf);
              }
            } else {
              const buf = await sharp(Buffer.from(contents))
                .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                .grayscale()
                .normalize()
                .png()
                .toBuffer();
              images.push(buf);
            }
          } catch {
            // Skip undecodable stream
          }

          if (images.length >= 2) return images;
        }
      }
    }

    return images;
  } catch {
    return [];
  }
}
