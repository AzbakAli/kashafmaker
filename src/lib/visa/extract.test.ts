import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pdf/extract-layout", () => ({
  extractPdfLayout: vi.fn(),
  extractPdfEmbeddedImages: vi.fn(),
}));

vi.mock("@/lib/visa/ocr", () => ({
  ocrImages: vi.fn(),
}));

import { extractPdfEmbeddedImages, extractPdfLayout } from "@/lib/pdf/extract-layout";
import { extractVisaInformation } from "./extract";
import { ocrImages } from "./ocr";

const extractPdfLayoutMock = vi.mocked(extractPdfLayout);
const extractPdfEmbeddedImagesMock = vi.mocked(extractPdfEmbeddedImages);
const ocrImagesMock = vi.mocked(ocrImages);

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);

const LABELED_TEXT = `
Name ALEXANDRE MARTIN
Passport No. 12AB34567
Nationality France
Type Of Visa Tourism Visit
`;

describe("extractVisaInformation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("OCRs a text PDF when Passport No. is still missing after native extraction", async () => {
    extractPdfLayoutMock.mockResolvedValue({
      text: `
        Name ALEXANDRE MARTIN
        Nationality France
        Type Of Visa Tourism Visit
      `,
      tokens: [],
      pageCount: 1,
    });
    extractPdfEmbeddedImagesMock.mockResolvedValue([Buffer.from("fake-png")]);
    ocrImagesMock.mockResolvedValue({
      text: `
        Name ALEXANDRE MARTIN
        Passport No. 12AB34567
        Nationality France
        Type Of Visa Tourism Visit
      `,
      tokens: [],
      meanConfidence: 40,
    });
    const result = await extractVisaInformation({ buffer: PDF_BYTES, fileName: "visa.pdf" });
    expect(ocrImagesMock).toHaveBeenCalled();
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.method).toBe("hybrid");
  });

  it("uses native PDF text when the four labeled fields are present", async () => {
    extractPdfLayoutMock.mockResolvedValue({ text: LABELED_TEXT, tokens: [], pageCount: 1 });
    const result = await extractVisaInformation({ buffer: PDF_BYTES, fileName: "visa.pdf" });
    expect(result.method).toBe("pdf_text");
    expect(result.fullName).toBe("ALEXANDRE MARTIN");
    expect(result.needsPageRender).toBe(false);
    expect(ocrImagesMock).not.toHaveBeenCalled();
  });

  it("OCRs embedded images for a scanned PDF when text is insufficient", async () => {
    extractPdfLayoutMock.mockResolvedValue({ text: " ", tokens: [], pageCount: 1 });
    extractPdfEmbeddedImagesMock.mockResolvedValue([Buffer.from("fake-png")]);
    ocrImagesMock.mockResolvedValue({
      text: LABELED_TEXT,
      tokens: [],
      meanConfidence: 40,
    });
    const result = await extractVisaInformation({ buffer: PDF_BYTES, fileName: "scanned.pdf" });
    expect(ocrImagesMock).toHaveBeenCalled();
    expect(result.fullName).toBe("ALEXANDRE MARTIN");
    expect(result.fields.fullName.status).toBe("needs_review");
    expect(result.method).toBe("ocr");
  });

  it("OCRs photographs directly", async () => {
    ocrImagesMock.mockResolvedValue({
      text: LABELED_TEXT,
      tokens: [],
      meanConfidence: 35,
    });
    const result = await extractVisaInformation({ buffer: JPEG_BYTES, mimeType: "image/jpeg", fileName: "photo.jpg" });
    expect(result.method).toBe("ocr");
    expect(result.nationality).toBe("France");
    expect(result.fields.nationality.status).toBe("needs_review");
  });

  it("flags rotated or low-quality OCR output for review instead of treating it as verified", async () => {
    ocrImagesMock.mockResolvedValue({
      text: `
        Name ALEXANDRE MARTIN
        Passport No. O1234567
        Nationality France
        Type Of Visa Tourism Visit
      `,
      tokens: [],
      meanConfidence: 12,
    });
    const result = await extractVisaInformation({ buffer: JPEG_BYTES, fileName: "rotated.jpg" });
    expect(result.fields.passportNumber.status).toBe("needs_review");
    expect(result.fields.fullName.status).toBe("needs_review");
  });

  it("asks for a page-render retry when a PDF has no text and no embedded images", async () => {
    extractPdfLayoutMock.mockResolvedValue({ text: "", tokens: [], pageCount: 1 });
    extractPdfEmbeddedImagesMock.mockResolvedValue([]);
    const result = await extractVisaInformation({ buffer: PDF_BYTES, fileName: "blank.pdf" });
    expect(result.needsPageRender).toBe(true);
    expect(result.fullName).toBe("");
  });

  it("rejects unsupported file types", async () => {
    await expect(
      extractVisaInformation({ buffer: Buffer.from("not a visa"), fileName: "notes.txt", mimeType: "text/plain" })
    ).rejects.toThrow(/Unsupported file type/);
  });

  it("surfaces corrupt PDF errors", async () => {
    extractPdfLayoutMock.mockRejectedValue(new Error("boom"));
    await expect(extractVisaInformation({ buffer: PDF_BYTES, fileName: "bad.pdf" })).rejects.toThrow(/could not be read/i);
  });

  it("returns a reviewable result when OCR throws on a scanned PDF", async () => {
    extractPdfLayoutMock.mockResolvedValue({ text: "", tokens: [], pageCount: 1 });
    extractPdfEmbeddedImagesMock.mockResolvedValue([Buffer.from("fake-png")]);
    ocrImagesMock.mockRejectedValue(new Error("ocr down"));
    const result = await extractVisaInformation({ buffer: PDF_BYTES, fileName: "scanned.pdf" });
    expect(result.needsPageRender).toBe(true);
    expect(result.fullName).toBe("");
    expect(result.warnings.some((warning) => /OCR failed/i.test(warning))).toBe(true);
  });

  it("keeps missing OCR fields blank on a photo", async () => {
    ocrImagesMock.mockResolvedValue({ text: "Entry Type Single Application No. 99", tokens: [], meanConfidence: 20 });
    const result = await extractVisaInformation({ buffer: JPEG_BYTES, fileName: "partial.jpg" });
    expect(result.fullName).toBe("");
    expect(result.passportNumber).toBe("");
    expect(result.fields.fullName.status).toBe("missing");
  });
});
