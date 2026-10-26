import { deflateSync, inflateSync } from "node:zlib";

export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
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
  const compressed = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function pixelsToRgba(img: { data: Uint8Array; width: number; height: number }) {
  const { width, height, data } = img;
  const rgba = new Uint8Array(width * height * 4);
  const bpp = data.length / (width * height);
  for (let i = 0, j = 0; i < width * height; i++) {
    if (bpp >= 4) {
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
      throw new Error("Unsupported image pixel format");
    }
  }
  return { width, height, rgba };
}

export function contrastRgba(rgba: Uint8Array, amount = 1.25) {
  const out = new Uint8Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = clamp((rgba[i] - 128) * amount + 128);
    out[i + 1] = clamp((rgba[i + 1] - 128) * amount + 128);
    out[i + 2] = clamp((rgba[i + 2] - 128) * amount + 128);
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

export function rotateRgba(
  width: number,
  height: number,
  rgba: Uint8Array,
  degrees: 90 | 180 | 270
) {
  if (degrees === 180) {
    const out = new Uint8Array(rgba.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const si = (y * width + x) * 4;
        const di = ((height - 1 - y) * width + (width - 1 - x)) * 4;
        out.set(rgba.subarray(si, si + 4), di);
      }
    }
    return { width, height, rgba: out };
  }

  const outW = height;
  const outH = width;
  const out = new Uint8Array(outW * outH * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const dx = degrees === 90 ? height - 1 - y : y;
      const dy = degrees === 90 ? x : width - 1 - x;
      out.set(rgba.subarray(si, si + 4), (dy * outW + dx) * 4);
    }
  }
  return { width: outW, height: outH, rgba: out };
}

export function downscaleRgba(width: number, height: number, rgba: Uint8Array, maxWidth = 1800) {
  if (width <= maxWidth) return { width, height, rgba };
  const scale = maxWidth / width;
  const outW = maxWidth;
  const outH = Math.max(1, Math.round(height * scale));
  const out = new Uint8Array(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      out.set(rgba.subarray((sy * width + sx) * 4, (sy * width + sx) * 4 + 4), (y * outW + x) * 4);
    }
  }
  return { width: outW, height: outH, rgba: out };
}

function pngChunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf: Buffer) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function preprocessRgbaToPng(width: number, height: number, rgba: Uint8Array) {
  const scaled = downscaleRgba(width, height, rgba);
  const contrasted = contrastRgba(scaled.rgba);
  return encodePng(scaled.width, scaled.height, contrasted);
}

export function decodePngRgba(image: Uint8Array | Buffer) {
  const buf = Buffer.from(image);
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idats: Buffer[] = [];
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) return null;
      colorType = data[9];
      if (colorType !== 2 && colorType !== 6) return null;
    } else if (type === "IDAT") {
      idats.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || !idats.length) return null;
  const bpp = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(idats));
  const stride = width * bpp;
  const expected = (stride + 1) * height;
  if (inflated.length < expected) return null;
  const rgba = new Uint8Array(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filter = inflated[rowStart];
    const raw = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const byte = inflated[rowStart + 1 + x];
      const left = x >= bpp ? raw[x - bpp] : 0;
      const up = prev[x];
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      raw[x] = paethRecon(filter, byte, left, up, upLeft);
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      rgba[di] = raw[si];
      rgba[di + 1] = raw[si + 1];
      rgba[di + 2] = raw[si + 2];
      rgba[di + 3] = bpp === 4 ? raw[si + 3] : 255;
    }
    prev = raw;
  }
  return { width, height, rgba };
}

function paethRecon(filter: number, byte: number, left: number, up: number, upLeft: number) {
  if (filter === 0) return byte;
  if (filter === 1) return (byte + left) & 255;
  if (filter === 2) return (byte + up) & 255;
  if (filter === 3) return (byte + Math.floor((left + up) / 2)) & 255;
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
  return (byte + pr) & 255;
}
