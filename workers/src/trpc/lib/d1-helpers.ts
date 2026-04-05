import { TRPCError } from "@trpc/server";
import type { Logger } from "../../lib/logger";

export const TEMP_USER_ID = "temp-user-001";

export const wrapDbError =
  ({
    context,
    logger,
  }: {
    readonly context: string;
    readonly logger: Logger;
  }) =>
  (err: unknown): never => {
    const message = err instanceof Error ? err.message : `Failed to ${context}`;
    const stack = err instanceof Error ? err.stack : undefined;

    logger.error("database error", {
      context,
      errorMessage: message,
      stack,
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
      cause: err,
    });
  };
