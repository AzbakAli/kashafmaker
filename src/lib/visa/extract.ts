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

  // 1. If PDF has selectable text, try fast native text extraction (instant ~50ms)
  if (validation.kind === "pdf") {
    try {
      const layout = await extractPdfLayout(input.buffer);
      if (layout.text.trim()) {
        const textResult = parseVisaFields({ text: layout.text, tokens: layout.tokens, fromOcr: false, method: "pdf_text" });
        if (isExtractionComplete(textResult)) {
          return { ...textResult, needsPageRender: false };
        }
      }
    } catch {
      // Fall through to AI Vision / OCR
    }
  }

  // 2. High-Accuracy AI Vision extraction (handles phone camera photos, screenshots, scanned PDFs)
  try {
    const aiResult = await aiExtractVisa({
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    });
    if (aiResult && isExtractionComplete(aiResult)) {
      return aiResult;
    }
    if (aiResult && (aiResult.fullName || aiResult.passportNumber)) {
      return aiResult;
    }
  } catch {
    // Fall through to local OCR
  }

  // 3. Fallback to local PDF / OCR processing
  if (validation.kind === "pdf") {
    return extractFromPdf(input.buffer);
  }
  return extractFromImage(Buffer.from(input.buffer));
}

async function extractFromPdf(data: Uint8Array): Promise<VisaExtractionResult> {
  let layoutText = "";
  let tokens: LayoutToken[] = [];
  try {
    const layout = await extractPdfLayout(data);
    layoutText = layout.text;
    tokens = layout.tokens;
  } catch {
    throw Object.assign(new Error("The PDF could not be read. The file may be corrupt."), { status: 400 });
  }

  const textResult = parseVisaFields({ text: layoutText, tokens, fromOcr: false, method: "pdf_text" });
  if (isExtractionComplete(textResult)) {
    return { ...textResult, needsPageRender: false };
  }

  let images: Buffer[] = [];
  try {
    images = await extractPdfEmbeddedImages(data);
  } catch {
    images = [];
  }

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
