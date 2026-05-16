import type { NextConfig } from "next";

function buildSupabaseImageHostnames(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!raw.trim()) return [];
  try {
    const u = new URL(raw);
    return u.hostname ? [u.hostname] : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  experimental: {
    externalDir: true,
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: buildSupabaseImageHostnames().map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    })),
  },
};

export default nextConfig;
