import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

const OPS: Record<number, string> = {
  12: "transform",
  13: "moveTo",
  14: "lineTo",
  19: "rectangle",
  20: "stroke",
  22: "fill",
  66: "paintXObject",
  74: "paintFormXObjectBegin",
  85: "paintImageXObject",
  91: "constructPath",
};

async function dump() {
  const pdfPath = process.argv[2] || path.join(process.cwd(), "assets", "nbis-kashaf.pdf");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const lines: string[] = [`pages ${doc.numPages}`];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    lines.push(`\n===== PAGE ${i} ${viewport.width} x ${viewport.height} =====`);

    const text = await page.getTextContent();
    for (const item of text.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const [, , , , e, f] = item.transform as number[];
      const top = viewport.height - f;
      lines.push(
        `TEXT pdfY=${f.toFixed(1)} top=${top.toFixed(1)} x=${e.toFixed(1)} w=${Number(item.width).toFixed(1)} ${JSON.stringify(item.str)}`
      );
    }

    const ops = await page.getOperatorList();
    const fnCounts: Record<string, number> = {};
    for (let n = 0; n < ops.fnArray.length; n++) {
      const fn = ops.fnArray[n] as number;
      const name = OPS[fn] || String(fn);
      fnCounts[name] = (fnCounts[name] || 0) + 1;
      const args = ops.argsArray[n];

      if (fn === 19 && Array.isArray(args)) {
        const [x, y, w, h] = args as number[];
        if (Math.abs(w) > 6 && Math.abs(h) > 4) {
          const top = viewport.height - y - h;
          lines.push(
            `RECT x=${x.toFixed(1)} pdfY=${y.toFixed(1)} top=${top.toFixed(1)} w=${w.toFixed(1)} h=${h.toFixed(1)}`
          );
        }
      }

      if (fn === 91) {
        const raw = JSON.stringify(args)?.slice(0, 400);
        if (raw && raw.includes("[") && (raw.includes("19") || raw.toLowerCase().includes("rect") || /\d{2,3}/.test(raw))) {
          lines.push(`PATH ${raw}`);
        }
      }

      if (fn === 85 || fn === 66 || fn === 74) {
        lines.push(`IMG/XOBJ ${name} ${JSON.stringify(args)?.slice(0, 200)}`);
      }
    }
    lines.push(`FN ${JSON.stringify(fnCounts)}`);
  }

  const out = path.join(process.cwd(), "scripts", "pdf-ops-dump.txt");
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log("wrote", out, "lines", lines.length);
}

dump().catch((e) => {
  console.error(e);
  process.exit(1);
});
