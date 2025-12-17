/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use BOTH naming conventions to be safe across Next.js versions
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;