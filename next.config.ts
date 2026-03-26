import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "./tsconfig.app.json",
  },
  turbopack: {
    rules: {
      "./src/{app,components,lib}/**/*.{js,jsx,ts,tsx}": {
        loaders: [
          {
            loader: path.resolve(
              import.meta.dirname,
              "lingui-macro-loader.cjs",
            ),
            options: {},
          },
        ],
      },
    },
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/trpc/:path*",
        destination: "http://localhost:8787/trpc/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:8787/api/:path*",
      },
    ];
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  telemetry: false,
});
