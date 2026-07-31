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
import { createApiKeyCreateRequestPolicy } from "./lib/api-key-create";
import type { Logger } from "./lib/logger";
import { isUserFrozen } from "./lib/user-status";

const createBetterAuthLogger = (logger: Logger | undefined) =>
  logger === undefined
    ? undefined
    : {
        disableColors: true,
        level: "info" as const,
        log: (
          level: "debug" | "info" | "warn" | "error",
          message: string,
          details?: unknown,
        ) => {
          logger[level](
            message,
            details === undefined ? undefined : { betterAuthDetails: details },
          );
        },
      };

export const createAuth = ({
  env,
  logger,
}: {
  readonly env: Env;
  readonly logger?: Logger;
}) => {
  const apiKeyCreatePolicy = createApiKeyCreateRequestPolicy();

  return betterAuth({
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
      additionalFields: {
        role: {
          type: "string",
          required: true,
          input: false,
          defaultValue: "user",
        },
        frozen: {
          type: "boolean",
          required: true,
          input: false,
          defaultValue: false,
        },
      },
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
        afterDelete: async (user) => {
          await env.DB.prepare(`DELETE FROM "apikey" WHERE referenceId = ?`)
            .bind(user.id)
            .run();
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const frozen = await isUserFrozen({
              db: env.DB,
              userId: session.userId,
            });
            return frozen ? false : undefined;
          },
        },
      },
    },
    hooks: {
      before: apiKeyCreatePolicy.before,
    },
    logger: createBetterAuthLogger(logger),
    plugins: [
      apiKey({
        permissions: {
          defaultPermissions: (_referenceId, ctx) =>
            apiKeyCreatePolicy.getPermissions(ctx.request),
        },
      }),
    ],
    trustedOrigins: env.TRUSTED_ORIGINS.split(","),
  });
};

export type Auth = ReturnType<typeof createAuth>;
