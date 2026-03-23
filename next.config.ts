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
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  telemetry: false,
});
