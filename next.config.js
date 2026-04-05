const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // Silence prerender errors for pages that require runtime env vars
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = withPWA(nextConfig);
