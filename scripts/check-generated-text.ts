import fs from "fs";
import path from "path";

async function main() {
  const dir = path.join(process.cwd(), "uploads", "documents");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".pdf"));
  const newest = files
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  const pdfPath = path.join(dir, newest.f);
  console.log("checking", newest.f, fs.statSync(pdfPath).size);

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)) }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ("str" in item && item.str.trim()) texts.push(item.str);
    }
  }
  const blob = texts.join(" | ");
  const needles = ["Rehmat", "SXA-7266", "Mansoor", "CE1159477", "Riyadh", "Makkah", "Hyundai"];
  for (const n of needles) {
    console.log(n, blob.includes(n) ? "FOUND" : "MISSING");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
