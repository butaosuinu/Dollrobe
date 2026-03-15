import { TRPCError } from "@trpc/server";
import { createLogger } from "../../lib/logger";

export const TEMP_USER_ID = "temp-user-001";

const dbErrorLogger = createLogger({ minLevel: "error" });

export const wrapDbError =
  (context: string) =>
  (err: unknown): never => {
    const message = err instanceof Error ? err.message : `Failed to ${context}`;
    const stack = err instanceof Error ? err.stack : undefined;

    dbErrorLogger.error("database error", {
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

const ASCII_UPPER_A = 65;
const MAX_LABEL_ROWS = 26;

export const generateLabel = ({
  row,
  col,
}: {
  readonly row: number;
  readonly col: number;
}): string => {
  if (row >= MAX_LABEL_ROWS) {
    throw new Error(`row must be less than ${MAX_LABEL_ROWS}, got ${row}`);
  }
  return `${String.fromCharCode(ASCII_UPPER_A + row)}-${col + 1}`;
};
