import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium and puppeteer-core are already in Next.js 16's
  // built-in serverExternalPackages allowlist, no manual config needed
};

export default nextConfig;
