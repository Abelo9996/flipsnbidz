/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/admin",
  // Ensure auth callbacks and assets all route through /admin
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3003/admin",
  },
};

export default nextConfig;
