import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Load PDF
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    // Extract text from all pages
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    // Extract information using patterns
    const extracted = extractVisaInfo(fullText);

    if (!extracted.fullName || !extracted.passportNumber) {
      return NextResponse.json({
        error: "Could not extract required information. This PDF may be scanned (image-based) which requires OCR. For scanned PDFs, please use a desktop OCR tool or manually enter the information.",
        extracted: extracted,
      }, { status: 400 });
    }

    return NextResponse.json(extracted);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to extract visa information",
    }, { status: 500 });
  }
}

function extractVisaInfo(text: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  // Common patterns for visa documents
  // Full Name patterns
  const namePatterns = [
    /(?:Name|Full Name|Holder Name|Given Names?)[:\s]*([A-Z][a-zA-Z\s]+)/i,
    /(?:Surn?ame)[:\s]*([A-Z][a-zA-Z]+)/i,
  ];

  // Passport number patterns (typically 6-9 alphanumeric characters)
  const passportPatterns = [
    /(?:Passport No|Passport Number|Passport #|Document No)[:\s]*([A-Z0-9]{6,9})/i,
    /(?:P\.No|P\/No)[:\s]*([A-Z0-9]{6,9})/i,
    /(?:No\.|No)[:\s]*([A-Z0-9]{6,9})/i,
  ];

  // Nationality patterns
  const nationalityPatterns = [
    /(?:Nationality|Country of Birth|Citizenship)[:\s]*([A-Z][a-zA-Z\s]+)/i,
  ];

  let fullName = "";
  let passportNumber = "";
  let nationality = "";

  // Try to extract full name
  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      fullName = match[1].trim();
      break;
    }
  }

  // Try to extract passport number
  for (const pattern of passportPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      passportNumber = match[1].trim();
      break;
    }
  }

  // Try to extract nationality
  for (const pattern of nationalityPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      nationality = match[1].trim();
      break;
    }
  }

  // Fallback: Look for passport-like patterns anywhere in text
  if (!passportNumber) {
    const passportMatch = cleanText.match(/[A-Z]{1,2}[0-9]{6,9}/);
    if (passportMatch) {
      passportNumber = passportMatch[0];
    }
  }

  // Calculate confidence
  const confidence = {
    fullName: fullName ? 'high' as const : 'low' as const,
    passportNumber: passportNumber ? 'high' as const : 'low' as const,
    nationality: nationality ? 'high' as const : 'low' as const,
  };

  return {
    fullName,
    passportNumber,
    nationality,
    confidence,
  };
}
