import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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
  
  // Use local filesystem only
  const filePath = getUploadPath(category, filename);
  await fs.writeFile(filePath, buffer);
  return getRelativePath(category, filename);
}

export async function readFile(relativePath: string): Promise<Buffer> {
  const safe = relativePath.replace(/\\/g, "/");

  // If it's a Supabase Storage URL, fetch it
  if (safe.startsWith("http://") || safe.startsWith("https://")) {
    const response = await fetch(safe);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from ${safe}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  // If it's already an absolute path (for testing), try to read it directly
  if (path.isAbsolute(safe)) {
    return fs.readFile(safe);
  }

  // Otherwise, read from local filesystem
  const filePath = path.join(UPLOAD_DIR, safe);
  return fs.readFile(filePath);
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    const safe = relativePath.replace(/\\/g, "/");

    // If it's a Supabase Storage URL, we'd need to delete from Supabase
    // For now, skip Supabase deletion to avoid complexity
    if (safe.startsWith("http://") || safe.startsWith("https://")) {
      return;
    }

    const filePath = path.join(UPLOAD_DIR, relativePath);
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const safe = relativePath.replace(/\\/g, "/");

    // If it's a Supabase Storage URL, try to fetch it
    if (safe.startsWith("http://") || safe.startsWith("https://")) {
      const response = await fetch(safe, { method: "HEAD" });
      return response.ok;
    }

    const filePath = path.join(UPLOAD_DIR, safe);
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
