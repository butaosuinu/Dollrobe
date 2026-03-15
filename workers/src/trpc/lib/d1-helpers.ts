import { TRPCError } from "@trpc/server";

export const TEMP_USER_ID = "temp-user-001";

export const wrapDbError =
  (context: string) =>
  (err: unknown): never => {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err instanceof Error ? err.message : `Failed to ${context}`,
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
