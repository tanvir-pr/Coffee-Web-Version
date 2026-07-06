import path from "node:path";
import type { NextConfig } from "next";

const dockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(dockerBuild
    ? {
        output: "standalone" as const,
        outputFileTracingRoot: path.join(process.cwd(), "../.."),
      }
    : {}),
};

export default nextConfig;
