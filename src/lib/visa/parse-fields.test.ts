import { describe, expect, it } from "vitest";
import { parseVisaFields } from "./parse-fields";

const SAMPLE_EVISA = `
Kingdom of Saudi Arabia
Ministry of Foreign Affairs
Visa No. 9988776655 Date of Issue 01/02/2026
Valid until 01/08/2026 Duration of Stay 90
Passport No. 12AB34567 Place of issue Paris
Name ALEXANDRE MARTIN
Nationality France Birth Date 12/03/1990
Type Of Visa Tourism Visit Entry Type Single
Application No. 555444333
`;

describe("parseVisaFields", () => {
  it("extracts the four labeled English fields and ignores other identifiers", () => {
    const result = parseVisaFields({ text: SAMPLE_EVISA });
    expect(result.fullName).toBe("ALEXANDRE MARTIN");
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.nationality).toBe("France");
    expect(result.visaType).toBe("Tourism Visit");
    expect(result.passportNumber).not.toContain("9988776655");
    expect(result.passportNumber).not.toContain("555444333");
    expect(result.fields.fullName.status).toBe("ok");
    expect(result.fields.passportNumber.status).toBe("ok");
  });

  it("reads Arabic labels and maps a known Arabic nationality to English", () => {
    const result = parseVisaFields({
      text: `
        رقم جواز السفر 12AB34567
        الاسم ALEXANDRE MARTIN
        الجنسية فرنسا
        نوع التأشيرة Tourism Visit
      `,
    });
    expect(result.fullName).toBe("ALEXANDRE MARTIN");
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.nationality).toBe("France");
    expect(result.visaType).toBe("Tourism Visit");
  });

  it("does not treat Visa No. or Application No. as a passport number", () => {
    const result = parseVisaFields({
      text: `
        Visa No. 9988776655
        Application No. APP009988
        Name JANE DOE
        Nationality France
        Type Of Visa Tourism Visit
      `,
    });
    expect(result.passportNumber).toBe("");
    expect(result.fields.passportNumber.status).toBe("missing");
    expect(result.fullName).toBe("JANE DOE");
  });

  it("does not copy Entry Type into visa type", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Passport No. 12AB34567
        Nationality France
        Type Of Visa Single
        Entry Type Single
      `,
    });
    expect(result.visaType).toBe("");
    expect(result.fields.visaType.status).toBe("needs_review");
  });

  it("leaves missing fields blank", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Visa No. 111
      `,
    });
    expect(result.fullName).toBe("JANE DOE");
    expect(result.passportNumber).toBe("");
    expect(result.nationality).toBe("");
    expect(result.visaType).toBe("");
  });

  it("flags OCR passport numbers that contain ambiguous characters instead of guessing", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Passport No. O1234567
        Nationality France
        Type Of Visa Tourism Visit
      `,
      fromOcr: true,
    });
    expect(result.passportNumber).toBe("O1234567");
    expect(result.fields.passportNumber.status).toBe("needs_review");
    expect(result.fields.passportNumber.warning).toMatch(/O\/0|I\/1/);
  });

  it("does not use embassy or country headings as the passenger name", () => {
    const result = parseVisaFields({
      text: `
        Name Kingdom of Saudi Arabia
        Passport No. 12AB34567
        Nationality France
        Type Of Visa Tourism Visit
      `,
    });
    expect(result.fullName).toBe("");
    expect(result.fields.fullName.status).toBe("missing");
  });

  it("does not treat a country name as a document ID", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Passport No. 12AB34567
        Nationality France
        Type Of Visa Tourism Visit
      `,
    });
    expect(result.nationality).toBe("France");
    expect(result.fields.nationality.status).toBe("ok");
  });

  it("does not infer nationality from Country of Birth", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Passport No. 12AB34567
        Country of Birth France
        Type Of Visa Tourism Visit
      `,
    });
    expect(result.nationality).toBe("");
  });

  it("keeps English nationality when Arabic is also printed", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Passport No. 12AB34567
        Nationality France الجنسية فرنسا
        Type Of Visa Tourism Visit
      `,
    });
    expect(result.nationality).toBe("France");
  });

  it("reads a Saudi eVisa row where Arabic sits beside the English value", () => {
    const result = parseVisaFields({
      text: `
        Visa No. 9988776655 رقم التأشيرة
        Date of Issue 16/01/2024 صالحة اعتبارا من
        Passport No. 12AB34567 رقم جواز السفر
        Place of issue Saudi Digital Embassy - السفارة السعودية الرقمية مصدر التأشيرة
        Name ALEXANDRE MARTIN الاسم
        Nationality France - فرنسا الجنسية
        Birth Date 12/03/1990 تاريخ الميلاد
        Type Of Visa Tourism Visit - زيارة سياحة نوع التأشيرة
        Entry Type Multiple - متعددة عدد مرات الدخول
        Application No. 555444333 رقم الطلب
      `,
    });
    expect(result.fullName).toBe("ALEXANDRE MARTIN");
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.nationality).toBe("France");
    expect(result.visaType).toBe("Tourism Visit");
    expect(result.nationality).not.toMatch(/فرنسا/);
    expect(result.visaType).not.toMatch(/زيارة|Entry|Multiple|متعددة/);
  });

  it("still finds Passport No. when the Arabic label is printed before the number", () => {
    const result = parseVisaFields({
      text: `
        Name JANE DOE
        Passport No. رقم جواز السفر 12AB34567
        Nationality France - فرنسا
        Type Of Visa Tourism Visit - زيارة سياحة
        Entry Type Multiple
      `,
    });
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.nationality).toBe("France");
    expect(result.visaType).toBe("Tourism Visit");
  });

  it("uses the center-column passport token and ignores the Arabic passport label", () => {
    const result = parseVisaFields({
      tokens: [
        { text: "Passport", x: 10, y: 40, width: 50, height: 10 },
        { text: "No.", x: 62, y: 40, width: 20, height: 10 },
        { text: "12AB34567", x: 200, y: 40, width: 70, height: 10 },
        { text: "رقم", x: 400, y: 40, width: 24, height: 10 },
        { text: "جواز", x: 428, y: 40, width: 28, height: 10 },
        { text: "السفر", x: 460, y: 40, width: 32, height: 10 },
        { text: "Name", x: 10, y: 60, width: 40, height: 10 },
        { text: "JANE", x: 200, y: 60, width: 40, height: 10 },
        { text: "DOE", x: 244, y: 60, width: 30, height: 10 },
        { text: "الاسم", x: 430, y: 60, width: 40, height: 10 },
        { text: "Nationality", x: 10, y: 80, width: 70, height: 10 },
        { text: "France", x: 200, y: 80, width: 40, height: 10 },
        { text: "-", x: 244, y: 80, width: 8, height: 10 },
        { text: "فرنسا", x: 256, y: 80, width: 36, height: 10 },
        { text: "الجنسية", x: 420, y: 80, width: 50, height: 10 },
        { text: "Type", x: 10, y: 100, width: 30, height: 10 },
        { text: "Of", x: 42, y: 100, width: 16, height: 10 },
        { text: "Visa", x: 60, y: 100, width: 30, height: 10 },
        { text: "Tourism", x: 200, y: 100, width: 50, height: 10 },
        { text: "Visit", x: 254, y: 100, width: 30, height: 10 },
        { text: "-", x: 288, y: 100, width: 8, height: 10 },
        { text: "زيارة", x: 300, y: 100, width: 30, height: 10 },
        { text: "سياحة", x: 334, y: 100, width: 30, height: 10 },
        { text: "نوع", x: 400, y: 100, width: 24, height: 10 },
        { text: "التأشيرة", x: 428, y: 100, width: 50, height: 10 },
        { text: "Entry", x: 10, y: 120, width: 36, height: 10 },
        { text: "Type", x: 50, y: 120, width: 30, height: 10 },
        { text: "Multiple", x: 200, y: 120, width: 50, height: 10 },
        { text: "متعددة", x: 256, y: 120, width: 40, height: 10 },
        { text: "عدد", x: 400, y: 120, width: 24, height: 10 },
        { text: "مرات", x: 428, y: 120, width: 28, height: 10 },
        { text: "الدخول", x: 460, y: 120, width: 36, height: 10 },
      ],
    });
    expect(result.fullName).toBe("JANE DOE");
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.nationality).toBe("France");
    expect(result.visaType).toBe("Tourism Visit");
  });

  it("uses token positions when line text is jumbled", () => {
    const result = parseVisaFields({
      tokens: [
        { text: "Passport", x: 10, y: 40, width: 50, height: 10 },
        { text: "No.", x: 62, y: 40, width: 20, height: 10 },
        { text: "12AB34567", x: 90, y: 40, width: 70, height: 10 },
        { text: "Name", x: 10, y: 60, width: 40, height: 10 },
        { text: "JANE", x: 60, y: 60, width: 40, height: 10 },
        { text: "DOE", x: 104, y: 60, width: 30, height: 10 },
        { text: "Nationality", x: 10, y: 80, width: 70, height: 10 },
        { text: "France", x: 90, y: 80, width: 40, height: 10 },
        { text: "Type", x: 10, y: 100, width: 30, height: 10 },
        { text: "Of", x: 42, y: 100, width: 16, height: 10 },
        { text: "Visa", x: 60, y: 100, width: 30, height: 10 },
        { text: "Tourism", x: 100, y: 100, width: 50, height: 10 },
        { text: "Visit", x: 154, y: 100, width: 30, height: 10 },
      ],
    });
    expect(result.fullName).toBe("JANE DOE");
    expect(result.passportNumber).toBe("12AB34567");
    expect(result.nationality).toBe("France");
    expect(result.visaType).toBe("Tourism Visit");
  });

  it("strips 'the' when attached or adjacent to passenger name", () => {
    const cases = [
      "Name ALEXANDRE MARTIN the\nPassport No. 12AB34567\nNationality France\nType Of Visa Tourism Visit",
      "Name The ALEXANDRE MARTIN\nPassport No. 12AB34567\nNationality France\nType Of Visa Tourism Visit",
      "Name of the Passenger: ALEXANDRE MARTIN\nPassport No. 12AB34567\nNationality France\nType Of Visa Tourism Visit",
      "Name ALEXANDRE MARTIN The Sponsor\nPassport No. 12AB34567\nNationality France\nType Of Visa Tourism Visit",
    ];
    for (const text of cases) {
      const result = parseVisaFields({ text });
      expect(result.fullName).toBe("ALEXANDRE MARTIN");
      expect(result.fullName).not.toContain("the");
      expect(result.fullName).not.toContain("The");
    }
  });
});
