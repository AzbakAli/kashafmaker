import { extractPdfEmbeddedImages, extractPdfLayout } from "@/lib/pdf/extract-layout";
import { emptyExtraction, type LayoutToken, type VisaExtractionResult } from "./types";
import { validateVisaFile } from "./file-kind";
import { ocrImages } from "./ocr";
import { isExtractionComplete, isExtractionUseful, mergeExtractions, parseVisaFields } from "./parse-fields";

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
