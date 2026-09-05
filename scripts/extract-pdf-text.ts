import fs from "fs";
import path from "path";

async function extract(pdfPath: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, ignoreErrors: true }).promise;
  console.log("\n===", path.basename(pdfPath), "pages", doc.numPages, "===");
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    console.log("page", i, "viewport", viewport.width, viewport.height);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const tx = item.transform;
      console.log(
        JSON.stringify({
          t: item.str,
          x: Math.round(tx[4]),
          y: Math.round(viewport.height - tx[5]),
          w: Math.round(item.width),
        })
      );
    }
  }
}

async function main() {
  await extract("C:/Users/hp/Documents/NBIS Kashaf Sample With Stamp (1).pdf");
  await extract("C:/Users/hp/Downloads/Kashaf_6_Medinah.pdf");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
