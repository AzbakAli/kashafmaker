import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pathToFileURL } from "url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

function crc32(buf: Buffer) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width: number, height: number, rgba: Uint8Array) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function toRgba(img: { data: Uint8Array; width: number; height: number; kind?: number }) {
  const { width, height, data } = img;
  const rgba = new Uint8Array(width * height * 4);
  const bpp = data.length / (width * height);
  for (let i = 0, j = 0; i < width * height; i++) {
    if (bpp === 4) {
      rgba[j++] = data[i * 4];
      rgba[j++] = data[i * 4 + 1];
      rgba[j++] = data[i * 4 + 2];
      rgba[j++] = data[i * 4 + 3];
    } else if (bpp === 3) {
      rgba[j++] = data[i * 3];
      rgba[j++] = data[i * 3 + 1];
      rgba[j++] = data[i * 3 + 2];
      rgba[j++] = 255;
    } else if (bpp === 1) {
      const v = data[i];
      rgba[j++] = v;
      rgba[j++] = v;
      rgba[j++] = v;
      rgba[j++] = 255;
    } else {
      throw new Error(`unsupported bpp ${bpp}`);
    }
  }
  return { width, height, rgba };
}

async function getObj(page: { objs: { get: (name: string, cb: (v: unknown) => void) => void } }, name: string) {
  return new Promise<unknown>((resolve) => {
    page.objs.get(name, (v: unknown) => resolve(v));
  });
}

async function main() {
  const pdfPath = path.join(process.cwd(), "assets", "nbis-kashaf.pdf");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const outDir = path.join(process.cwd(), "scripts", "pdf-preview");
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const ops = await page.getOperatorList();
    const names = new Set<string>();
    for (let n = 0; n < ops.fnArray.length; n++) {
      if (ops.fnArray[n] === 85 && Array.isArray(ops.argsArray[n])) {
        names.add(String(ops.argsArray[n][0]));
      }
    }
    for (const name of names) {
      const img = (await getObj(page, name)) as {
        data?: Uint8Array;
        width?: number;
        height?: number;
        kind?: number;
        bitmap?: { width: number; height: number };
      };
      if (!img?.data || !img.width || !img.height) {
        console.log("skip", name, img && Object.keys(img));
        continue;
      }
      const { width, height, rgba } = toRgba({
        data: img.data,
        width: img.width,
        height: img.height,
        kind: img.kind,
      });
      const png = encodePng(width, height, rgba);
      const file = path.join(outDir, `page${i}-${name}.png`);
      fs.writeFileSync(file, png);
      console.log("wrote", file, width, height, png.length);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
