import { betterAuth } from "better-auth";
import { apiKey } from "@better-auth/api-key";
import type { Env } from "./types";

export const createAuth = ({ env }: { readonly env: Env }) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    socialProviders: {
      twitter: {
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [apiKey()],
    trustedOrigins: env.TRUSTED_ORIGINS.split(","),
  });

export type Auth = ReturnType<typeof createAuth>;
