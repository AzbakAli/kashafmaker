import {
  emptyExtraction,
  type ExtractionMethod,
  type FieldResult,
  type FieldStatus,
  type LayoutToken,
  type VisaExtractionResult,
  type VisaFieldKey,
} from "./types";

const TARGET_LABELS: Array<{ field: VisaFieldKey; patterns: RegExp[] }> = [
  { field: "fullName", patterns: [/^full\s*name$/, /^holder\s*name$/, /^passenger\s*name$/, /^name$/, /^الاسم$/, /^اسم$/] },
  {
    field: "passportNumber",
    patterns: [
      /^passport\s*(no|number|#|num)$/,
      /^passport$/,
      /^p\.?\s*no$/,
      /^رقم\s*جواز(?:\s*السفر)?$/,
      /^رقم\s*الجواز$/,
      /^جواز\s*السفر$/,
    ],
  },
  {
    field: "nationality",
    patterns: [/^nationality$/, /^nationalite$/, /^nationalité$/, /^الجنسية$/, /^جنسية$/],
  },
  {
    field: "visaType",
    patterns: [/^type\s*of\s*visa$/, /^visa\s*type$/, /^visa\s*class$/, /^نوع\s*التأشيرة$/, /^نوع\s*التاشيرة$/],
  },
];

const STOP_LABELS: Array<{ id: string; patterns: RegExp[] }> = [
  { id: "visa_no", patterns: [/^visa\s*(no|number|#)$/, /^رقم\s*التأشيرة$/, /^رقم\s*التاشيرة$/] },
  { id: "application_no", patterns: [/^application\s*(no|number|#)$/, /^رقم\s*الطلب$/] },
  { id: "entry_type", patterns: [/^entry\s*type$/, /^type\s*of\s*entry$/, /^نوع\s*الدخول$/, /^عدد\s*مرات\s*الدخول$/] },
  { id: "duration", patterns: [/^duration\s*of\s*stay$/, /^مدة\s*الإقامة$/, /^مدة\s*الاقامة$/] },
  { id: "issue_date", patterns: [/^date\s*of\s*issue$/, /^issue\s*date$/, /^تاريخ\s*الإصدار$/, /^صالحة\s*اعتبارا(?:\s*من)?$/] },
  { id: "valid_until", patterns: [/^valid\s*until$/, /^expiry/, /^تاريخ\s*الانتهاء$/, /^صالحة\s*لغاية$/] },
  { id: "place_of_issue", patterns: [/^place\s*of\s*issue$/, /^مكان\s*الإصدار$/, /^مصدر\s*التأشيرة$/, /^مصدر\s*التاشيرة$/] },
  { id: "birth_date", patterns: [/^birth\s*date$/, /^date\s*of\s*birth$/, /^dob$/, /^تاريخ\s*الميلاد$/] },
  { id: "gender", patterns: [/^gender$/, /^sex$/, /^الجنس$/] },
  { id: "country_of_birth", patterns: [/^country\s*of\s*birth$/] },
];

const NAME_BLOCKLIST = [
  "kingdom of saudi arabia",
  "saudi arabia",
  "ministry of foreign affairs",
  "embassy",
  "consulate",
  "evisa",
  "e-visa",
  "saudi digital embassy",
];

const ENTRY_TYPE_VALUES = new Set([
  "single",
  "multiple",
  "double",
  "single entry",
  "multiple entry",
  "double entry",
]);

const ARABIC_NATIONALITY: Record<string, string> = {
  فرنسا: "France",
  فرنسي: "France",
  فرنسية: "France",
  باكستان: "Pakistan",
  هندي: "India",
  الهند: "India",
  بريطاني: "United Kingdom",
  البريطانية: "United Kingdom",
  "المملكة المتحدة": "United Kingdom",
  امريكي: "United States",
  أمريكي: "United States",
  "الولايات المتحدة": "United States",
  مصري: "Egypt",
  مصر: "Egypt",
  اردني: "Jordan",
  أردني: "Jordan",
  الاردن: "Jordan",
  تركي: "Turkey",
  تركيا: "Turkey",
  اندونيسي: "Indonesia",
  إندونيسي: "Indonesia",
  إندونيسيا: "Indonesia",
  بنغلاديشي: "Bangladesh",
  بنغلاديش: "Bangladesh",
  فلبيني: "Philippines",
  الفلبين: "Philippines",
};

const ARABIC_VISA_TYPE: Record<string, string> = {
  "زيارة سياحة": "Tourism Visit",
  "زيارة سياحية": "Tourism Visit",
  سياحة: "Tourism Visit",
  عمرة: "Umrah",
  حج: "Hajj",
  عمل: "Work",
  مرور: "Transit",
};

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_RUN_SOURCE = "[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]+";
const AMBIGUOUS_PASSPORT = /[O0Il1]/;

type LabelHit = {
  field: VisaFieldKey | "other";
  start: number;
  end: number;
  raw: string;
};

type TokenSpan = {
  field: VisaFieldKey | "other";
  startIndex: number;
  endIndex: number;
  xStart: number;
  xEnd: number;
};

export function parseVisaFields(input: {
  text?: string;
  tokens?: LayoutToken[];
  fromOcr?: boolean;
  method?: ExtractionMethod;
}): VisaExtractionResult {
  const fromOcr = Boolean(input.fromOcr);
  const method = input.method || (fromOcr ? "ocr" : "pdf_text");
  const tokenLines = input.tokens?.length ? clusterLines(input.tokens) : [];
  const textLines = tokenLines.length
    ? tokenLines.map((line) => joinTokens(line)).filter(Boolean)
    : splitLines(input.text || "");

  const labeled = extractLabeledValues(textLines);
  const spatial = tokenLines.length ? extractSpatialValues(tokenLines) : {};
  const merged = mergeValues(labeled, spatial);

  const fields: VisaExtractionResult["fields"] = {
    fullName: finalizeName(merged.fullName, fromOcr),
    passportNumber: finalizePassport(merged.passportNumber, fromOcr),
    nationality: finalizeNationality(merged.nationality, fromOcr),
    visaType: finalizeVisaType(merged.visaType, fromOcr),
  };

  const warnings: string[] = [];
  (Object.keys(fields) as VisaFieldKey[]).forEach((key) => {
    if (fields[key].warning) warnings.push(fields[key].warning as string);
    if (fields[key].status === "missing") warnings.push(missingMessage(key));
  });

  const labeledCount = (Object.values(fields) as FieldResult[]).filter((f) => f.labeled && f.value).length;
  const needsPageRender = !fromOcr && labeledCount < 2;

  return {
    fullName: fields.fullName.value,
    passportNumber: fields.passportNumber.value,
    nationality: fields.nationality.value,
    visaType: fields.visaType.value,
    fields,
    method,
    warnings: unique(warnings),
    needsPageRender,
  };
}

export function isExtractionUseful(result: VisaExtractionResult) {
  const labeledOk = (Object.values(result.fields) as FieldResult[]).filter((f) => f.labeled && f.value).length;
  return labeledOk >= 2;
}

export function isExtractionComplete(result: VisaExtractionResult) {
  const keys: VisaFieldKey[] = ["fullName", "passportNumber", "nationality", "visaType"];
  return keys.every((key) => Boolean(result.fields[key].value));
}

export function mergeExtractions(primary: VisaExtractionResult, fallback: VisaExtractionResult): VisaExtractionResult {
  const keys: VisaFieldKey[] = ["fullName", "passportNumber", "nationality", "visaType"];
  const fields = { ...primary.fields };
  for (const key of keys) {
    const current = fields[key];
    const next = fallback.fields[key];
    if ((!current.value || current.status === "missing") && next.value) {
      fields[key] = next;
    } else if (current.status !== "ok" && next.status === "ok") {
      fields[key] = next;
    }
  }
  const method: ExtractionMethod = isExtractionUseful(primary)
    ? primary.method === fallback.method
      ? primary.method
      : "hybrid"
    : fallback.method;
  return {
    fullName: fields.fullName.value,
    passportNumber: fields.passportNumber.value,
    nationality: fields.nationality.value,
    visaType: fields.visaType.value,
    fields,
    method,
    warnings: unique([...primary.warnings, ...fallback.warnings]),
    needsPageRender: false,
  };
}

function extractLabeledValues(lines: string[]) {
  const found: Partial<Record<VisaFieldKey, { value: string; labeled: true }>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hits = findLabels(line);
    if (!hits.length) continue;
    for (let h = 0; h < hits.length; h++) {
      const hit = hits[h];
      if (hit.field === "other") continue;
      if (found[hit.field]?.value) continue;
      const until = nextDifferentFieldStart(hits, h);
      let value = cleanCapturedValue(line.slice(hit.end, until), hit.field);
      if (!value) {
        const nextLine = lines[i + 1];
        if (nextLine && !lineStartsWithOtherField(nextLine, hit.field)) {
          const nextHits = findLabels(nextLine);
          const nextUntil = nextDifferentFieldStart(nextHits, -1, hit.field);
          value = cleanCapturedValue(nextLine.slice(0, nextUntil), hit.field);
        }
      }
      if (value) found[hit.field] = { value, labeled: true };
    }
  }
  return found;
}

function extractSpatialValues(lines: LayoutToken[][]) {
  const found: Partial<Record<VisaFieldKey, { value: string; labeled: true }>> = {};
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const spans = findTokenSpans(line);
    if (!spans.length) continue;
    for (let s = 0; s < spans.length; s++) {
      const span = spans[s];
      if (span.field === "other") continue;
      if (found[span.field]?.value) continue;
      const untilX = nextDifferentSpanX(spans, s);
      const valueTokens = line.filter((token, index) => {
        if (index < span.endIndex) return false;
        if (token.x >= untilX) return false;
        return !tokenBelongsToSpan(index, spans);
      });
      let value = cleanCapturedValue(joinTokens(valueTokens), span.field);
      if (!value) {
        const nextLine = lines[lineIndex + 1];
        if (nextLine && !tokenLineStartsWithOtherField(nextLine, span.field)) {
          const nextSpans = findTokenSpans(nextLine);
          const nextUntil = nextDifferentSpanX(nextSpans, -1, span.field);
          const nextTokens = nextLine.filter((token, index) => token.x < nextUntil && !tokenBelongsToSpan(index, nextSpans));
          value = cleanCapturedValue(joinTokens(nextTokens), span.field);
        }
      }
      if (value) found[span.field] = { value, labeled: true };
    }
  }
  return found;
}

function mergeValues(
  a: Partial<Record<VisaFieldKey, { value: string; labeled: true }>>,
  b: Partial<Record<VisaFieldKey, { value: string; labeled: true }>>
) {
  const keys: VisaFieldKey[] = ["fullName", "passportNumber", "nationality", "visaType"];
  const out: Partial<Record<VisaFieldKey, { value: string; labeled: true }>> = {};
  for (const key of keys) {
    out[key] = a[key] || b[key];
  }
  return out;
}

function finalizeName(hit: { value: string; labeled: true } | undefined, fromOcr: boolean): FieldResult {
  if (!hit?.value) return missing("Could not find a Name field.");
  let value = preferEnglishValue(hit.value);
  value = value.replace(/[|:;]+$/g, "").trim();
  if (!value) return missing("The Name field was empty.");
  if (isBlockedName(value)) {
    return {
      value: "",
      status: "missing",
      labeled: true,
      warning: "Ignored a heading or authority name. The passenger Name field was not found.",
    };
  }
  if (!hasEnoughNameLetters(value)) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "The Name value did not look like a complete personal name.",
    };
  }
  return fieldResult(value, hit.labeled, fromOcr, "Verify the full name against the document.");
}

function finalizePassport(hit: { value: string; labeled: true } | undefined, fromOcr: boolean): FieldResult {
  if (!hit?.value) return missing("Could not find a Passport No. field.");
  const candidates = passportCandidates(hit.value);
  if (candidates.length === 0) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "A Passport No. label was found, but the value was not a usable document number.",
    };
  }
  if (candidates.length > 1) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "More than one possible passport number was found. Confirm Passport No. from the document.",
    };
  }
  const normalized = candidates[0];
  const ambiguous = fromOcr && AMBIGUOUS_PASSPORT.test(normalized);
  const status: FieldStatus = ambiguous || fromOcr ? "needs_review" : "ok";
  return {
    value: normalized,
    status,
    labeled: true,
    warning: ambiguous
      ? "Passport number contains characters that OCR can confuse (O/0 or I/1). Confirm it from the document."
      : fromOcr
        ? "Passport number came from OCR. Confirm it from the document."
        : undefined,
  };
}

function finalizeNationality(hit: { value: string; labeled: true } | undefined, fromOcr: boolean): FieldResult {
  if (!hit?.value) return missing("Could not find a Nationality field.");
  const english = preferEnglishValue(hit.value);
  const arabic = collapseSpaces((hit.value.match(arabicRuns()) || []).join(" "));
  const value = hasLatinLetter(english) ? english : ARABIC_NATIONALITY[arabic] || ARABIC_NATIONALITY[collapseSpaces(hit.value)] || "";
  if (looksLikeDate(value) || looksLikeId(value)) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "The Nationality value did not look like a country or nationality.",
    };
  }
  if (value.length < 3 || value.length > 40) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "The Nationality value was too short or too long to use automatically.",
    };
  }
  if (ARABIC_SCRIPT.test(value)) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "Nationality still contains Arabic text. Enter the English nationality used on the passenger form.",
    };
  }
  return fieldResult(value, true, fromOcr, "Verify nationality against the document.");
}

function finalizeVisaType(hit: { value: string; labeled: true } | undefined, fromOcr: boolean): FieldResult {
  if (!hit?.value) return missing("Could not find a Type Of Visa field.");
  let value = preferEnglishValue(hit.value);
  if (!hasLatinLetter(value)) {
    const arabic = collapseSpaces((hit.value.match(arabicRuns()) || []).join(" "));
    if (ARABIC_VISA_TYPE[arabic]) value = ARABIC_VISA_TYPE[arabic];
  }
  // Strip entry type and other trailing text
  value = stripEntryTypeTail(value);
  // Also strip common trailing text that's not part of visa type
  value = value
    .replace(/\b(operator|agency|company|service|travel|tourism)\b.*$/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
  if (ENTRY_TYPE_VALUES.has(value.toLowerCase())) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "The value next to Type Of Visa looks like an Entry Type. It was left blank for review.",
    };
  }
  if (value.length < 3) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "The visa type value was incomplete.",
    };
  }
  if (ARABIC_SCRIPT.test(value)) {
    return {
      value: "",
      status: "needs_review",
      labeled: true,
      warning: "Visa type still contains extra Arabic text. Confirm the English visa type from the document.",
    };
  }
  return fieldResult(value, true, fromOcr, "Verify visa type against the document.");
}

function fieldResult(value: string, labeled: boolean, fromOcr: boolean, reviewMessage: string): FieldResult {
  if (!labeled) {
    return { value: "", status: "missing", labeled: false, warning: reviewMessage };
  }
  if (fromOcr) {
    return { value, status: "needs_review", labeled, warning: reviewMessage };
  }
  return { value, status: "ok", labeled };
}

function missing(warning: string): FieldResult {
  return { value: "", status: "missing", labeled: false, warning };
}

function missingMessage(key: VisaFieldKey) {
  switch (key) {
    case "fullName":
      return "Full name was not extracted.";
    case "passportNumber":
      return "Passport number was not extracted.";
    case "nationality":
      return "Nationality was not extracted.";
    default:
      return "Visa type was not extracted.";
  }
}

function findLabels(line: string): LabelHit[] {
  const hits: LabelHit[] = [];
  const definitions = [
    ...TARGET_LABELS.map((def) => ({ field: def.field as VisaFieldKey | "other", patterns: def.patterns })),
    ...STOP_LABELS.map((def) => ({ field: "other" as const, patterns: def.patterns })),
  ];

  for (const def of definitions) {
    for (const pattern of def.patterns) {
      const source = pattern.source.replace(/^\^/, "").replace(/\$$/, "");
      const regex = new RegExp(`(^|[^\\p{L}\\p{N}])(${source})(?=$|[^\\p{L}\\p{N}])\\s*[:.\\-]?`, "giu");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const prefixLen = match[1].length;
        const start = match.index + prefixLen;
        const matched = match[0].slice(prefixLen);
        hits.push({ field: def.field, start, end: start + matched.length, raw: match[2] });
      }
    }
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const filtered: LabelHit[] = [];
  for (const hit of hits) {
    const covered = filtered.some((existing) => hit.start < existing.end && hit.end > existing.start);
    if (!covered) filtered.push(hit);
  }
  return filtered;
}

function findTokenSpans(line: LayoutToken[]): TokenSpan[] {
  const hits: TokenSpan[] = [];
  for (let i = 0; i < line.length; i++) {
    for (let len = 4; len >= 1; len--) {
      const group = line.slice(i, i + len);
      if (group.length !== len) continue;
      const phrase = normalizeLabel(joinTokens(group));
      const field = matchTargetLabel(phrase) || (matchStopLabel(phrase) ? "other" : null);
      if (!field) continue;
      const last = group[group.length - 1];
      hits.push({
        field,
        startIndex: i,
        endIndex: i + len,
        xStart: group[0].x,
        xEnd: last.x + last.width,
      });
    }
  }
  hits.sort((a, b) => a.xStart - b.xStart || b.endIndex - b.startIndex - (a.endIndex - a.startIndex));
  const filtered: TokenSpan[] = [];
  for (const hit of hits) {
    const covered = filtered.some(
      (existing) => hit.startIndex < existing.endIndex && hit.endIndex > existing.startIndex
    );
    if (!covered) filtered.push(hit);
  }
  return filtered.sort((a, b) => a.xStart - b.xStart);
}

function matchTargetLabel(normalized: string): VisaFieldKey | null {
  for (const def of TARGET_LABELS) {
    if (def.patterns.some((p) => p.test(normalized))) return def.field;
  }
  return null;
}

function matchStopLabel(normalized: string) {
  return STOP_LABELS.some((def) => def.patterns.some((p) => p.test(normalized)));
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[.:#]/g, " ")
    .replace(/[_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCapturedValue(value: string, field: VisaFieldKey) {
  let cleaned = stripKnownLabels(value);
  cleaned = preferEnglishValue(cleaned);
  if (field === "visaType") cleaned = stripEntryTypeTail(cleaned);
  return cleaned;
}

function stripKnownLabels(value: string) {
  const hits = findLabels(value);
  if (!hits.length) return collapseSpaces(value.replace(/[-–—|:]+/g, " "));
  let remaining = value;
  for (const hit of [...hits].sort((a, b) => b.start - a.start)) {
    remaining = remaining.slice(0, hit.start) + " " + remaining.slice(hit.end);
  }
  return collapseSpaces(remaining.replace(/[-–—|:]+/g, " "));
}

function preferEnglishValue(value: string) {
  const withoutArabic = value.replace(arabicRuns(), " ");
  const latin = collapseSpaces(withoutArabic.replace(/[-–—|:]+/g, " "));
  if (hasLatinLetter(latin) || /\d/.test(latin)) return latin;
  return collapseSpaces(value);
}

function stripEntryTypeTail(value: string) {
  return collapseSpaces(
    value
      .replace(/\b(entry\s*type|type\s*of\s*entry|single\s*entry|multiple\s*entry|double\s*entry)\b.*$/i, "")
      .replace(/\s+\b(single|multiple|double)\b$/i, "")
  );
}

function nextDifferentFieldStart(hits: LabelHit[], currentIndex: number, currentField?: VisaFieldKey | "other") {
  const field = currentField || hits[currentIndex]?.field;
  for (let i = currentIndex + 1; i < hits.length; i++) {
    if (hits[i].field !== field) return hits[i].start;
  }
  return Number.POSITIVE_INFINITY;
}

function nextDifferentSpanX(spans: TokenSpan[], currentIndex: number, currentField?: VisaFieldKey | "other") {
  const field = currentField || spans[currentIndex]?.field;
  for (let i = currentIndex + 1; i < spans.length; i++) {
    if (spans[i].field !== field) return spans[i].xStart;
  }
  return Number.POSITIVE_INFINITY;
}

function lineStartsWithOtherField(line: string, field: VisaFieldKey) {
  return findLabels(line).some((hit) => hit.start <= 1 && hit.field !== field);
}

function tokenLineStartsWithOtherField(line: LayoutToken[], field: VisaFieldKey) {
  const spans = findTokenSpans(line);
  const first = spans[0];
  return Boolean(first && first.startIndex === 0 && first.field !== field);
}

function tokenBelongsToSpan(index: number, spans: TokenSpan[]) {
  return spans.some((span) => index >= span.startIndex && index < span.endIndex);
}

function splitLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => collapseSpaces(line))
    .filter(Boolean);
}

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clusterLines(tokens: LayoutToken[]) {
  const sorted = [...tokens].filter((t) => t.text.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: LayoutToken[][] = [];
  for (const token of sorted) {
    const last = lines[lines.length - 1];
    const baseline = last?.[0];
    const threshold = Math.max(token.height || 8, baseline?.height || 8) * 0.6;
    if (last && baseline && Math.abs(token.y - baseline.y) <= threshold) {
      last.push(token);
    } else {
      lines.push([token]);
    }
  }
  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

function joinTokens(tokens: LayoutToken[]) {
  return collapseSpaces(tokens.map((t) => t.text).join(" "));
}

function isBlockedName(value: string) {
  const lower = value.toLowerCase();
  return NAME_BLOCKLIST.some((item) => lower === item || lower.includes(item));
}

function hasEnoughNameLetters(value: string) {
  const letters = value.replace(/[^\p{L}]/gu, "");
  return letters.length >= 3;
}

function hasLatinLetter(value: string) {
  return /[A-Za-z]/.test(value);
}

function arabicRuns() {
  return new RegExp(ARABIC_RUN_SOURCE, "g");
}

function looksLikeDate(value: string) {
  return /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function looksLikeId(value: string) {
  const compact = value.replace(/\s/g, "");
  return /^[A-Z0-9]{6,}$/i.test(compact) && /\d/.test(compact);
}

function passportCandidates(value: string) {
  const english = preferEnglishValue(value);
  return english
    .toUpperCase()
    .split(/[^A-Z0-9-]+/)
    .filter((token) => {
      // More flexible passport pattern: 6-16 chars, at least 1 letter and 1 digit
      const clean = token.replace(/-/g, "");
      return clean.length >= 6 && clean.length <= 16 && /[A-Z]/.test(clean) && /\d/.test(clean);
    });
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

export function emptyParse(method: ExtractionMethod, warnings: string[]) {
  return emptyExtraction(method, warnings);
}
