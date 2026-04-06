import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse@1 runs a dev-only block when bundled (see index.js); keep it external on the server.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
