export type VisaFileKind = "pdf" | "image";

export const MAX_VISA_FILE_BYTES = 15 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff"]);

export function detectVisaFileKind(buffer: Uint8Array, mimeType = "", fileName = ""): VisaFileKind | null {
  if (buffer.length >= 5 && ascii(buffer, 0, 5) === "%PDF-") return "pdf";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image";
  if (buffer.length >= 8 && pngHeader(buffer)) return "image";
  if (buffer.length >= 6 && (ascii(buffer, 0, 6) === "GIF87a" || ascii(buffer, 0, 6) === "GIF89a")) {
    return "image";
  }
  if (buffer.length >= 12 && ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP") return "image";
  if (buffer.length >= 2 && ascii(buffer, 0, 2) === "BM") return "image";
  if (isTiff(buffer)) return "image";

  const mime = mimeType.toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) {
    if (mime.includes("heic") || mime.includes("heif") || mime.includes("svg")) return null;
    return "image";
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  return null;
}

export function validateVisaFile(buffer: Uint8Array, mimeType = "", fileName = "") {
  if (!buffer.length) {
    return { ok: false as const, error: "The uploaded file is empty." };
  }
  if (buffer.length > MAX_VISA_FILE_BYTES) {
    return { ok: false as const, error: "File is too large. Maximum size is 15 MB." };
  }
  const kind = detectVisaFileKind(buffer, mimeType, fileName);
  if (!kind) {
    return {
      ok: false as const,
      error: "Unsupported file type. Upload a PDF or an image (JPG, PNG, WEBP, GIF, BMP, or TIFF).",
    };
  }
  return { ok: true as const, kind };
}

function ascii(buffer: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...buffer.subarray(start, start + length));
}

function pngHeader(buffer: Uint8Array) {
  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isTiff(buffer: Uint8Array) {
  if (buffer.length < 4) return false;
  const ii = buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00;
  const mm = buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a;
  return ii || mm;
}
