/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;