import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/unstable-core-do-not-import";

type ServiceErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST";

export type ServiceError = {
  readonly code: ServiceErrorCode;
  readonly message: string;
};

export type ServiceResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ServiceError };

export const serviceOk = <T>(data: T): ServiceResult<T> => ({
  ok: true,
  data,
});

export const serviceError = (
  code: ServiceErrorCode,
  message: string,
): ServiceResult<never> => ({
  ok: false,
  error: { code, message },
});

const SERVICE_TO_TRPC_CODE = Object.freeze({
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const satisfies Record<ServiceErrorCode, TRPC_ERROR_CODE_KEY>);

export const throwIfError = <T>(result: ServiceResult<T>): T => {
  if (result.ok) {
    return result.data;
  }
  throw new TRPCError({
    code: SERVICE_TO_TRPC_CODE[result.error.code],
    message: result.error.message,
  });
};
