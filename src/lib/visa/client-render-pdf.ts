export async function renderPdfPagesToBlobs(file: File, maxPages = 2): Promise<Blob[]> {
  const pdfjs = await import("pdfjs-dist");

  // Fallback to in-thread parsing if worker is not readily accessible
  try {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }
  } catch {
    // Ignore worker assignment error
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const blobs: Blob[] = [];
  const count = Math.min(pdf.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= count; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    // 2.5 scale produces ~200-300 DPI for standard A4, optimal for OCR
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not prepare the PDF page for OCR.");

    // Fill pure white background so transparent PDF areas do not become black
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not render the PDF page."));
      }, "image/png");
    });
    blobs.push(blob);
  }

  return blobs;
}
