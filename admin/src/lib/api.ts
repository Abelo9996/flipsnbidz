// Helper to build API URLs that work regardless of basePath proxy setup
// When running behind Express proxy at /admin, browser fetches need the full path
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/admin";

export function apiUrl(path: string): string {
  // path should start with /api/...
  return `${BASE}${path}`;
}
