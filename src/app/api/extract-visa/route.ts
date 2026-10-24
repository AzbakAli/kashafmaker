import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractPdfText } from "@/lib/pdf/extract-text";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    const fullText = await extractPdfText(new Uint8Array(buffer));
    const extracted = extractVisaInfo(fullText);

    if (!extracted.fullName || !extracted.passportNumber) {
      return NextResponse.json(
        {
          error:
            "Could not extract required information. This PDF may be scanned (image-based) which requires OCR. For scanned PDFs, please enter the information manually.",
          extracted,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(extracted);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract visa information",
      },
      { status: 500 }
    );
  }
}

function extractVisaInfo(text: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const namePatterns = [
    /(?:Name[:\s]+)([A-Z][a-zA-Z\s]+)(?:\s*(?:Passport|Birth|Gender))/i,
    /(?:اسم[:\s]+)([A-Z][a-zA-Z\s]+)/i,
    /(?:Holder Name[:\s]+)([A-Z][a-zA-Z\s]+)/i,
  ];

  const passportPatterns = [
    /(?:Passport No\.?[:\s]+)([A-Z0-9]{6,9})(?:\s*(?:Place|Date))/i,
    /(?:Passport Number[:\s]+)([A-Z0-9]{6,9})/i,
    /(?:P\.No\.?[:\s]+)([A-Z0-9]{6,9})/i,
    /(?:رقم جواز[:\s]+)([A-Z0-9]{6,9})/i,
  ];

  const nationalityPatterns = [
    /(?:Nationality[:\s]+)([A-Z][a-zA-Z\s]+)(?:\s*(?:Birth|Type))/i,
    /(?:الجنسية[:\s]+)([A-Z][a-zA-Z\s]+)/i,
    /(?:Country of Birth[:\s]+)([A-Z][a-zA-Z\s]+)/i,
  ];

  const visaTypePatterns = [
    /(?:Type Of Visa[:\s]+)([A-Z][a-zA-Z\s]+)(?:\s*(?:Entry|Duration))/i,
    /(?:نوع التأشيرة[:\s]+)([A-Z][a-zA-Z\s]+)/i,
    /(?:Visa Type[:\s]+)([A-Z][a-zA-Z\s]+)/i,
  ];

  let fullName = "";
  let passportNumber = "";
  let nationality = "";
  let visaType = "";

  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      fullName = match[1].trim().replace(/\s+(?:Passport|Birth|Gender|Date|Place)/i, "").trim();
      break;
    }
  }

  for (const pattern of passportPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      passportNumber = match[1].trim();
      break;
    }
  }

  for (const pattern of nationalityPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      nationality = match[1].trim().replace(/\s+(?:Birth|Type|Date)/i, "").trim();
      break;
    }
  }

  for (const pattern of visaTypePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      visaType = match[1].trim().replace(/\s+(?:Entry|Duration|Type)/i, "").trim();
      break;
    }
  }

  if (!passportNumber) {
    const passportMatch = cleanText.match(/[A-Z]{1,2}[0-9]{6,9}/);
    if (passportMatch) {
      passportNumber = passportMatch[0];
    }
  }

  return {
    fullName,
    passportNumber,
    nationality,
    visaType,
    confidence: {
      fullName: fullName ? ("high" as const) : ("low" as const),
      passportNumber: passportNumber ? ("high" as const) : ("low" as const),
      nationality: nationality ? ("high" as const) : ("low" as const),
      visaType: visaType ? ("high" as const) : ("low" as const),
    },
  };
}
