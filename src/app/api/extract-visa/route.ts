import { NextRequest, NextResponse } from "next/server";

// Polyfill for Promise.withResolvers (Node.js < 22)
if (typeof Promise.withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = new Uint8Array(buffer);

    // Dynamically import pdfjs to avoid worker issues
    const pdfjs = await import('pdfjs-dist');
    
    // Use legacy build to avoid worker issues
    const pdf = await pdfjs.getDocument({
      data,
      useWorkerFetch: false,
      useSystemFonts: false,
    }).promise;

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

  // Saudi visa document patterns - more accurate based on sample
  // Name patterns - look for "Name:" field in Saudi visas
  const namePatterns = [
    /(?:Name[:\s]+)([A-Z][a-zA-Z\s]+)(?:\s*(?:Passport|Birth|Gender))/i,
    /(?:اسم[:\s]+)([A-Z][a-zA-Z\s]+)/i,
    /(?:Holder Name[:\s]+)([A-Z][a-zA-Z\s]+)/i,
  ];

  // Passport number patterns - more specific for Saudi visas
  const passportPatterns = [
    /(?:Passport No\.?[:\s]+)([A-Z0-9]{6,9})(?:\s*(?:Place|Date))/i,
    /(?:Passport Number[:\s]+)([A-Z0-9]{6,9})/i,
    /(?:P\.No\.?[:\s]+)([A-Z0-9]{6,9})/i,
    /(?:رقم جواز[:\s]+)([A-Z0-9]{6,9})/i,
  ];

  // Nationality patterns
  const nationalityPatterns = [
    /(?:Nationality[:\s]+)([A-Z][a-zA-Z\s]+)(?:\s*(?:Birth|Type))/i,
    /(?:الجنسية[:\s]+)([A-Z][a-zA-Z\s]+)/i,
    /(?:Country of Birth[:\s]+)([A-Z][a-zA-Z\s]+)/i,
  ];

  // Visa type patterns - more specific
  const visaTypePatterns = [
    /(?:Type Of Visa[:\s]+)([A-Z][a-zA-Z\s]+)(?:\s*(?:Entry|Duration))/i,
    /(?:نوع التأشيرة[:\s]+)([A-Z][a-zA-Z\s]+)/i,
    /(?:Visa Type[:\s]+)([A-Z][a-zA-Z\s]+)/i,
  ];

  let fullName = "";
  let passportNumber = "";
  let nationality = "";
  let visaType = "";

  // Try to extract full name
  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      fullName = match[1].trim();
      // Clean up any trailing words that aren't part of the name
      fullName = fullName.replace(/\s+(?:Passport|Birth|Gender|Date|Place)/i, '').trim();
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
      nationality = nationality.replace(/\s+(?:Birth|Type|Date)/i, '').trim();
      break;
    }
  }

  // Try to extract visa type
  for (const pattern of visaTypePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      visaType = match[1].trim();
      visaType = visaType.replace(/\s+(?:Entry|Duration|Type)/i, '').trim();
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
    visaType: visaType ? 'high' as const : 'low' as const,
  };

  return {
    fullName,
    passportNumber,
    nationality,
    visaType,
    confidence,
  };
}
