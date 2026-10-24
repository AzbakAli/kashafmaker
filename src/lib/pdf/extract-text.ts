import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (typeof Promise.withResolvers === "undefined") {
  (Promise as PromiseConstructor & {
    withResolvers: <T>() => {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: Record<string, unknown>) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  }>;
};

function resolveFromCwd(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

function findPdfJsFiles() {
  const requireFromApp = createRequire(pathToFileURL(resolveFromCwd("package.json")).href);
  try {
    const pdfPath = requireFromApp.resolve("pdfjs-dist/legacy/build/pdf.mjs");
    const workerPath = requireFromApp.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    return { pdfPath, workerPath };
  } catch {
    // Fall through to explicit paths used on Netlify / local installs.
  }

  const candidates = [
    "node_modules/pdfjs-dist/legacy/build/pdf.mjs",
    "node_modules/pdfjs-dist/build/pdf.mjs",
  ];

  for (const rel of candidates) {
    const pdfPath = resolveFromCwd(rel);
    if (!existsSync(pdfPath)) continue;
    const dir = path.dirname(pdfPath);
    const workerPath = ["pdf.worker.mjs", "pdf.worker.min.mjs"]
      .map((name) => path.join(dir, name))
      .find((file) => existsSync(file));
    if (workerPath) return { pdfPath, workerPath };
  }

  throw new Error("pdfjs-dist worker files were not found on the server");
}

async function loadPdfJs(): Promise<PdfJsModule> {
  const { pdfPath, workerPath } = findPdfJsFiles();
  const pdfjs = (await import(
    /* webpackIgnore: true */ pathToFileURL(pdfPath).href
  )) as PdfJsModule;
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjs;
}

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    useWorkerFetch: false,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    pages.push(
      textContent.items.map((item) => ("str" in item ? item.str ?? "" : "")).join(" ")
    );
  }
  return pages.join("\n");
}
