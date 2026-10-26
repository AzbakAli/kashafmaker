import { describe, expect, it } from "vitest";
import { detectVisaFileKind, validateVisaFile } from "./file-kind";

function bytes(...values: number[]) {
  return Uint8Array.from(values);
}

describe("visa file validation", () => {
  it("detects PDFs from magic bytes even when the extension is wrong", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    expect(detectVisaFileKind(pdf, "image/jpeg", "visa.jpg")).toBe("pdf");
  });

  it("detects JPEG, PNG, and WEBP images", () => {
    expect(detectVisaFileKind(bytes(0xff, 0xd8, 0xff, 0xe0), "", "photo.bin")).toBe("image");
    expect(detectVisaFileKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "", "x.bin")).toBe("image");
    const webp = new Uint8Array(12);
    webp.set(Buffer.from("RIFF"));
    webp.set(Buffer.from("WEBP"), 8);
    expect(detectVisaFileKind(webp, "", "x.bin")).toBe("image");
  });

  it("rejects unsupported or empty files", () => {
    expect(validateVisaFile(new Uint8Array(), "application/pdf", "visa.pdf").ok).toBe(false);
    expect(validateVisaFile(Buffer.from("%PDF-1.7"), "application/pdf", "visa.pdf").ok).toBe(true);
    const svg = Buffer.from("<svg></svg>");
    expect(validateVisaFile(svg, "image/svg+xml", "visa.svg").ok).toBe(false);
    expect(validateVisaFile(Buffer.from("hello"), "text/plain", "notes.txt").ok).toBe(false);
  });

  it("rejects files over 15 MB", () => {
    const huge = new Uint8Array(15 * 1024 * 1024 + 1);
    huge.set([0xff, 0xd8, 0xff]);
    expect(validateVisaFile(huge, "image/jpeg", "big.jpg").ok).toBe(false);
  });
});
