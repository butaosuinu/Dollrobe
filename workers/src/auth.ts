import { betterAuth } from "better-auth";
import { apiKey } from "@better-auth/api-key";
import { eq } from "drizzle-orm";
import type { Env } from "./types";
import { createDrizzle } from "./db/client";
import {
  coordinates,
  digests,
  dolls,
  garments,
  storageCases,
  storageLocations,
} from "./db/schema";

export const createAuth = ({ env }: { readonly env: Env }) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
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
    user: {
      changeEmail: { enabled: true },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const drizzleDb = createDrizzle(env.DB);
          await Promise.all([
            drizzleDb.delete(garments).where(eq(garments.userId, user.id)),
            drizzleDb
              .delete(storageLocations)
              .where(eq(storageLocations.userId, user.id)),
            drizzleDb
              .delete(storageCases)
              .where(eq(storageCases.userId, user.id)),
            drizzleDb
              .delete(coordinates)
              .where(eq(coordinates.userId, user.id)),
            drizzleDb.delete(dolls).where(eq(dolls.userId, user.id)),
            drizzleDb.delete(digests).where(eq(digests.userId, user.id)),
          ]);
        },
      },
    },
    plugins: [apiKey()],
    trustedOrigins: env.TRUSTED_ORIGINS.split(","),
  });

export type Auth = ReturnType<typeof createAuth>;
