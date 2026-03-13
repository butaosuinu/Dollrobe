import { betterAuth } from "better-auth";
import type { Env } from "./types";

export const createAuth = ({ env }: { readonly env: Env }) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
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
    trustedOrigins: env.TRUSTED_ORIGINS.split(","),
  });

export type Auth = ReturnType<typeof createAuth>;
