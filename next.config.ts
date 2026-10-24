import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
  transpilePackages: ["react-pdf", "pdfjs-dist"],
  experimental: {
    proxyClientMaxBodySize: "40mb",
  },
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
};

export default nextConfig;
