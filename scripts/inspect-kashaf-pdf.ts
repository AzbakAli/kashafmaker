import fs from "fs";
import { PDFDocument } from "pdf-lib";

const p = "C:/Users/hp/Documents/NBIS Kashaf Sample With Stamp (1).pdf";
const bytes = fs.readFileSync(p);
console.log("size", bytes.length, "header", bytes.subarray(0, 8).toString());

async function tryLoad(label: string, opts?: Parameters<typeof PDFDocument.load>[1]) {
  try {
    const doc = await PDFDocument.load(bytes, opts);
    console.log(label, "ok pages", doc.getPageCount());
    doc.getPages().forEach((pg, i) => {
      const { width, height } = pg.getSize();
      console.log("page", i + 1, width, height);
    });
  } catch (e) {
    console.log(label, "fail", e instanceof Error ? e.message : e);
  }
}

async function main() {
  await tryLoad("default");
  await tryLoad("ignoreEncryption", { ignoreEncryption: true });
}

main();
