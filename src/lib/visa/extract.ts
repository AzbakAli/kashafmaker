import { extractPdfEmbeddedImages, extractPdfLayout } from "@/lib/pdf/extract-layout";
import { emptyExtraction, type LayoutToken, type VisaExtractionResult } from "./types";
import { validateVisaFile } from "./file-kind";
import { ocrImages } from "./ocr";
import { isExtractionComplete, isExtractionUseful, mergeExtractions, parseVisaFields } from "./parse-fields";
import { aiExtractVisa } from "./ai-vision";

export interface ExtractVisaInput {
  buffer: Uint8Array;
  mimeType?: string;
  fileName?: string;
}

export async function extractVisaInformation(input: ExtractVisaInput): Promise<VisaExtractionResult> {
  const validation = validateVisaFile(input.buffer, input.mimeType, input.fileName);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.error), { status: 400 });
  }

  // 1. For PDFs: try fast native text extraction (~50ms)
  // Also extract embedded images once here — reused by AI vision AND OCR fallback below.
  let pdfText = "";
  let pdfTextTokens: LayoutToken[] = [];
  let pdfImages: Buffer[] = [];

  if (validation.kind === "pdf") {
    // 1a. Text extraction
    try {
      const layout = await extractPdfLayout(input.buffer);
      pdfText = layout.text;
      pdfTextTokens = layout.tokens;
      if (pdfText.trim()) {
        const textResult = parseVisaFields({ text: pdfText, tokens: pdfTextTokens, fromOcr: false, method: "pdf_text" });
        if (isExtractionComplete(textResult)) {
          return { ...textResult, needsPageRender: false };
        }
      }
    } catch {
      // Fall through — pdf.js couldn't parse (Acrobat-specific PDF)
    }

    // 1b. Extract embedded images once — shared by AI vision and OCR fallback
    try {
      pdfImages = await extractPdfEmbeddedImages(input.buffer);
    } catch {
      pdfImages = [];
    }
  }

  // 2. AI Vision extraction — fast path (2-3s when Gemini is healthy)
  // Pass pre-extracted images for PDFs to avoid double-extracting
  try {
    const aiResult = await aiExtractVisa({
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
      preExtractedImages: pdfImages.length > 0 ? pdfImages : undefined,
    });
    if (aiResult && (isExtractionComplete(aiResult) || aiResult.fullName || aiResult.passportNumber)) {
      return aiResult;
    }
  } catch {
    // Fall through to local OCR
  }

  // 3. Local OCR fallback (slow ~20s — only reached if Gemini fails)
  if (validation.kind === "pdf") {
    return extractFromPdf(input.buffer, pdfText, pdfTextTokens, pdfImages);
  }
  return extractFromImage(Buffer.from(input.buffer));
}

async function extractFromPdf(
  data: Uint8Array,
  cachedText = "",
  cachedTokens: LayoutToken[] = [],
  cachedImages: Buffer[] = []
): Promise<VisaExtractionResult> {
  // Use cached text/tokens from step 1 if available
  let layoutText = cachedText;
  let tokens = cachedTokens;

  if (!layoutText) {
    try {
      const layout = await extractPdfLayout(data);
      layoutText = layout.text;
      tokens = layout.tokens;
    } catch {
      // PDF.js couldn't parse — use cached images or throw corrupt error
      const images = cachedImages.length > 0 ? cachedImages : [];
      if (images.length > 0) {
        try {
          const ocr = await ocrImages(images);
          if (ocr.text.trim()) {
            return parseVisaFields({ text: ocr.text, tokens: ocr.tokens, fromOcr: true, method: "ocr" });
          }
        } catch { /* fall through */ }
      }
      throw Object.assign(new Error("The PDF could not be read. The file may be corrupt."), { status: 400 });
    }
  }

  const textResult = parseVisaFields({ text: layoutText, tokens, fromOcr: false, method: "pdf_text" });
  if (isExtractionComplete(textResult)) {
    return { ...textResult, needsPageRender: false };
  }

  // Use cached images from step 1 if available, otherwise extract now
  const images = cachedImages.length > 0 ? cachedImages : await extractPdfEmbeddedImages(data).catch(() => []);

  if (!images.length) {
    return {
      ...textResult,
      warnings: unique([
        ...textResult.warnings,
        isExtractionUseful(textResult)
          ? "Some visa fields are still missing. Render the PDF pages and retry OCR, or enter them manually."
          : "The PDF has little or no selectable text. Render its pages and retry OCR, or enter the fields manually.",
      ]),
      needsPageRender: true,
    };
  }

  try {
    const ocr = await ocrImages(images);
    if (!ocr.text.trim()) {
      return {
        ...textResult,
        warnings: unique([...textResult.warnings, "OCR did not read any text from the scanned PDF pages."]),
        needsPageRender: true,
      };
    }
    const ocrResult = parseVisaFields({
      text: ocr.text,
      tokens: ocr.tokens,
      fromOcr: true,
      method: textResult.fullName || textResult.passportNumber ? "hybrid" : "ocr",
    });
    const merged = mergeExtractions(textResult, ocrResult);
    return { ...merged, needsPageRender: !isExtractionComplete(merged) };
  } catch {
    return {
      ...textResult,
      warnings: unique([...textResult.warnings, "OCR failed on the scanned PDF. You can retry or fill the fields manually."]),
      needsPageRender: true,
    };
  }
}

async function extractFromImage(image: Buffer): Promise<VisaExtractionResult> {
  try {
    const ocr = await ocrImages([image]);
    if (!ocr.text.trim()) {
      return emptyExtraction("ocr", ["OCR did not read any text from the image. Try a clearer photo or fill the fields manually."]);
    }
    return parseVisaFields({ text: ocr.text, tokens: ocr.tokens, fromOcr: true, method: "ocr" });
  } catch {
    throw Object.assign(new Error("OCR failed to read this image. Try another file or enter the details manually."), {
      status: 422,
    });
  }
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
