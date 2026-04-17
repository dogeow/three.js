/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow symlinks in public/ (demos -> ../..) to resolve to legacy demo folders.
  experimental: {
    // noop; Next.js follows symlinks by default for public assets.
  },
};

export default nextConfig;
