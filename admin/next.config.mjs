/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/admin",
  // Expose the auth base path expected by next-auth's client helpers.
  // With a custom Next.js basePath, this must resolve to /admin/api/auth.
  env: {
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL || "http://localhost:3003/admin/api/auth",
  },
};

export default nextConfig;
