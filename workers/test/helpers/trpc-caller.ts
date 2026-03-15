import { initTRPC } from "@trpc/server";
import { appRouter } from "../../src/trpc/router";
import type { TRPCContext } from "../../src/trpc/index";

type CreateTestCallerParams = {
  readonly db: D1Database;
};

export const createTestCaller = ({ db }: CreateTestCallerParams) => {
  const t = initTRPC.context<TRPCContext>().create();
  const createCaller = t.createCallerFactory(appRouter);

  const ctx: TRPCContext = {
    env: {
      DB: db,
      BUCKET: {} as TRPCContext["env"]["BUCKET"],
      KV: {} as TRPCContext["env"]["KV"],
      QUEUE: {} as TRPCContext["env"]["QUEUE"],
      R2_PUBLIC_URL: "https://test.example.com",
      BETTER_AUTH_SECRET: "test-secret",
      TWITTER_CLIENT_ID: "",
      TWITTER_CLIENT_SECRET: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      TRUSTED_ORIGINS: "http://localhost:3000",
      ALLOWED_ORIGINS: "http://localhost:3000",
    },
    honoContext: {} as TRPCContext["honoContext"],
    auth: {} as TRPCContext["auth"],
  };

  return createCaller(ctx);
};
