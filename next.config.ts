import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "./tsconfig.app.json",
  },
};

export default withSerwist(nextConfig);
