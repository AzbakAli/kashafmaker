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
    stopAtErrors: false,
    password: "",
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
    stopAtErrors: false,
    password: "",
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
        const sharp = (await import("sharp")).default;
        const { width, height, rgba } = pixelsToRgba({
          data: img.data,
          width: img.width,
          height: img.height,
        });
        const buf = await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
          .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
          .grayscale()
          .normalize()
          .png()
          .toBuffer();
        if (buf.length > 0) images.push(buf);
      } catch {
        try {
          const { width, height, rgba } = pixelsToRgba({
            data: img.data,
            width: img.width,
            height: img.height,
          });
          const fallback = preprocessRgbaToPng(width, height, rgba);
          if (fallback.length > 0) images.push(fallback);
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
    const { PDFDocument, PDFName, PDFArray } = await import("pdf-lib");
    const sharp = (await import("sharp")).default;
    const { inflateSync } = await import("node:zlib");
    const doc = await PDFDocument.load(data, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
    const images: Buffer[] = [];
    const maxDimension = 2400;

    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (!(obj && "dict" in obj && obj.dict)) continue;

      const dict = (obj as unknown as {
        dict: { get: (name: unknown) => unknown };
      }).dict;

      const subtype = (dict.get(PDFName.of("Subtype")) as { toString: () => string } | undefined)?.toString();
      const contents = (obj as unknown as { contents?: Uint8Array }).contents;

      if (subtype !== "/Image" || !contents || contents.length < 200) continue;

      const w = Number((dict.get(PDFName.of("Width")) as { toString: () => string } | undefined)?.toString()) || 0;
      const h = Number((dict.get(PDFName.of("Height")) as { toString: () => string } | undefined)?.toString()) || 0;

      // Skip tiny icons/stamps/bullets under 80px — but allow images without declared dimensions
      if (w > 0 && h > 0 && (w < 80 || h < 80)) continue;

      // Resolve filter — can be a PDFName or a PDFArray of names
      const filterObj = dict.get(PDFName.of("Filter"));
      let filter = "";
      if (filterObj) {
        const filterStr = (filterObj as { toString: () => string }).toString();
        // If it's an array like [/ASCII85Decode /DCTDecode], grab the last meaningful filter
        if (filterStr.startsWith("[")) {
          // extract all filter names
          const parts = filterStr.replace(/[\[\]]/g, "").trim().split(/\s+/);
          filter = parts[parts.length - 1] || "";
        } else {
          filter = filterStr;
        }
      }

      try {
        // JPEG / DCTDecode
        if (
          filter === "/DCTDecode" ||
          filter === "DCTDecode" ||
          (!filter && contents.length > 2 && contents[0] === 0xff && contents[1] === 0xd8)
        ) {
          const buf = await sharp(Buffer.from(contents))
            .rotate()
            .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
            .grayscale()
            .normalize()
            .png()
            .toBuffer();
          if (buf.length > 0) images.push(buf);

        // JPEG2000 / JPXDecode — try sharp directly
        } else if (filter === "/JPXDecode" || filter === "JPXDecode") {
          const buf = await sharp(Buffer.from(contents))
            .rotate()
            .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
            .grayscale()
            .normalize()
            .png()
            .toBuffer();
          if (buf.length > 0) images.push(buf);

        // FlateDecode — zlib-compressed raw pixels
        } else if (filter === "/FlateDecode" || filter === "FlateDecode") {
          try {
            const uncompressed = inflateSync(Buffer.from(contents));
            if (w > 0 && h > 0 && uncompressed.length >= w * h) {
              const channels: 1 | 2 | 3 | 4 =
                uncompressed.length >= w * h * 4 ? 4 :
                uncompressed.length >= w * h * 3 ? 3 : 1;
              const raw = uncompressed.subarray(0, w * h * channels);
              const buf = await sharp(raw, { raw: { width: w, height: h, channels } })
                .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                .grayscale()
                .normalize()
                .png()
                .toBuffer();
              if (buf.length > 0) images.push(buf);
            } else {
              // might be PNG or another self-describing format after inflate
              const buf = await sharp(Buffer.from(uncompressed))
                .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                .grayscale()
                .normalize()
                .png()
                .toBuffer();
              if (buf.length > 0) images.push(buf);
            }
          } catch {
            // inflate failed — try as-is
            try {
              const buf = await sharp(Buffer.from(contents))
                .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                .grayscale()
                .normalize()
                .png()
                .toBuffer();
              if (buf.length > 0) images.push(buf);
            } catch { /* skip */ }
          }

        // CCITTFaxDecode or JBIG2Decode — fax/CCITT black-and-white scanned pages
        // These cannot be decoded natively without a decoder — try as raw pixels if dimensions known
        } else if (
          filter === "/CCITTFaxDecode" || filter === "CCITTFaxDecode" ||
          filter === "/JBIG2Decode" || filter === "JBIG2Decode"
        ) {
          // If we have dimensions, try treating as 1-bit / 8-bit grayscale
          if (w > 0 && h > 0) {
            try {
              // CCITT: 1 bit per pixel, packed bytes
              const expectedBytes1bpp = Math.ceil(w / 8) * h;
              const expectedBytes8bpp = w * h;
              if (contents.length >= expectedBytes1bpp && contents.length < expectedBytes8bpp * 2) {
                // expand 1bpp to 8bpp
                const out = new Uint8Array(w * h);
                for (let y = 0; y < h; y++) {
                  const rowBytes = Math.ceil(w / 8);
                  for (let x = 0; x < w; x++) {
                    const byteIdx = y * rowBytes + Math.floor(x / 8);
                    const bit = (contents[byteIdx] >> (7 - (x % 8))) & 1;
                    out[y * w + x] = bit ? 0 : 255; // CCITT: 1=black, 0=white
                  }
                }
                const buf = await sharp(Buffer.from(out), { raw: { width: w, height: h, channels: 1 } })
                  .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
                  .normalize()
                  .png()
                  .toBuffer();
                if (buf.length > 0) images.push(buf);
              }
            } catch { /* skip */ }
          }

        // Unknown or no filter — try sharp directly (may be PNG/TIFF/etc embedded)
        } else {
          try {
            const buf = await sharp(Buffer.from(contents))
              .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
              .grayscale()
              .normalize()
              .png()
              .toBuffer();
            if (buf.length > 0) images.push(buf);
          } catch { /* skip */ }
        }
      } catch {
        // Skip any image that fails entirely
      }

      if (images.length >= 3) break;
    }

    return images;
  } catch {
    return [];
  }
}
