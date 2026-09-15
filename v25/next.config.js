/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "pdf-parse"],
  },
  poweredByHeader: false,
};

module.exports = nextConfig;
