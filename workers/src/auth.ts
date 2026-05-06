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
    // 退会・メール変更でセッションの freshAge 制約を無効化
    // (UI 側でメール再入力 / 現在のパスワード入力で本人性を担保)
    session: {
      freshAge: 0,
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
      changeEmail: {
        enabled: true,
        // emailVerified が false のユーザー (今回はメール検証を要求しないため
        // 全員が該当) は即時メール更新を許可。verification 基盤を後から
        // 追加する場合は sendChangeEmailConfirmation 等を併設する。
        updateEmailWithoutVerification: true,
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          // FK: garments.location_id → storage_locations.id, storage_locations.case_id → storage_cases.id
          // 子→親の順で batch 実行し、D1 の FK 制約違反を避ける
          const drizzleDb = createDrizzle(env.DB);
          await drizzleDb.batch([
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
