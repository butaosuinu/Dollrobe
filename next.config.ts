import type { NextConfig } from "next";
import path from "node:path";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "./tsconfig.app.json",
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.[jt]sx?$/,
      exclude: /node_modules/,
      use: [
        {
          loader: path.resolve(import.meta.dirname, "lingui-macro-loader.cjs"),
        },
      ],
    });
    return config;
  },
};

export default withSerwist(nextConfig);
