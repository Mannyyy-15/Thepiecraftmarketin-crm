/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  // Uncomment for Capacitor static export (disables server features):
  // output: process.env.CAP_BUILD === '1' ? 'export' : undefined,
  // images: { unoptimized: true },
  async headers() {
    const developmentEval =
      process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${developmentEval}; connect-src 'self' https: wss:;`,
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(self), payment=(self), usb=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
