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

const urlCache = new Map<string, { buffer: Buffer; expiresAt: number }>();

export async function readFile(relativePath: string): Promise<Buffer> {
  const safe = relativePath.replace(/\\/g, "/");

  // URLs (Supabase etc.) — with in-memory caching (10 min TTL) and local fallback
  if (safe.startsWith("http://") || safe.startsWith("https://")) {
    const cached = urlCache.get(safe);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.buffer;
    }

    try {
      const response = await fetch(safe, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const buf = Buffer.from(await response.arrayBuffer());
        urlCache.set(safe, { buffer: buf, expiresAt: Date.now() + 10 * 60 * 1000 });
        return buf;
      }
    } catch {
      // If network fails/times out, check local fallback below
    }

    // Local fallback if Supabase network fetch fails or times out
    if (safe.includes("nbis-kashaf.pdf")) {
      const fallbacks = [
        path.join(process.cwd(), "uploads", "templates", "nbis-kashaf.pdf"),
        path.join(process.cwd(), "assets", "nbis-kashaf.pdf"),
        path.join(process.cwd(), "template.pdf"),
      ];
      for (const fb of fallbacks) {
        try {
          const buf = await fs.readFile(fb);
          urlCache.set(safe, { buffer: buf, expiresAt: Date.now() + 5 * 60 * 1000 });
          return buf;
        } catch {
          /* try next */
        }
      }
    }

    throw new Error(`Failed to fetch file from ${safe}`);
  }

  // If it's already an absolute path (for testing), try to read it directly
  if (path.isAbsolute(safe)) {
    return fs.readFile(safe);
  }

  // Otherwise, read from local filesystem with fallbacks
  const candidates = [
    path.join(UPLOAD_DIR, safe),
    path.join(process.cwd(), "uploads", safe),
    path.join(process.cwd(), safe),
    path.join("/tmp", safe),
  ];

  for (const filePath of candidates) {
    try {
      await fs.access(filePath);
      return await fs.readFile(filePath);
    } catch {
      /* try next */
    }
  }

  throw new Error(`File not found: ${safe}`);
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

    // URLs — do a HEAD request
    if (safe.startsWith("http://") || safe.startsWith("https://")) {
      const response = await fetch(safe, { method: "HEAD", signal: AbortSignal.timeout(4000) });
      return response.ok;
    }

    const candidatePaths = [
      path.join(UPLOAD_DIR, safe),
      path.join(process.cwd(), "uploads", safe),
      path.join(process.cwd(), safe),
      path.join("/tmp", safe),
    ];
    for (const p of candidatePaths) {
      try {
        await fs.access(p);
        return true;
      } catch {
        /* try next */
      }
    }

    return false;
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
