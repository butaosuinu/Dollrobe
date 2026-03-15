import type { NextConfig } from "next";
import path from "node:path";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "./tsconfig.app.json",
  },
  turbopack: {
    rules: {
      "*.{js,jsx,ts,tsx}": {
        loaders: [
          {
            loader: path.resolve(
              import.meta.dirname,
              "lingui-macro-loader.cjs",
            ),
            options: {},
          },
        ],
        as: "*.{js,jsx,ts,tsx}",
      },
    },
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
