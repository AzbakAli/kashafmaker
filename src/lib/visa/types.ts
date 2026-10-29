export type VisaFieldKey = "fullName" | "passportNumber" | "nationality" | "visaType";

export type FieldStatus = "ok" | "needs_review" | "missing";

export type ExtractionMethod = "pdf_text" | "ocr" | "hybrid" | "ai_vision";

export interface LayoutToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FieldResult {
  value: string;
  status: FieldStatus;
  warning?: string;
  labeled: boolean;
}

export interface VisaExtractionResult {
  fullName: string;
  passportNumber: string;
  nationality: string;
  visaType: string;
  fields: Record<VisaFieldKey, FieldResult>;
  method: ExtractionMethod;
  warnings: string[];
  needsPageRender: boolean;
}

export const EMPTY_FIELD: FieldResult = {
  value: "",
  status: "missing",
  labeled: false,
};

export function emptyExtraction(method: ExtractionMethod, warnings: string[] = []): VisaExtractionResult {
  return {
    fullName: "",
    passportNumber: "",
    nationality: "",
    visaType: "",
    fields: {
      fullName: { ...EMPTY_FIELD },
      passportNumber: { ...EMPTY_FIELD },
      nationality: { ...EMPTY_FIELD },
      visaType: { ...EMPTY_FIELD },
    },
    method,
    warnings,
    needsPageRender: false,
  };
}
