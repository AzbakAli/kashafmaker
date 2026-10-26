import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPdfLayout } from "./extract-layout";
import { parseVisaFields } from "@/lib/visa/parse-fields";

describe("text-based PDF layout", () => {
  it("extracts labeled visa fields from a selectable PDF", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 800]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const lines = [
      "Visa No. 9988776655",
      "Passport No. 12AB34567",
      "Name ALEXANDRE MARTIN",
      "Nationality France",
      "Type Of Visa Tourism Visit",
      "Entry Type Single",
      "Application No. 111222",
    ];
    lines.forEach((line, index) => {
      page.drawText(line, { x: 40, y: 740 - index * 24, size: 12, font });
    });
    const bytes = await pdf.save();
    const layout = await extractPdfLayout(bytes);
    const parsed = parseVisaFields({ text: layout.text, tokens: layout.tokens });
    expect(parsed.fullName).toBe("ALEXANDRE MARTIN");
    expect(parsed.passportNumber).toBe("12AB34567");
    expect(parsed.nationality).toBe("France");
    expect(parsed.visaType).toBe("Tourism Visit");
  });
});
