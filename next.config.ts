import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit", "pdfjs-dist"],
  transpilePackages: ["react-pdf"],
  outputFileTracingIncludes: {
    "/api/extract-visa": [
      "./node_modules/pdfjs-dist/package.json",
      "./node_modules/pdfjs-dist/legacy/build/**",
      "./node_modules/pdfjs-dist/build/pdf.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
    ],
  },
  experimental: {
    proxyClientMaxBodySize: "40mb",
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
