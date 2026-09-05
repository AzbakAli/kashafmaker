import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export const StoragePaths = {
  templates: "templates",
  documents: "documents",
  logos: "logos",
  fonts: "fonts",
} as const;

export async function ensureUploadDirs() {
  for (const dir of Object.values(StoragePaths)) {
    await fs.mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  }
}

export function getUploadPath(category: keyof typeof StoragePaths, filename: string) {
  return path.join(UPLOAD_DIR, StoragePaths[category], filename);
}

export function getRelativePath(category: keyof typeof StoragePaths, filename: string) {
  return `${StoragePaths[category]}/${filename}`.replace(/\\/g, "/");
}

export async function saveFile(
  category: keyof typeof StoragePaths,
  buffer: Buffer,
  originalName: string
): Promise<string> {
  await ensureUploadDirs();
  const ext = path.extname(originalName) || ".bin";
  const filename = `${uuidv4()}${ext}`;
  const filePath = getUploadPath(category, filename);
  await fs.writeFile(filePath, buffer);
  return getRelativePath(category, filename);
}

export async function readFile(relativePath: string): Promise<Buffer> {
  const safe = relativePath.replace(/\\/g, "/");
  const filePath = path.join(UPLOAD_DIR, safe);
  return fs.readFile(filePath);
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    const filePath = path.join(UPLOAD_DIR, relativePath);
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, relativePath);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function validatePdfFile(buffer: Buffer, maxSizeMb = 20): { valid: boolean; error?: string } {
  if (buffer.length > maxSizeMb * 1024 * 1024) {
    return { valid: false, error: `File exceeds ${maxSizeMb}MB limit` };
  }
  const header = buffer.slice(0, 5).toString("ascii");
  if (!header.startsWith("%PDF-")) {
    return { valid: false, error: "Invalid PDF file" };
  }
  return { valid: true };
}

export function validateImageFile(buffer: Buffer, maxSizeMb = 5): { valid: boolean; error?: string } {
  if (buffer.length > maxSizeMb * 1024 * 1024) {
    return { valid: false, error: `File exceeds ${maxSizeMb}MB limit` };
  }
  const png = buffer[0] === 0x89 && buffer[1] === 0x50;
  const jpg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const webp = buffer.slice(0, 4).toString("ascii") === "RIFF";
  if (!png && !jpg && !webp) {
    return { valid: false, error: "Invalid image file (PNG, JPG, WEBP only)" };
  }
  return { valid: true };
}
