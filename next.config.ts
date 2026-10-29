import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit", "pdfjs-dist", "tesseract.js"],
  transpilePackages: ["react-pdf"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./assets/**",
      "./template.pdf",
      "./public/templates/**",
    ],
    "/api/extract-visa": [
      "./node_modules/pdfjs-dist/package.json",
      "./node_modules/pdfjs-dist/legacy/build/**",
      "./node_modules/pdfjs-dist/build/pdf.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
    ],
  },
  experimental: {
    proxyClientMaxBodySize: "40mb",
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
